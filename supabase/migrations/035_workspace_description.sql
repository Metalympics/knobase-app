-- Add description field to workspaces (schools)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS description TEXT;
