-- BankOps RDS PostgreSQL schema
-- Run this against the RDS instance after the SAM template is deployed.
-- This schema replaces Supabase RLS with explicit ownership and role-based
-- query filters. Row-level security is enforced in the application layer
-- using the authenticated Cognito user ID and role.

-- Drop existing objects if re-running during development.
DROP TABLE IF EXISTS public.ai_call_logs CASCADE;
DROP TABLE IF EXISTS public.audit_events CASCADE;
DROP TABLE IF EXISTS public.tokens CASCADE;
DROP TABLE IF EXISTS public.client_assignments CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.classification_tag CASCADE;

-- Enums
CREATE TYPE public.app_role AS ENUM ('support', 'ops', 'compliance', 'manager', 'admin');
CREATE TYPE public.classification_tag AS ENUM ('support', 'ops', 'compliance');

-- Users table mirrors the Cognito user identity.
-- The application must keep this in sync with Cognito registrations.
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL UNIQUE,
    display_name text,
    username text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Roles are stored separately from profiles (never add a role column to profiles).
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Security definer helper: check if a user has a role.
-- Replicates the Supabase has_role() function.
CREATE OR REPLACE FUNCTION public.has_role(_user_id text, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    );
$$;

REVOKE ALL ON FUNCTION public.has_role(text, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(text, public.app_role) TO authenticated;

-- Clients
CREATE TABLE public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Client assignments (which users can see which clients)
CREATE TABLE public.client_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, client_id)
);

-- Security definer helper: check if a user is assigned to a client.
CREATE OR REPLACE FUNCTION public.user_assigned_to_client(_user_id text, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.client_assignments
        WHERE user_id = _user_id AND client_id = _client_id
    );
$$;

REVOKE ALL ON FUNCTION public.user_assigned_to_client(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_assigned_to_client(text, uuid) TO authenticated;

-- Documents
-- owner_id maps to Cognito user_id (sub).
-- client_id is optional for unclassified documents.
CREATE TABLE public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cid text NOT NULL UNIQUE,
    filename text NOT NULL,
    classification public.classification_tag NOT NULL,
    content_type text NOT NULL DEFAULT 'application/octet-stream',
    size_bytes bigint NOT NULL DEFAULT 0,
    storage_path text NOT NULL,
    owner_id text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Security definer helper: can a user view a document based on classification and client assignment?
-- This replaces the Supabase RLS policy logic.
CREATE OR REPLACE FUNCTION public.user_can_view_doc(
    _classification public.classification_tag,
    _client_id uuid,
    _user_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        -- Admins and managers see everything
        public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'manager')
        OR (
            -- Support sees only support documents
            _classification = 'support' AND public.has_role(_user_id, 'support')
        )
        OR (
            -- Ops sees ops and public support documents
            _classification IN ('ops', 'support') AND public.has_role(_user_id, 'ops')
        )
        OR (
            -- Compliance sees compliance and ops documents
            _classification IN ('compliance', 'ops') AND public.has_role(_user_id, 'compliance')
        )
        OR (
            -- If client-scoped, the user must be assigned to that client
            _client_id IS NOT NULL AND public.user_assigned_to_client(_user_id, _client_id)
        );
$$;

REVOKE ALL ON FUNCTION public.user_can_view_doc(public.classification_tag, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_view_doc(public.classification_tag, uuid, text) TO authenticated;

-- Audit events with tamper-evident hash chain
CREATE TABLE public.audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    action text NOT NULL,
    result text NOT NULL DEFAULT 'ok',
    document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
    resource_cid text,
    meta jsonb NOT NULL DEFAULT '{}',
    prev_hash text,
    row_hash text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Function to verify the audit chain.
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE (
    intact boolean,
    total_rows bigint,
    verified_rows bigint,
    first_break_id uuid,
    first_break_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total bigint;
    v_verified bigint := 0;
    v_break_id uuid := NULL;
    v_break_at timestamptz := NULL;
    rec RECORD;
    expected_hash text;
BEGIN
    SELECT count(*) INTO v_total FROM public.audit_events;

    FOR rec IN
        SELECT id, created_at, prev_hash, row_hash,
               sha256(
                   COALESCE(prev_hash, '') ||
                   action ||
                   COALESCE(resource_cid, '') ||
                   COALESCE(user_id, '') ||
                   COALESCE(document_id::text, '') ||
                   meta::text ||
                   result ||
                   EXTRACT(EPOCH FROM created_at)::text
               )::text AS computed_hash
        FROM public.audit_events
        ORDER BY created_at ASC, id ASC
    LOOP
        expected_hash := rec.computed_hash;
        IF rec.row_hash = expected_hash THEN
            v_verified := v_verified + 1;
        ELSIF v_break_id IS NULL THEN
            v_break_id := rec.id;
            v_break_at := rec.created_at;
        END IF;
    END LOOP;

    RETURN QUERY SELECT
        v_break_id IS NULL,
        v_total,
        v_verified,
        v_break_id,
        v_break_at;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_audit_chain() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain() TO authenticated;

-- AI call logs
CREATE TABLE public.ai_call_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
    task text NOT NULL,
    prompt_text text NOT NULL,
    response_text text,
    model text,
    status text NOT NULL DEFAULT 'ok',
    pii_findings jsonb NOT NULL DEFAULT '[]',
    truncated boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Ephemeral access tokens
CREATE TABLE public.tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_preview text NOT NULL,
    token_hash text NOT NULL,
    scope_cid text NOT NULL,
    document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
    permissions text[] NOT NULL DEFAULT '{}',
    expires_at timestamptz NOT NULL,
    revoked boolean NOT NULL DEFAULT false,
    created_by text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Safe view of tokens (never returns token_hash or full token)
CREATE OR REPLACE VIEW public.tokens_safe AS
SELECT
    id,
    token_preview,
    scope_cid,
    document_id,
    permissions,
    expires_at,
    revoked,
    created_by,
    created_at
FROM public.tokens;

-- System settings (e.g. break-glass mode)
CREATE TABLE public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}',
    updated_by text REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpers for role assignment
CREATE OR REPLACE FUNCTION public.assign_user_role(
    _target_user text,
    _role public.app_role
)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user, _role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN (SELECT ur FROM public.user_roles ur WHERE ur.user_id = _target_user AND ur.role = _role);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_user_role(text, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_user_role(text, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_user_role(_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.user_roles WHERE id = _role_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_user_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;

-- Break-glass helper
CREATE OR REPLACE FUNCTION public.get_break_glass()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT value FROM public.system_settings WHERE key = 'break_glass'),
        '{"enabled": false, "enabled_by": null, "enabled_at": null, "reason": null}'::jsonb
    );
$$;

REVOKE ALL ON FUNCTION public.get_break_glass() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_break_glass() TO authenticated;

-- Demo flag helper (for the no-signup demo account)
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT _user_id = 'demo-user-id';
$$;

-- Indexes for performance
CREATE INDEX idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX idx_documents_client_id ON public.documents(client_id);
CREATE INDEX idx_documents_classification ON public.documents(classification);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX idx_audit_events_document_id ON public.audit_events(document_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at DESC);
CREATE INDEX idx_client_assignments_user_id ON public.client_assignments(user_id);
CREATE INDEX idx_client_assignments_client_id ON public.client_assignments(client_id);
CREATE INDEX idx_tokens_created_by ON public.tokens(created_by);
CREATE INDEX idx_tokens_document_id ON public.tokens(document_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Sample data for local testing (delete or replace with seed function during event)
INSERT INTO public.clients (code, name) VALUES
('ACME', 'ACME Holdings'),
('BLUE', 'Blue River Finance');
