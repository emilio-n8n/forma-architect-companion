
-- Extend memories with metadata used by app
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS freshness_score double precision NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS last_accessed timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memories_category_check') THEN
    ALTER TABLE public.memories
      ADD CONSTRAINT memories_category_check
      CHECK (category IS NULL OR category IN ('preferences','projects','work_style','constraints','general'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS memories_user_level_idx ON public.memories(user_id, level);
CREATE INDEX IF NOT EXISTS memories_user_active_idx ON public.memories(user_id, is_active);
CREATE INDEX IF NOT EXISTS memories_user_freshness_idx ON public.memories(user_id, freshness_score);
CREATE INDEX IF NOT EXISTS memories_project_idx ON public.memories(project_id);
CREATE INDEX IF NOT EXISTS memories_studio_idx ON public.memories(studio_id);

-- Memory summaries table
CREATE TABLE IF NOT EXISTS public.memory_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('preferences','projects','work_style','constraints','general')),
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_summaries TO authenticated;
GRANT ALL ON public.memory_summaries TO service_role;

ALTER TABLE public.memory_summaries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='memory_summaries' AND policyname='Users manage own memory summaries') THEN
    CREATE POLICY "Users manage own memory summaries" ON public.memory_summaries
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_memory_summaries_updated_at ON public.memory_summaries;
CREATE TRIGGER set_memory_summaries_updated_at
  BEFORE UPDATE ON public.memory_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
