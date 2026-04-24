-- Re-declare with identical body so the definition is unambiguous, plus add COMMENT metadata.
CREATE OR REPLACE FUNCTION public.user_assigned_to_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_assignments
    WHERE user_id = _user_id
      AND client_id = _client_id
  );
$$;

COMMENT ON FUNCTION public.user_assigned_to_client(uuid, uuid) IS
  'STABLE SECURITY DEFINER, search_path=public. Returns true iff a row in public.client_assignments matches BOTH _user_id and _client_id exactly. Called from RLS policies with auth.uid() as _user_id, so it cannot be used to read assignments for other users in practice. No dynamic SQL, no side effects.';

COMMENT ON FUNCTION public.user_can_view_doc_v2(uuid, public.classification_tag, uuid) IS
  'STABLE SECURITY DEFINER, search_path=public. Two-gate document access check: (1) classification gate via has_role, (2) client gate via user_assigned_to_client (skipped when _client_id IS NULL or caller is manager/admin). Always called from RLS with auth.uid().';

-- Lock down EXECUTE: only authenticated users (RLS context) need this.
REVOKE ALL ON FUNCTION public.user_assigned_to_client(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_assigned_to_client(uuid, uuid) TO authenticated;