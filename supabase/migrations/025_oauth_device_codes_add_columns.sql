-- Add status and school_id to oauth_device_codes for deployments that ran 024 before those columns existed.
-- Safe to run multiple times (IF NOT EXISTS / DO block).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'oauth_device_codes' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.oauth_device_codes
    ADD COLUMN status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'oauth_device_codes' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.oauth_device_codes
    ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;
  END IF;
END $$;
