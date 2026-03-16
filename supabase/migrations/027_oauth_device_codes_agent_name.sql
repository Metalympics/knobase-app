-- Add agent_name to oauth_device_codes for agent invite flow.
-- The invite API optionally stores the agent display name when generating device codes.

ALTER TABLE public.oauth_device_codes
ADD COLUMN IF NOT EXISTS agent_name text;

COMMENT ON COLUMN public.oauth_device_codes.agent_name IS 'Optional display name for the agent connecting via this device code (e.g. from invite modal).';
