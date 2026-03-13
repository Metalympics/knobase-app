-- ============================================
-- Migration: API Key Management
-- Description: Add api_keys table for programmatic access
--              and is_suspended column to users table
-- Created: 2026-03-10
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: api_keys
-- Purpose: Store hashed API keys for programmatic access
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash text NOT NULL,
    key_prefix text NOT NULL,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
    scopes text[] NOT NULL DEFAULT '{}',
    name text NOT NULL,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at timestamptz,
    last_used_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_api_keys_key_hash UNIQUE (key_hash),
    CONSTRAINT chk_key_prefix_length CHECK (char_length(key_prefix) BETWEEN 4 AND 12),
    CONSTRAINT chk_name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_api_keys_hash ON public.api_keys (key_hash);
CREATE INDEX idx_api_keys_user ON public.api_keys (user_id) WHERE is_active = true;
CREATE INDEX idx_api_keys_school ON public.api_keys (school_id) WHERE is_active = true;
CREATE INDEX idx_api_keys_expires ON public.api_keys (expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE public.api_keys IS 'Stores hashed API keys for programmatic access to the platform';
COMMENT ON COLUMN public.api_keys.key_hash IS 'SHA-256 hash of the API key; the plaintext key is never stored';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'First few characters of the key for identification (e.g. "kb_a1b2")';
COMMENT ON COLUMN public.api_keys.scopes IS 'Array of permission scopes granted to this key';

-- ============================================
-- Function: touch_api_key_last_used
-- Purpose: Callable function to stamp last_used_at when
--          an API key is verified (invoked from app code).
-- ============================================
CREATE OR REPLACE FUNCTION public.touch_api_key_last_used(p_key_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.api_keys
    SET last_used_at = now()
    WHERE id = p_key_id
      AND is_active = true;
END;
$$;

COMMENT ON FUNCTION public.touch_api_key_last_used(uuid) IS 'Stamps last_used_at when an API key is accessed';

-- ============================================
-- Alter users table: add is_suspended column
-- ============================================
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_suspended IS 'When true the user is suspended and cannot perform write operations';
