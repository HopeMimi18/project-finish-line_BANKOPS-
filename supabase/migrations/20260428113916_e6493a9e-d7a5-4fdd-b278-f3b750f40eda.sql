-- 1) Helper: is the current caller the demo account?
CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'demo@bankops.example'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_demo_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_user() TO authenticated;

-- 2) Grant demo user the manager role so writes work end-to-end.
DO $$
DECLARE
  demo_id uuid;
BEGIN
  SELECT id INTO demo_id FROM auth.users WHERE lower(email) = 'demo@bankops.example' LIMIT 1;
  IF demo_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (demo_id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 3) Block demo from mutating role assignments for non-demo accounts.
--    assign_user_role / remove_user_role are SECURITY DEFINER so we add the
--    check inside those functions.
CREATE OR REPLACE FUNCTION public.assign_user_role(_target_user uuid, _role app_role)
RETURNS user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inserted_row public.user_roles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Demo account may only assign roles to itself (its own user_id),
  -- and only non-elevated roles. Prevents demo visitors from escalating
  -- real tenants or granting themselves admin.
  IF public.is_demo_user() THEN
    IF _target_user <> auth.uid() THEN
      RAISE EXCEPTION 'demo account may only modify its own roles';
    END IF;
    IF _role = 'admin' THEN
      RAISE EXCEPTION 'demo account may not grant admin';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user, _role)
  ON CONFLICT (user_id, role) DO NOTHING
  RETURNING * INTO inserted_row;

  IF inserted_row IS NULL THEN
    RAISE EXCEPTION 'role already assigned';
  END IF;

  RETURN inserted_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_user_role(_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO target_user FROM public.user_roles WHERE id = _role_id;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'role not found';
  END IF;

  -- Demo account may only remove its own role rows.
  IF public.is_demo_user() AND target_user <> auth.uid() THEN
    RAISE EXCEPTION 'demo account may only modify its own roles';
  END IF;

  DELETE FROM public.user_roles WHERE id = _role_id;
END;
$function$;

-- 4) Clients: prevent demo from deleting/updating real-tenant clients.
--    Strategy: demo may only update/delete clients whose code starts with 'DEMO_'
--    or the seed codes (ACME, BLUE) which are demo data.
DROP POLICY IF EXISTS "Managers/admins can delete clients" ON public.clients;
CREATE POLICY "Managers/admins can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  AND (
    NOT public.is_demo_user()
    OR code IN ('ACME', 'BLUE')
    OR code LIKE 'DEMO_%'
  )
);

DROP POLICY IF EXISTS "Managers/admins can update clients" ON public.clients;
CREATE POLICY "Managers/admins can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  AND (
    NOT public.is_demo_user()
    OR code IN ('ACME', 'BLUE')
    OR code LIKE 'DEMO_%'
  )
);

-- 5) Client assignments: demo may only modify assignments for itself.
DROP POLICY IF EXISTS "Managers/admins can insert assignments" ON public.client_assignments;
CREATE POLICY "Managers/admins can insert assignments"
ON public.client_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  AND (NOT public.is_demo_user() OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Managers/admins can delete assignments" ON public.client_assignments;
CREATE POLICY "Managers/admins can delete assignments"
ON public.client_assignments
FOR DELETE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  AND (NOT public.is_demo_user() OR user_id = auth.uid())
);

-- 6) system_settings: break-glass etc. is global. Demo can read but not write.
DROP POLICY IF EXISTS "Managers/admins can upsert settings" ON public.system_settings;
CREATE POLICY "Managers/admins can upsert settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  AND NOT public.is_demo_user()
);

DROP POLICY IF EXISTS "Managers/admins can update settings" ON public.system_settings;
CREATE POLICY "Managers/admins can update settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  AND NOT public.is_demo_user()
);