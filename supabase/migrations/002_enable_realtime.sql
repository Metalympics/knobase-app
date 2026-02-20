-- ⚠️  DO NOT RUN THIS AUTOMATICALLY ⚠️
-- This migration file is provided for REFERENCE ONLY.
-- Run manually via the Supabase SQL Editor when ready.
--
-- Enables Supabase Realtime for the documents table.
-- This allows broadcast channels for Y.js collaboration.
-- Note: Broadcast channels (used by our Y.js provider) work
-- without this — but this enables Postgres Changes if needed later.

ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
