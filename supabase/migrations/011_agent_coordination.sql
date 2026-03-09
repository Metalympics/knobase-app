-- Migration 011: Agent Coordination System
-- Adapted for schools-based multi-tenancy
--
-- Creates tables for agent task management, live sessions, and edit proposals
-- Dependencies:
-- - schools table
-- - users table
-- - documents table
-- - agents table
-- - mentions table (from 010)

-- ============================================
-- 1. agent_tasks - Task queue for agents
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenancy
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  
  -- Task classification
  task_type TEXT NOT NULL CHECK (task_type IN ('mention', 'queued', 'scheduled', 'background')),
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'acknowledged', 'working', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  
  -- Agent assignment
  bot_id UUID NOT NULL REFERENCES public.bots(id),
  
  -- Context
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT,
  target_context JSONB DEFAULT '{}',
  
  -- Assignment tracking
  assigned_by UUID REFERENCES public.users(id),
  assigned_by_type TEXT DEFAULT 'human' CHECK (assigned_by_type IN ('human', 'agent', 'system')),
  
  -- Source mention (if triggered by @mention)
  source_mention_id UUID REFERENCES public.mentions(id) ON DELETE SET NULL,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  
  -- Progress
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  current_action TEXT,
  
  -- Results
  result_summary TEXT,
  result_blocks UUID[],
  error_message TEXT,
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Visibility
  visibility TEXT DEFAULT 'collaborators' 
    CHECK (visibility IN ('private', 'collaborators', 'public'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_tasks_school ON public.agent_tasks(school_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_bot ON public.agent_tasks(bot_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_document ON public.agent_tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_assigned_by ON public.agent_tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON public.agent_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending ON public.agent_tasks(school_id, status) WHERE status IN ('pending', 'acknowledged', 'working');

-- ============================================
-- 2. agent_sessions - Live agent presence
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Agent identity
  bot_id UUID NOT NULL REFERENCES public.bots(id),
  bot_name TEXT NOT NULL,
  bot_avatar TEXT DEFAULT '🤖',
  bot_color TEXT DEFAULT '#8B5CF6',
  
  -- Context
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  
  -- Current task
  current_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'reading', 'thinking', 'editing', 'waiting')),
  current_section TEXT,
  current_block_id TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes'),
  
  -- Followers (humans watching this agent)
  followed_by UUID[] DEFAULT '{}',
  
  -- Unique constraint: one session per agent per document
  UNIQUE(bot_id, document_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_sessions_bot ON public.agent_sessions(bot_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_document ON public.agent_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_school ON public.agent_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON public.agent_sessions(status) WHERE status != 'idle';
CREATE INDEX IF NOT EXISTS idx_agent_sessions_expires ON public.agent_sessions(expires_at);

-- ============================================
-- 3. agent_edit_proposals - Structured edit suggestions
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_edit_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  task_id UUID NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  
  -- Location
  block_id TEXT,
  
  -- Edit details
  edit_type TEXT NOT NULL CHECK (edit_type IN ('insert', 'replace', 'delete', 'append', 'prepend', 'transform')),
  original_content JSONB,
  proposed_content JSONB NOT NULL,
  explanation TEXT,
  surrounding_context TEXT,
  
  -- Review state
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'modified', 'superseded')),
  decided_by UUID REFERENCES public.users(id),
  decided_at TIMESTAMPTZ,
  modified_content JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_edit_proposals_task ON public.agent_edit_proposals(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_edit_proposals_document ON public.agent_edit_proposals(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_edit_proposals_school ON public.agent_edit_proposals(school_id);
CREATE INDEX IF NOT EXISTS idx_agent_edit_proposals_status ON public.agent_edit_proposals(status);
CREATE INDEX IF NOT EXISTS idx_agent_edit_proposals_pending ON public.agent_edit_proposals(status) WHERE status = 'pending';

-- ============================================
-- 4. Foreign Keys that reference mentions
-- ============================================

ALTER TABLE public.agent_tasks
  DROP CONSTRAINT IF EXISTS fk_agent_tasks_source_mention;
ALTER TABLE public.agent_tasks
  ADD CONSTRAINT fk_agent_tasks_source_mention 
  FOREIGN KEY (source_mention_id) REFERENCES public.mentions(id) ON DELETE SET NULL;

-- ============================================
-- 5. Triggers for notifications
-- ============================================

-- Notify on task completion
CREATE OR REPLACE FUNCTION public.notify_on_task_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_school_id UUID;
  v_document_id UUID;
BEGIN
  -- Only process when task transitions to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get context
    SELECT school_id, document_id INTO v_school_id, v_document_id
    FROM public.agent_tasks
    WHERE id = NEW.id;
    
    -- Notify the assigner
    IF NEW.assigned_by IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        school_id,
        type,
        document_id,
        content,
        link,
        created_at
      ) VALUES (
        NEW.assigned_by,
        v_school_id,
        'task',
        v_document_id,
        'Task complete: ' || NEW.title,
        '/documents/' || v_document_id || '?task=' || NEW.id,
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_on_task_complete ON public.agent_tasks;
CREATE TRIGGER trg_notify_on_task_complete
  AFTER UPDATE OF status ON public.agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_complete();

-- ============================================
-- 6. Enable Realtime for agent tables
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_edit_proposals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_edit_proposals;
  END IF;
END $$;

-- ============================================
-- 7. Comments
-- ============================================

COMMENT ON TABLE public.agent_tasks IS 'Task queue for agent execution within schools';
COMMENT ON TABLE public.agent_sessions IS 'Live presence tracking for active agent sessions';
COMMENT ON TABLE public.agent_edit_proposals IS 'Structured edit proposals awaiting human approval';

-- ============================================
-- 8. Override: align already-applied schema and data
--    Safe to re-run; all statements are idempotent
-- ============================================

-- Migrate existing data values
UPDATE public.agent_tasks SET assigned_by_type = 'human' WHERE assigned_by_type = 'user';
UPDATE public.agent_tasks SET assigned_by_type = 'agent' WHERE assigned_by_type = 'bot';

-- Fix agent_tasks.assigned_by_type CHECK constraint and default
ALTER TABLE public.agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_assigned_by_type_check;
ALTER TABLE public.agent_tasks ADD CONSTRAINT agent_tasks_assigned_by_type_check
  CHECK (assigned_by_type IN ('human', 'agent', 'system'));
ALTER TABLE public.agent_tasks ALTER COLUMN assigned_by_type SET DEFAULT 'human';
