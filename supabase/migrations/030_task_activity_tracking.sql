-- Migration 030: Task Activity Tracking
-- Adds last_activity_at to agent_tasks so the UI can show when an agent
-- last interacted with a task (progress update, status change, etc.).
-- This supports agent-driven lifecycle: Knobase never auto-fails tasks,
-- but displays "last heard from" and "inactive" indicators.

ALTER TABLE public.agent_tasks
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Backfill existing rows: use the most recent timestamp available
UPDATE public.agent_tasks
SET last_activity_at = COALESCE(completed_at, started_at, acknowledged_at, created_at)
WHERE last_activity_at IS NULL;

-- Partial index for active tasks — used by the UI to check for inactivity
CREATE INDEX IF NOT EXISTS idx_agent_tasks_activity
  ON public.agent_tasks(last_activity_at DESC)
  WHERE status IN ('working', 'acknowledged');
