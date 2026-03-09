-- Migration 010: Mentions System for Schools
-- Adapts bidirectional mentions to schools-based multi-tenancy
-- 
-- Creates:
-- 1. mentions table - Tracks @mentions in documents
-- 2. Extends notifications table with mention support
-- 3. Triggers for auto-notification creation
--
-- Dependencies:
-- - schools table (exists)
-- - users table (exists)
-- - documents table (exists)
-- - agents table (exists)
-- - notifications table (exists - will be ALTERed)

-- ============================================
-- 1. CREATE mentions table
-- ============================================

CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document context
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  
  -- Location in document (for deep linking)
  block_id TEXT,
  content_offset INTEGER,
  
  -- Source (who created the mention)
  source_type TEXT NOT NULL CHECK (source_type IN ('human', 'agent')),
  source_id UUID NOT NULL,
  source_name TEXT,
  
  -- Target (who was mentioned)
  target_type TEXT NOT NULL CHECK (target_type IN ('human', 'agent')),
  target_id UUID NOT NULL,
  target_name TEXT NOT NULL,
  
  -- Mention content
  mention_text TEXT NOT NULL DEFAULT '@username',
  context_text TEXT,
  
  -- Resolution tracking
  resolution_status TEXT DEFAULT 'resolved' 
    CHECK (resolution_status IN ('pending', 'resolved', 'unknown')),
  
  -- For agent chaining (renamed from is_bot_generated via override below)
  is_bot_generated BOOLEAN DEFAULT false,
  parent_mention_id UUID REFERENCES public.mentions(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicates
  UNIQUE(document_id, target_id, mention_text, created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentions_document ON public.mentions(document_id);
CREATE INDEX IF NOT EXISTS idx_mentions_school ON public.mentions(school_id);
CREATE INDEX IF NOT EXISTS idx_mentions_source ON public.mentions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_mentions_target ON public.mentions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_mentions_agent_generated ON public.mentions(source_type) WHERE source_type = 'agent';
CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON public.mentions(created_at DESC);

-- ============================================
-- 2. ALTER notifications table (extend only)
-- ============================================

-- Add notification type (default to 'message' for existing)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'message' 
CHECK (type IN ('message', 'mention', 'task', 'system'));

-- Add document reference
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

-- Actor tracking (who triggered)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS actor_type TEXT DEFAULT 'human' 
CHECK (actor_type IN ('human', 'agent'));

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS actor_id UUID;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS actor_name TEXT;

-- Link back to mention
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS mention_id UUID;

-- Navigation link
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS link TEXT;

-- Context snippet around mention
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS context_snippet TEXT;

-- Updated timestamp for mentions
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- New indexes for notification features
CREATE INDEX IF NOT EXISTS idx_notifications_document ON public.notifications(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_type ON public.notifications(user_id, read, type) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_mention ON public.notifications(mention_id) WHERE mention_id IS NOT NULL;

-- ============================================
-- 3. Triggers and Functions
-- ============================================

-- Function to populate actor_name from users or agents
CREATE OR REPLACE FUNCTION public.populate_notification_actor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actor_type = 'human' THEN
    SELECT name INTO NEW.actor_name
    FROM public.users
    WHERE id = NEW.actor_id;
  ELSIF NEW.actor_type = 'agent' THEN
    SELECT name INTO NEW.actor_name
    FROM public.bots
    WHERE id = NEW.actor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_notification_actor ON public.notifications;
CREATE TRIGGER trg_populate_notification_actor
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.actor_name IS NULL AND NEW.actor_id IS NOT NULL)
  EXECUTE FUNCTION public.populate_notification_actor();

-- Function to auto-create notification when mention is inserted
-- NOTE: references is_bot_generated by its original name; the column is renamed
-- to is_agent_generated in the override section below, which then re-creates
-- this function using the new column name.
CREATE OR REPLACE FUNCTION public.create_notification_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id UUID;
  v_notification_content TEXT;
BEGIN
  -- Only create notification for human targets
  IF NEW.target_type = 'human' THEN
    v_target_user_id := NEW.target_id;
  ELSE
    -- For agent targets, they get notified differently (via task system)
    RETURN NEW;
  END IF;
  
  -- Build notification content
  IF NEW.is_bot_generated THEN
    v_notification_content := '🤖 ' || COALESCE(NEW.actor_name, NEW.source_name) || ' mentioned you';
  ELSE
    v_notification_content := COALESCE(NEW.actor_name, NEW.source_name) || ' mentioned you';
  END IF;
  
  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    school_id,
    type,
    document_id,
    mention_id,
    content,
    actor_type,
    actor_id,
    actor_name,
    context_snippet,
    link,
    read,
    created_at
  ) VALUES (
    v_target_user_id,
    NEW.school_id,
    'mention',
    NEW.document_id,
    NEW.id,
    v_notification_content,
    NEW.source_type,
    NEW.source_id,
    NEW.source_name,
    NEW.context_text,
    '/documents/' || NEW.document_id || '?mention=' || NEW.id,
    false,
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_notification_on_mention ON public.mentions;
CREATE TRIGGER trg_create_notification_on_mention
  AFTER INSERT ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_on_mention();

-- Auto-update notification updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 4. Comments for documentation
-- ============================================

COMMENT ON TABLE public.mentions IS 'Tracks @mentions in documents with bidirectional support for schools';
COMMENT ON COLUMN public.mentions.source_type IS 'human or agent - who created the mention';
COMMENT ON COLUMN public.mentions.target_type IS 'human or agent - who was mentioned';
-- Note: is_bot_generated is renamed to is_agent_generated in the override section below
COMMENT ON COLUMN public.mentions.resolution_status IS 'Whether the @username resolved to a valid human/agent';

COMMENT ON COLUMN public.notifications.type IS 'message | mention | task | system';
COMMENT ON COLUMN public.notifications.actor_type IS 'human or agent - who triggered this notification';
COMMENT ON COLUMN public.notifications.mention_id IS 'Links to mentions table when type=mention';

-- ============================================
-- 5. Override: align already-applied schema and data
--    Safe to re-run; all statements are idempotent
-- ============================================

-- Step 1: Rename is_bot_generated → is_agent_generated FIRST so that the
-- function recreation below can reference the new column name safely.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mentions' AND column_name = 'is_bot_generated') THEN
    ALTER TABLE public.mentions RENAME COLUMN is_bot_generated TO is_agent_generated;
  END IF;
END $$;

COMMENT ON COLUMN public.mentions.is_agent_generated IS 'True if an agent created this mention (e.g., @chris done)';

-- Step 2: Recreate the trigger function now that the column has the new name.
CREATE OR REPLACE FUNCTION public.create_notification_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id UUID;
  v_notification_content TEXT;
BEGIN
  IF NEW.target_type = 'human' THEN
    v_target_user_id := NEW.target_id;
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.is_agent_generated THEN
    v_notification_content := '🤖 ' || COALESCE(NEW.actor_name, NEW.source_name) || ' mentioned you';
  ELSE
    v_notification_content := COALESCE(NEW.actor_name, NEW.source_name) || ' mentioned you';
  END IF;

  INSERT INTO public.notifications (
    user_id, school_id, type, document_id, mention_id, content,
    actor_type, actor_id, actor_name, context_snippet, link, read, created_at
  ) VALUES (
    v_target_user_id, NEW.school_id, 'mention', NEW.document_id, NEW.id,
    v_notification_content, NEW.source_type, NEW.source_id, NEW.source_name,
    NEW.context_text, '/documents/' || NEW.document_id || '?mention=' || NEW.id,
    false, NEW.created_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Migrate existing type values
UPDATE public.mentions SET source_type = 'human' WHERE source_type = 'user';
UPDATE public.mentions SET source_type = 'agent' WHERE source_type = 'bot';
UPDATE public.mentions SET target_type = 'human' WHERE target_type = 'user';
UPDATE public.mentions SET target_type = 'agent' WHERE target_type = 'bot';
UPDATE public.notifications SET actor_type = 'human' WHERE actor_type = 'user';
UPDATE public.notifications SET actor_type = 'agent' WHERE actor_type = 'bot';

-- Step 4: Fix CHECK constraints
ALTER TABLE public.mentions DROP CONSTRAINT IF EXISTS mentions_source_type_check;
ALTER TABLE public.mentions ADD CONSTRAINT mentions_source_type_check
  CHECK (source_type IN ('human', 'agent'));

ALTER TABLE public.mentions DROP CONSTRAINT IF EXISTS mentions_target_type_check;
ALTER TABLE public.mentions ADD CONSTRAINT mentions_target_type_check
  CHECK (target_type IN ('human', 'agent'));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_actor_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_actor_type_check
  CHECK (actor_type IN ('human', 'agent'));
ALTER TABLE public.notifications ALTER COLUMN actor_type SET DEFAULT 'human';

-- Step 5: Recreate partial index with correct value
DROP INDEX IF EXISTS idx_mentions_bot_generated;
CREATE INDEX IF NOT EXISTS idx_mentions_agent_generated
  ON public.mentions(source_type) WHERE source_type = 'agent';
