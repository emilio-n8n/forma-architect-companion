
-- 1. STUDIOS
create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.studios to authenticated;
grant all on public.studios to service_role;
alter table public.studios enable row level security;

-- 2. STUDIO MEMBERS
create table if not exists public.studio_members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  unique(studio_id, user_id)
);
grant select, insert, update, delete on public.studio_members to authenticated;
grant all on public.studio_members to service_role;
alter table public.studio_members enable row level security;

-- Security definer helpers (avoid recursive RLS on studio_members)
create or replace function public.is_studio_member(_studio_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.studio_members where studio_id = _studio_id and user_id = _user_id)
$$;

create or replace function public.is_studio_admin(_studio_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.studio_members where studio_id = _studio_id and user_id = _user_id and role = 'admin')
$$;

-- Studios policies
create policy "studios select members" on public.studios for select to authenticated
  using (public.is_studio_member(id, auth.uid()) or created_by = auth.uid());
create policy "studios insert own" on public.studios for insert to authenticated
  with check (auth.uid() = created_by);
create policy "studios update creator" on public.studios for update to authenticated
  using (auth.uid() = created_by);
create policy "studios delete creator" on public.studios for delete to authenticated
  using (auth.uid() = created_by);

-- Studio members policies
create policy "members select self or admin" on public.studio_members for select to authenticated
  using (user_id = auth.uid() or public.is_studio_admin(studio_id, auth.uid()));
-- First member (creator) insertable directly; subsequent inserts must be by an admin
create policy "members insert self or admin" on public.studio_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_studio_admin(studio_id, auth.uid()));
create policy "members update admin" on public.studio_members for update to authenticated
  using (public.is_studio_admin(studio_id, auth.uid()));
create policy "members delete admin or self" on public.studio_members for delete to authenticated
  using (user_id = auth.uid() or public.is_studio_admin(studio_id, auth.uid()));

-- 3. ONBOARDING DATA
create table if not exists public.onboarding_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('full','quick')),
  data jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);
grant select, insert, update, delete on public.onboarding_data to authenticated;
grant all on public.onboarding_data to service_role;
alter table public.onboarding_data enable row level security;
create policy "onboarding own all" on public.onboarding_data for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists onboarding_updated on public.onboarding_data;
create trigger onboarding_updated before update on public.onboarding_data
  for each row execute function public.set_updated_at();

-- 4. MEMORIES
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  studio_id uuid references public.studios(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  level text not null check (level in ('project','personal','studio')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.memories to authenticated;
grant all on public.memories to service_role;
alter table public.memories enable row level security;

create policy "memories select" on public.memories for select to authenticated
  using (
    auth.uid() = user_id
    or (level = 'studio' and studio_id is not null and public.is_studio_member(studio_id, auth.uid()))
  );
create policy "memories insert own" on public.memories for insert to authenticated
  with check (auth.uid() = user_id);
create policy "memories update own" on public.memories for update to authenticated
  using (auth.uid() = user_id);
create policy "memories delete own" on public.memories for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists memories_updated on public.memories;
create trigger memories_updated before update on public.memories
  for each row execute function public.set_updated_at();

create index if not exists memories_user_level_idx on public.memories(user_id, level);
create index if not exists memories_studio_idx on public.memories(studio_id) where studio_id is not null;
create index if not exists memories_project_idx on public.memories(project_id) where project_id is not null;

-- 5. CONVERSATIONS — add project_id
alter table public.conversations
  add column if not exists project_id uuid references public.projects(id) on delete set null;

-- 6. PROFILES — add studio + onboarding columns
alter table public.profiles
  add column if not exists studio_id uuid references public.studios(id) on delete set null;
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles
  add column if not exists onboarding_level text check (onboarding_level in ('full','quick'));
