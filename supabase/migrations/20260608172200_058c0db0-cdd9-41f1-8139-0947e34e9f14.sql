ALTER TABLE public.studio_members
  ADD CONSTRAINT studio_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;