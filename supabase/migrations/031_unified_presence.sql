-- Migration 031: Unified presence tracking for humans and agents
-- Adds presence columns to the users table so both human WebSocket
-- sessions and agent heartbeats share a single presence model.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS presence_status      TEXT        NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS last_seen_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS presence_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS websocket_session_id TEXT,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connection_quality   TEXT;

-- Constrain allowed values
ALTER TABLE public.users
  ADD CONSTRAINT chk_presence_status
    CHECK (presence_status IN ('online', 'away', 'offline', 'error'));

ALTER TABLE public.users
  ADD CONSTRAINT chk_connection_quality
    CHECK (connection_quality IS NULL OR connection_quality IN ('excellent', 'good', 'poor'));

-- Indexes for fast presence queries
CREATE INDEX IF NOT EXISTS idx_users_presence_status
  ON public.users(presence_status)
  WHERE presence_status <> 'offline';

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
  ON public.users(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_last_heartbeat_at
  ON public.users(last_heartbeat_at DESC)
  WHERE last_heartbeat_at IS NOT NULL;

-- Keep RLS disabled (matches project convention from migration 031_disable_rls_remaining)
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
