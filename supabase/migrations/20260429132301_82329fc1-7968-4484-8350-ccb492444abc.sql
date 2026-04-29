GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_demo_user() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_assigned_to_client(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_can_view_doc_v2(uuid, public.classification_tag, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_break_glass() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;