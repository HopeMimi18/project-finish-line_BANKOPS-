-- Defense in depth: explicitly deny all client-side writes to user_roles.
-- Role mutations must go through assign_user_role / remove_user_role (SECURITY DEFINER).
CREATE POLICY "Deny client INSERT on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client UPDATE on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client DELETE on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (false);