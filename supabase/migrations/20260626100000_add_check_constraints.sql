-- Add CHECK constraints that exist in app code but not in the database

-- plans.budget: ensure only valid budget levels
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_budget_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_budget_check
  CHECK (budget IN ('Économique', 'Moyen de gamme', 'Haut de gamme'));

-- renders.ambiance: ensure only valid ambiance values
ALTER TABLE public.renders DROP CONSTRAINT IF EXISTS renders_ambiance_check;
ALTER TABLE public.renders ADD CONSTRAINT renders_ambiance_check
  CHECK (ambiance IN ('jour', 'nuit'));
