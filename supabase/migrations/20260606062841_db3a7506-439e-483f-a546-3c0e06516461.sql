revoke execute on function public.is_studio_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_studio_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_studio_member(uuid, uuid) to service_role;
grant execute on function public.is_studio_admin(uuid, uuid) to service_role;