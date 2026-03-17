-- Migration 032: Custom Domain Public Docs
-- Adds columns to support custom-domain public documentation sites
-- (e.g. docs.knobase.com). Schools can opt in to a public workspace and
-- individual pages can be published with a human-readable slug.

-- 1. Schools: custom domain + public workspace flag
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public_workspace BOOLEAN DEFAULT false;

-- 2. Pages: public flag + slug for /docs/page-title URLs
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;

-- 3. Disable RLS (consistent with existing policy — no row-level policies yet)
ALTER TABLE IF EXISTS public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pages DISABLE ROW LEVEL SECURITY;

-- 4. Fast lookups by custom domain
CREATE INDEX IF NOT EXISTS idx_schools_custom_domain
  ON public.schools(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- 5. Fast lookups by public slug
CREATE INDEX IF NOT EXISTS idx_pages_public_slug
  ON public.pages(public_slug)
  WHERE public_slug IS NOT NULL;
