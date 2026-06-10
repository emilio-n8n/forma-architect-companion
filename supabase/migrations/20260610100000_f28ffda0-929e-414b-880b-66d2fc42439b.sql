-- Dreaming V3: memory freshness, categories, and summaries

-- 1. Add columns to memories table
alter table public.memories
  add column if not exists freshness_score float not null default 1.0;

alter table public.memories
  add column if not exists last_accessed timestamptz;

alter table public.memories
  add column if not exists category text;

alter table public.memories
  add column if not exists is_active boolean not null default true;

alter table public.memories
  add column if not exists source_conversation_id uuid references public.conversations(id) on delete set null;

create index if not exists memories_active_idx on public.memories(user_id, is_active) where is_active = true;
create index if not exists memories_freshness_idx on public.memories(user_id, freshness_score desc) where is_active = true;

-- 2. Memory summaries table
create table if not exists public.memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('preferences','projects','work_style','constraints','general')),
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, category)
);

grant select, insert, update, delete on public.memory_summaries to authenticated;
grant all on public.memory_summaries to service_role;
alter table public.memory_summaries enable row level security;

create policy "summaries own all" on public.memory_summaries for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists memory_summaries_updated on public.memory_summaries;
create trigger memory_summaries_updated before update on public.memory_summaries
  for each row execute function public.set_updated_at();
