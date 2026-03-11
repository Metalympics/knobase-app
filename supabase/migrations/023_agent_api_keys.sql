-- Create the agent_api_keys table.
-- The existing api_keys table (016) is for user-level keys.
-- This table is specifically for agent-to-platform API keys
-- used by external agents to authenticate via Bearer token.

CREATE TABLE IF NOT EXISTS public.agent_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  agent_id text,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  tier text NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro', 'enterprise')),
  scopes text[] NOT NULL DEFAULT '{read,write,task}',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,

  CONSTRAINT uq_agent_api_keys_hash UNIQUE (key_hash)
);

CREATE INDEX IF NOT EXISTS idx_agent_api_keys_hash
  ON public.agent_api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_school
  ON public.agent_api_keys (school_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_agent
  ON public.agent_api_keys (agent_id) WHERE revoked_at IS NULL;
