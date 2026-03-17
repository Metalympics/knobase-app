-- Workspace-level outbound webhook configurations (replaces localStorage).
-- Each row is one webhook endpoint that can subscribe to multiple events.
CREATE TABLE IF NOT EXISTS public.workspace_webhooks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  events       TEXT[]      NOT NULL DEFAULT '{}',
  secret       TEXT        NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  failure_count INT        NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_webhooks_school
  ON public.workspace_webhooks(school_id)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.set_workspace_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workspace_webhooks_updated_at ON public.workspace_webhooks;
CREATE TRIGGER trg_workspace_webhooks_updated_at
  BEFORE UPDATE ON public.workspace_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_webhooks_updated_at();
