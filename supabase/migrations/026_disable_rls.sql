-- Disable RLS on all tables that have it enabled.
-- RLS can be re-enabled later when policies are properly configured.

ALTER TABLE public.ai_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_device_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_integrations DISABLE ROW LEVEL SECURITY;
