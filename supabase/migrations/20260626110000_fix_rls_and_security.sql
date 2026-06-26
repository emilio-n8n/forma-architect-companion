-- Fix: studio_members insert policy — remove self-insert vulnerability
-- The "members insert self or admin" policy allowed any user to join any studio
drop policy if exists "members insert self or admin" on public.studio_members;
create policy "members insert admin only" on public.studio_members for insert to authenticated
  with check (public.is_studio_admin(studio_id, auth.uid()));

-- Allow first member creation (studio owner) via a special exemption:
-- If no members exist for the studio yet, the creator can join as admin
drop policy if exists "members insert first member" on public.studio_members;
create policy "members insert first member" on public.studio_members for insert to authenticated
  with check (
    not exists (select 1 from public.studio_members where studio_id = studio_id)
    and user_id = auth.uid()
    and role = 'admin'
  );

-- Security definer helpers are used by RLS policies only.
-- Revoke direct execution by users to prevent misuse.
revoke execute on function public.is_studio_member(uuid, uuid) from anon, authenticated;
revoke execute on function public.is_studio_admin(uuid, uuid) from anon, authenticated;
