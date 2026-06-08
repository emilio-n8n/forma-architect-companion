GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_studio_admin(uuid, uuid) TO authenticated, service_role;