-- Page comments: replaces localStorage-only comment storage.
-- Flat structure with parent_id for replies; client assembles tree.

CREATE TABLE IF NOT EXISTS public.page_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID        NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  school_id    UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id    UUID        REFERENCES public.page_comments(id) ON DELETE CASCADE,
  block_id     TEXT,
  content      TEXT        NOT NULL,
  author_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  author_name  TEXT        NOT NULL DEFAULT 'Anonymous',
  selection_from INTEGER,
  selection_to   INTEGER,
  selected_text  TEXT,
  resolved     BOOLEAN     NOT NULL DEFAULT false,
  mentions     JSONB       NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_comments_document
  ON public.page_comments(document_id, created_at);

CREATE INDEX IF NOT EXISTS idx_page_comments_parent
  ON public.page_comments(parent_id)
  WHERE parent_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_page_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_page_comments_updated_at ON public.page_comments;
CREATE TRIGGER trg_page_comments_updated_at
  BEFORE UPDATE ON public.page_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_page_comments_updated_at();

-- Enable Realtime so cross-user comment updates are pushed to browsers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'page_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.page_comments;
  END IF;
END $$;
