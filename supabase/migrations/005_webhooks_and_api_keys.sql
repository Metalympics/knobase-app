-- ⚠️  DO NOT RUN THIS AUTOMATICALLY ⚠️
-- This migration file is provided for REFERENCE ONLY.
-- Run manually via the Supabase SQL Editor when ready.
--
-- Creates webhook and API key tables for agent communication.
-- Depends on: 004_agent_coordination.sql (agent_tasks, agent_personas, etc.)
--             003_multi_tenant_auth.sql (users, workspaces, workspace_members)

-- ============================================
-- 1. AGENT WEBHOOKS (outbound notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_webhooks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  agent_id           TEXT NOT NULL,
  workspace_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Endpoint
  url                TEXT NOT NULL,
  secret             TEXT NOT NULL,  -- used for HMAC-SHA256 payload signing

  -- Event filtering
  events             TEXT[] DEFAULT ARRAY['task.created'],

  -- Health
  active             BOOLEAN DEFAULT true,
  failure_count      INTEGER DEFAULT 0,
  last_triggered_at  TIMESTAMPTZ,

  -- Metadata
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),

  -- One webhook per agent per workspace
  UNIQUE(agent_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_webhooks_agent_id
  ON public.agent_webhooks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_webhooks_workspace_id
  ON public.agent_webhooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_webhooks_active
  ON public.agent_webhooks(active)
  WHERE active = true;

CREATE TRIGGER agent_webhooks_updated_at
  BEFORE UPDATE ON public.agent_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2. AGENT API KEYS (inbound authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_api_keys (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id          TEXT NOT NULL,

  -- Key identity
  name              TEXT NOT NULL,           -- human-readable label
  key_hash          TEXT NOT NULL UNIQUE,    -- SHA-256 hash of the raw key
  key_prefix        TEXT NOT NULL,           -- first 8 chars (e.g. "kb_a3f2...") for identification

  -- Access control
  tier              TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  scopes            TEXT[] DEFAULT ARRAY['tasks:read', 'tasks:write'],

  -- Usage tracking
  last_used_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,            -- NULL = never expires

  -- Lifecycle
  created_at        TIMESTAMPTZ DEFAULT now(),
  revoked_at        TIMESTAMPTZ             -- soft delete; NULL = active
);

CREATE INDEX IF NOT EXISTS idx_agent_api_keys_workspace_id
  ON public.agent_api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_agent_id
  ON public.agent_api_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_key_hash
  ON public.agent_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_prefix
  ON public.agent_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_active
  ON public.agent_api_keys(key_hash)
  WHERE revoked_at IS NULL;

-- ============================================
-- FUNCTION: Auto-disable webhook after 10 failures
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_disable_webhook()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.failure_count >= 10 AND NEW.active = true THEN
    NEW.active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_disable_webhook
  BEFORE UPDATE ON public.agent_webhooks
  FOR EACH ROW
  WHEN (NEW.failure_count IS DISTINCT FROM OLD.failure_count)
  EXECUTE FUNCTION public.auto_disable_webhook();
