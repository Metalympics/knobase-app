-- ============================================
-- Migration: OpenClaw Integration - Webhooks
-- Description: Add user_webhooks table
-- Created: 2024-03-10
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: user_webhooks
-- Purpose: Store webhook URLs for agents/users to receive events
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN ('mention', 'comment', 'invite', 'task_assigned')),
    webhook_url text NOT NULL,
    secret text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_webhooks_lookup 
    ON public.user_webhooks(user_id, event_type) 
    WHERE is_active = true;

CREATE INDEX idx_user_webhooks_created 
    ON public.user_webhooks(created_at);

COMMENT ON TABLE public.user_webhooks IS 'Stores webhook endpoints for users/agents to receive real-time events';
COMMENT ON COLUMN public.user_webhooks.secret IS 'HMAC secret for webhook signature verification';

-- ============================================
-- Trigger: Update updated_at on user_webhooks
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_user_webhooks_updated_at ON public.user_webhooks;
CREATE TRIGGER trg_user_webhooks_updated_at
    BEFORE UPDATE ON public.user_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
