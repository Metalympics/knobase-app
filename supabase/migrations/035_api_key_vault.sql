-- Migration: 035_api_key_vault
-- Description: Centralized API key vault for secure storage of third-party API keys
-- Created: 2026-03-17

CREATE TABLE IF NOT EXISTS public.api_key_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

  env_name TEXT NOT NULL,
  description TEXT,

  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,

  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,

  UNIQUE(school_id, env_name)
);

CREATE INDEX IF NOT EXISTS idx_api_key_vault_school
  ON public.api_key_vault (school_id);

CREATE INDEX IF NOT EXISTS idx_api_key_vault_env_name
  ON public.api_key_vault (school_id, env_name);

COMMENT ON TABLE public.api_key_vault IS 'Centralized encrypted vault for third-party API keys. Agents retrieve keys by env_name.';
COMMENT ON COLUMN public.api_key_vault.env_name IS 'Environment variable name agents use to reference this key, e.g. OPENAI_API_KEY';
COMMENT ON COLUMN public.api_key_vault.encrypted_value IS 'AES-256-GCM encrypted API key value';
COMMENT ON COLUMN public.api_key_vault.iv IS 'Initialization vector for AES-GCM decryption (base64)';
COMMENT ON COLUMN public.api_key_vault.salt IS 'Salt used for workspace-specific key derivation (base64)';

CREATE TABLE IF NOT EXISTS public.api_key_vault_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_key_vault(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  env_name TEXT NOT NULL,
  purpose TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_vault_access_logs_key
  ON public.api_key_vault_access_logs (api_key_id);

CREATE INDEX IF NOT EXISTS idx_vault_access_logs_agent
  ON public.api_key_vault_access_logs (agent_id);

COMMENT ON TABLE public.api_key_vault_access_logs IS 'Audit trail for every vault key access by agents';
