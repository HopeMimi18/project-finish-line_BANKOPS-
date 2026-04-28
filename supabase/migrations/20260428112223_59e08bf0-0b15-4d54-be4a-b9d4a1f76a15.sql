-- Lock down SECURITY DEFINER helper functions so they aren't callable directly
-- via PostgREST by anon or authenticated roles. RLS policies that reference
-- them keep working because policy evaluation runs with the policy owner's
-- privileges, not the caller's.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_assigned_to_client(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_can_view_doc_v2(uuid, public.classification_tag, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_break_glass() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_events_protect_hash() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_events_hash_chain() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_events_validate_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- User-callable RPCs: anon should not call these. Authenticated still can,
-- and the functions perform their own role checks internally.
REVOKE EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_audit_chain() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain() TO authenticated;