-- OAuth 2.0 Device Authorization Grant (RFC 8628)
-- Stores pending device authorization requests so the CLI can poll
-- while the user authorises in the browser.

CREATE TABLE IF NOT EXISTS public.oauth_device_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code varchar NOT NULL,
  user_code varchar NOT NULL,
  client_id varchar NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  scope text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  interval integer NOT NULL DEFAULT 5,
  last_polled_at timestamptz,
  access_token text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_oauth_device_codes_device_code UNIQUE (device_code),
  CONSTRAINT uq_oauth_device_codes_user_code UNIQUE (user_code)
);

CREATE INDEX IF NOT EXISTS idx_oauth_device_codes_device_code
  ON public.oauth_device_codes (device_code);
CREATE INDEX IF NOT EXISTS idx_oauth_device_codes_user_code
  ON public.oauth_device_codes (user_code);
CREATE INDEX IF NOT EXISTS idx_oauth_device_codes_expires_at
  ON public.oauth_device_codes (expires_at);
