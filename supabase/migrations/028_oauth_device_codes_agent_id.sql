-- Add agent_id to oauth_device_codes so the invite status polling endpoint
-- can return the connected agent's details after the device code flow completes.

ALTER TABLE public.oauth_device_codes
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.oauth_device_codes.agent_id IS 'The agent user ID once the device code flow completes successfully.';
