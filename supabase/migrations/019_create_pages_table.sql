-- Migration 019: (NO-OP) Create Pages Table
--
-- MOVED TO: 009_create_pages_table.sql
--
-- The pages table must exist before migrations 010 and 011 which
-- reference pages(id) in their FK constraints. This migration was
-- originally numbered 019 but has been relocated to 009 to fix
-- dependency ordering.
--
-- If the pages table already exists (from a previous run of this
-- migration), this file is safely a no-op.

CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_md TEXT NOT NULL DEFAULT '',
  content_json JSONB,
  icon TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'shared', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
