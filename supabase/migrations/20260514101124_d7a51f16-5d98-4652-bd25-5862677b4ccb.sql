
-- 1. fix search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- 2. restrict listing of renders bucket: only owner can SELECT via API; public URL still works
drop policy if exists "renders public read" on storage.objects;
create policy "renders user read" on storage.objects for select using (bucket_id = 'renders' and auth.uid()::text = (storage.foldername(name))[1]);

-- 3 & 4. lock down SECURITY DEFINER funcs
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.set_updated_at() from anon, authenticated, public;
