-- ⚠️  DO NOT RUN THIS AUTOMATICALLY ⚠️
-- This migration file is provided for REFERENCE ONLY.
-- Run manually via the Supabase SQL Editor when ready.
--
-- Creates the `documents` table for storing markdown documents.
-- The app works fully in local-only mode without this table.

CREATE TABLE IF NOT EXISTS public.documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL DEFAULT 'Untitled',
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write documents.
-- Tighten this policy in Phase 2 when user accounts are added.
CREATE POLICY "Allow authenticated access" ON public.documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous (anon key) access for local development
CREATE POLICY "Allow anon access" ON public.documents
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Auto-update `updated_at` on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
