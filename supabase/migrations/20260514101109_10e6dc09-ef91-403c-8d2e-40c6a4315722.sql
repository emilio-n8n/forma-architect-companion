
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  agency_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- projects (Kanban)
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  tag text default 'Résidentiel',
  status text not null default 'todo' check (status in ('todo','in_progress','review','done')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "projects own all" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();

-- renders
create table public.renders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  prompt text,
  ambiance text,
  weather text,
  style text,
  reference_url text,
  image_url text,
  status text not null default 'pending' check (status in ('pending','done','error')),
  created_at timestamptz not null default now()
);
alter table public.renders enable row level security;
create policy "renders own all" on public.renders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- plans (Mini Archi)
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surface int not null,
  bedrooms int not null,
  levels int not null,
  budget text not null,
  variants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;
create policy "plans own all" on public.plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- conversations + messages
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations enable row level security;
create policy "conv own all" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger conv_updated before update on public.conversations for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "msg own all" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- storage buckets
insert into storage.buckets (id, name, public) values ('renders', 'renders', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false) on conflict (id) do nothing;

create policy "renders public read" on storage.objects for select using (bucket_id = 'renders');
create policy "renders user write" on storage.objects for insert with check (bucket_id = 'renders' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "renders user update" on storage.objects for update using (bucket_id = 'renders' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "renders user delete" on storage.objects for delete using (bucket_id = 'renders' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "uploads user read" on storage.objects for select using (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "uploads user write" on storage.objects for insert with check (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "uploads user delete" on storage.objects for delete using (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);
