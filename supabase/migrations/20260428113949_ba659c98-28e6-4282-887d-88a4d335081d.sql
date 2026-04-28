-- is_demo_user is only meant to be called from RLS policies and other SECURITY DEFINER
-- functions, never directly by clients. Revoke from authenticated.
REVOKE EXECUTE ON FUNCTION public.is_demo_user() FROM PUBLIC, anon, authenticated;

-- The previous migration recreated assign_user_role and remove_user_role with
-- CREATE OR REPLACE which resets their default grants. Both have an internal
-- has_role() check, so they're safe to expose to authenticated callers (this
-- is how the Admin & Access UI works).
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_user_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_user_role(uuid) FROM anon, PUBLIC;