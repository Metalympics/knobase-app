-- ⚠️  DO NOT RUN THIS AUTOMATICALLY ⚠️
-- This migration file is provided for REFERENCE ONLY.
-- Run manually via the Supabase SQL Editor when ready.
--
-- Seeds the OpenClaw webhook configuration into the agent_webhooks table.
-- Depends on: 005_webhooks_and_api_keys.sql (agent_webhooks table)
--
-- After running this, update the `url` and `secret` columns with your
-- actual OpenClaw Gateway endpoint and shared HMAC secret.

DO $$
DECLARE
  ws_id UUID;
BEGIN
  -- Grab the first available workspace
  SELECT id INTO ws_id FROM public.workspaces LIMIT 1;

  IF ws_id IS NULL THEN
    RAISE EXCEPTION 'No workspace found. Create a workspace first.';
  END IF;

  -- Upsert webhook config for the "claw" agent
  INSERT INTO public.agent_webhooks (
    agent_id,
    workspace_id,
    url,
    secret,
    events,
    active
  ) VALUES (
    'claw',
    ws_id,
    'https://CHANGE-ME.ngrok.io/webhook',      -- ← Replace with your OpenClaw Gateway URL
    'CHANGE-ME-32-CHAR-SECRET-KEY-HERE',        -- ← Replace with a random 32+ char secret
    ARRAY[
      'task.created',
      'task.completed',
      'task.failed',
      'proposal.created',
      'proposal.decided'
    ],
    true
  )
  ON CONFLICT (agent_id, workspace_id)
  DO UPDATE SET
    url     = EXCLUDED.url,
    secret  = EXCLUDED.secret,
    events  = EXCLUDED.events,
    active  = EXCLUDED.active;

  RAISE NOTICE 'OpenClaw webhook configured for workspace %', ws_id;
END $$;
