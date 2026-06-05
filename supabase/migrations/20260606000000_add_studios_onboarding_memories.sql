-- ═══════════════════════════════════════════════════════════════
-- Studios, Onboarding, Memories & Conversation-Project link
-- ═══════════════════════════════════════════════════════════════

-- 1. STUDIOS
create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.studios enable row level security;

-- Members can see the studio; admins can update/delete
create policy "studios select own"
  on public.studios for select
  using (
    auth.uid() in (
      select user_id from public.studio_members where studio_id = id
    )
  );
create policy "studios insert own"
  on public.studios for insert
  with check (auth.uid() = created_by);
create policy "studios update own"
  on public.studios for update
  using (auth.uid() = created_by);
create policy "studios delete own"
  on public.studios for delete
  using (auth.uid() = created_by);

-- 2. STUDIO MEMBERS
create table public.studio_members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  unique(studio_id, user_id)
);
alter table public.studio_members enable row level security;

create policy "studio_members select own"
  on public.studio_members for select
  using (
    auth.uid() in (
      select user_id from public.studio_members where studio_id = studio_id
    )
  );
create policy "studio_members insert own"
  on public.studio_members for insert
  with check (
    -- Only admins can add members, or the first member creation
    auth.uid() in (
      select user_id from public.studio_members
      where studio_id = studio_id and role = 'admin'
    )
  );
create policy "studio_members update own"
  on public.studio_members for update
  using (
    auth.uid() in (
      select user_id from public.studio_members
      where studio_id = studio_id and role = 'admin'
    )
  );
create policy "studio_members delete own"
  on public.studio_members for delete
  using (
    auth.uid() in (
      select user_id from public.studio_members
      where studio_id = studio_id and role = 'admin'
    )
  );

-- 3. ONBOARDING DATA
create table public.onboarding_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('full','quick')),
  data jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);
alter table public.onboarding_data enable row level security;
create policy "onboarding own all"
  on public.onboarding_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create trigger onboarding_updated
  before update on public.onboarding_data
  for each row execute function public.set_updated_at();

-- 4. MEMORIES
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  studio_id uuid references public.studios(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  level text not null check (level in ('project','personal','studio')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.memories enable row level security;

-- Personal & project memories: only the owning user
-- Studio memories: all studio members
create policy "memories select own"
  on public.memories for select
  using (
    auth.uid() = user_id
    or
    (level = 'studio' and studio_id is not null and auth.uid() in (
      select user_id from public.studio_members where studio_id = memories.studio_id
    ))
  );
create policy "memories insert own"
  on public.memories for insert
  with check (auth.uid() = user_id);
create policy "memories update own"
  on public.memories for update
  using (auth.uid() = user_id);
create policy "memories delete own"
  on public.memories for delete
  using (auth.uid() = user_id);

create trigger memories_updated
  before update on public.memories
  for each row execute function public.set_updated_at();

-- 5. CONVERSATIONS — add project_id
alter table public.conversations
  add column if not exists project_id uuid references public.projects(id) on delete set null;

-- 6. PROFILES — add studio + onboarding columns
alter table public.profiles
  add column if not exists studio_id uuid references public.studios(id) on delete set null;
alter table public.profiles
  add column if not exists onboarding_completed bool not null default false;
alter table public.profiles
  add column if not exists onboarding_level text check (onboarding_level in ('full','quick'));
