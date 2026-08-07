
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_gym_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_gym_admin_of(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_client(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_client(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_template(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_template(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.template_of_day(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
