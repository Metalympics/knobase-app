-- ⚠️  DO NOT RUN THIS AUTOMATICALLY ⚠️
-- This migration file is provided for REFERENCE ONLY.
-- Run manually via the Supabase SQL Editor when ready.
--
-- Creates the agent coordination layer for OpenClaw + Knobase collaboration.
-- Depends on: 003_multi_tenant_auth.sql (users, workspaces, workspace_members, documents)
--
-- Architecture context:
--   - Each workspace belongs to a school (school_id on the production schema).
--   - Each public.users row belongs to a school; one auth.users ↔ many public.users rows.
--   - The workspace_id columns below reference public.workspaces(id).
--     At deployment, ensure the FK target matches your production schema
--     (e.g. knowledges.id if workspaces are modelled as knowledges).
--   - Documents serve as pages; a workspace/knowledge is a collection of documents.

-- ============================================
-- Helper: ensure set_updated_at() function exists
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. AGENT PERSONAS (extended for coordination)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_personas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  agent_id             TEXT NOT NULL UNIQUE, -- 'claw', 'researcher', 'coder', etc.
  name                 TEXT NOT NULL,
  role                 TEXT NOT NULL,

  -- Visual
  avatar               TEXT DEFAULT '🤖',
  color                TEXT DEFAULT '#8B5CF6',

  -- Personality
  tone                 TEXT DEFAULT 'professional',
  voice_description    TEXT,
  expertise            TEXT[] DEFAULT '{}',

  -- System prompt components
  instructions         TEXT,
  constraints          TEXT[] DEFAULT '{}',

  -- Learning / Context
  learned_preferences  JSONB DEFAULT '{}'::jsonb,
  common_patterns      JSONB DEFAULT '{}'::jsonb,

  -- Ownership
  workspace_id         UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by           UUID REFERENCES public.users(id),
  is_default           BOOLEAN DEFAULT false,
  is_shared            BOOLEAN DEFAULT false,

  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  last_used_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_personas_agent_id ON public.agent_personas(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_personas_workspace_id ON public.agent_personas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_personas_is_default ON public.agent_personas(is_default);

CREATE TRIGGER agent_personas_updated_at
  BEFORE UPDATE ON public.agent_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2. AGENT TASK QUEUE (Central Coordination)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task identification
  task_type          TEXT NOT NULL CHECK (task_type IN ('mention', 'queued', 'scheduled', 'background')),
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'acknowledged', 'working', 'completed', 'failed', 'cancelled')),
  priority           INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest

  -- Agent assignment
  agent_id           TEXT NOT NULL DEFAULT 'claw',
  agent_persona_id   UUID REFERENCES public.agent_personas(id) ON DELETE SET NULL,

  -- Document & workspace context
  document_id        UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  workspace_id       UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Task details
  title              TEXT NOT NULL,
  description        TEXT,
  prompt             TEXT NOT NULL,

  -- Target location (where to make edits)
  target_context     JSONB DEFAULT '{}'::jsonb,
  -- e.g. {type: 'mention', block_id: '...', yjs_position: 157, selection: {from, to, text}}

  -- Source
  created_by         UUID REFERENCES public.users(id),
  created_by_type    TEXT DEFAULT 'user' CHECK (created_by_type IN ('user', 'agent', 'system')),
  source_mention_id  UUID,  -- FK added after mentions table is created

  -- Timing
  created_at         TIMESTAMPTZ DEFAULT now(),
  acknowledged_at    TIMESTAMPTZ,
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  due_date           TIMESTAMPTZ,

  -- Progress
  progress_percent   INTEGER DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  current_action     TEXT, -- 'researching', 'writing', 'reviewing', etc.

  -- Result
  result_summary     TEXT,
  result_blocks      UUID[], -- IDs of document_blocks created / modified

  -- Error handling
  error_message      TEXT,
  retry_count        INTEGER DEFAULT 0,
  max_retries        INTEGER DEFAULT 3,

  -- Visibility
  visibility         TEXT DEFAULT 'collaborators'
                     CHECK (visibility IN ('private', 'collaborators', 'public'))
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id ON public.agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_document_id ON public.agent_tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace_id ON public.agent_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_by ON public.agent_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON public.agent_tasks(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending ON public.agent_tasks(agent_id, status, priority, created_at)
  WHERE status IN ('pending', 'acknowledged');

-- ============================================
-- 3. MENTIONS (@claw in documents)
-- ============================================
CREATE TABLE IF NOT EXISTS public.mentions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location in document
  document_id       UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  block_id          TEXT,
  yjs_position      INTEGER,

  -- Target
  target_type       TEXT NOT NULL CHECK (target_type IN ('agent', 'user')),
  target_id         TEXT NOT NULL,
  target_name       TEXT NOT NULL,

  -- Content
  mention_text      TEXT NOT NULL,
  context_before    TEXT,
  context_after     TEXT,
  prompt            TEXT,

  -- Creator
  created_by        UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ DEFAULT now(),

  -- Resolution
  status            TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'acknowledged', 'completed', 'dismissed')),
  resolved_by       UUID REFERENCES public.users(id),
  resolved_at       TIMESTAMPTZ,

  -- Link to task
  linked_task_id    UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,

  -- Notification tracking
  notified_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mentions_document_id ON public.mentions(document_id);
CREATE INDEX IF NOT EXISTS idx_mentions_target_id ON public.mentions(target_id);
CREATE INDEX IF NOT EXISTS idx_mentions_status ON public.mentions(status);
CREATE INDEX IF NOT EXISTS idx_mentions_created_by ON public.mentions(created_by);

-- Now add the FK from agent_tasks.source_mention_id → mentions.id
ALTER TABLE public.agent_tasks
  ADD CONSTRAINT fk_agent_tasks_source_mention
  FOREIGN KEY (source_mention_id) REFERENCES public.mentions(id) ON DELETE SET NULL;

-- ============================================
-- 4. AGENT WORK SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agent_id          TEXT NOT NULL,
  agent_name        TEXT NOT NULL,
  agent_avatar      TEXT,
  agent_color       TEXT DEFAULT '#8B5CF6',

  -- Current location
  document_id       UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  workspace_id      UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,

  -- What the agent is doing
  current_task_id   UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  status            TEXT DEFAULT 'idle'
                    CHECK (status IN ('idle', 'reading', 'thinking', 'editing', 'waiting')),

  -- Position (semantic, not literal cursor)
  current_section   TEXT,      -- 'Introduction', 'Section 2', etc.
  current_block_id  TEXT,

  -- Session metadata
  started_at        TIMESTAMPTZ DEFAULT now(),
  last_activity_at  TIMESTAMPTZ DEFAULT now(),
  expires_at        TIMESTAMPTZ DEFAULT (now() + interval '5 minutes'),

  -- Follow mode
  followed_by       UUID[] DEFAULT '{}',

  -- One session per agent per document
  UNIQUE(agent_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id ON public.agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_document_id ON public.agent_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON public.agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_workspace ON public.agent_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_expires ON public.agent_sessions(expires_at);

-- ============================================
-- 5. DOCUMENT BLOCKS (granular edit targets)
-- ============================================
CREATE TABLE IF NOT EXISTS public.document_blocks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id        UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  block_id           TEXT NOT NULL,
  block_type         TEXT NOT NULL CHECK (block_type IN (
    'paragraph', 'heading', 'code', 'list', 'quote',
    'table', 'image', 'callout', 'agent_output'
  )),

  -- Content
  content            JSONB NOT NULL,
  markdown           TEXT,

  -- Position
  order_index        INTEGER NOT NULL,
  yjs_id             TEXT,

  -- Attribution
  created_by         UUID REFERENCES public.users(id),
  created_by_type    TEXT DEFAULT 'user' CHECK (created_by_type IN ('user', 'agent')),
  created_at         TIMESTAMPTZ DEFAULT now(),

  modified_by        UUID REFERENCES public.users(id),
  modified_by_type   TEXT DEFAULT 'user',
  modified_at        TIMESTAMPTZ DEFAULT now(),

  -- Agent attribution
  created_by_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,

  -- Versioning
  version            INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_document_blocks_document_id ON public.document_blocks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_blocks_block_id ON public.document_blocks(block_id);
CREATE INDEX IF NOT EXISTS idx_document_blocks_order ON public.document_blocks(document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_document_blocks_created_by_type ON public.document_blocks(created_by_type);

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target recipient
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Event type
  type              TEXT NOT NULL CHECK (type IN (
    'mention', 'task_assigned', 'task_completed', 'agent_busy',
    'agent_waiting', 'collaborator_joined', 'document_shared'
  )),

  -- Source
  source_id         TEXT,
  source_name       TEXT,
  source_avatar     TEXT,

  -- Content
  title             TEXT NOT NULL,
  message           TEXT,

  -- Links
  document_id       UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  workspace_id      UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  task_id           UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  mention_id        UUID REFERENCES public.mentions(id) ON DELETE SET NULL,

  -- State
  is_read           BOOLEAN DEFAULT false,
  read_at           TIMESTAMPTZ,

  -- Action
  action_url        TEXT,
  action_text       TEXT DEFAULT 'View',

  created_at        TIMESTAMPTZ DEFAULT now(),
  expires_at        TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_user_id ON public.agent_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_unread ON public.agent_notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_agent_notifications_created_at ON public.agent_notifications(created_at DESC);

-- ============================================
-- 7. AGENT EDIT PROPOSALS (structured edits)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_edit_proposals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,

  -- Target
  document_id         UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  block_id            TEXT,

  -- Edit type
  edit_type           TEXT NOT NULL CHECK (edit_type IN (
    'insert', 'replace', 'delete', 'append', 'prepend', 'transform'
  )),

  -- The edit
  original_content    JSONB,
  proposed_content    JSONB NOT NULL,
  explanation         TEXT,

  -- Context for verification
  surrounding_context TEXT,

  -- Status
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'rejected', 'modified', 'superseded')),

  -- Resolution
  decided_by          UUID REFERENCES public.users(id),
  decided_at          TIMESTAMPTZ,
  modified_content    JSONB,

  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edit_proposals_task_id ON public.agent_edit_proposals(task_id);
CREATE INDEX IF NOT EXISTS idx_edit_proposals_document_id ON public.agent_edit_proposals(document_id);
CREATE INDEX IF NOT EXISTS idx_edit_proposals_status ON public.agent_edit_proposals(status);
CREATE INDEX IF NOT EXISTS idx_edit_proposals_pending ON public.agent_edit_proposals(document_id, status)
  WHERE status = 'pending';

-- ============================================
-- TRIGGER: Auto-create notification on mention insert
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_on_mention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_type = 'user' THEN
    -- Notify the mentioned user
    INSERT INTO public.agent_notifications (
      user_id, type, source_id, source_name, title, message,
      document_id, mention_id
    )
    SELECT
      u.id,
      'mention',
      NEW.created_by::text,
      (SELECT display_name FROM public.users WHERE id = NEW.created_by),
      'You were mentioned',
      NEW.prompt,
      NEW.document_id,
      NEW.id
    FROM public.users u
    WHERE u.id::text = NEW.target_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_on_mention
  AFTER INSERT ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_mention();

-- ============================================
-- TRIGGER: Auto-notify on task completion
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_on_task_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.agent_notifications (
      user_id, type, source_id, source_name, title, message,
      document_id, workspace_id, task_id
    )
    VALUES (
      NEW.created_by,
      'task_completed',
      NEW.agent_id,
      (SELECT name FROM public.agent_personas WHERE agent_id = NEW.agent_id LIMIT 1),
      'Task completed: ' || NEW.title,
      COALESCE(NEW.result_summary, 'Task has been completed.'),
      NEW.document_id,
      NEW.workspace_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_on_task_complete
  AFTER UPDATE ON public.agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_complete();

-- ============================================
-- ENABLE REALTIME for coordination tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_edit_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_notifications;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_edit_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_personas ENABLE ROW LEVEL SECURITY;

-- agent_tasks: workspace members can read
CREATE POLICY "Workspace members can view tasks"
  ON public.agent_tasks FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = agent_tasks.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Users can create tasks in their workspaces"
  ON public.agent_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = agent_tasks.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Task creators can cancel their tasks"
  ON public.agent_tasks FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- Service role can do anything with tasks (for agent operations)
CREATE POLICY "Service role full access to tasks"
  ON public.agent_tasks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- mentions: workspace members can read via document access
CREATE POLICY "Document collaborators can view mentions"
  ON public.mentions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = mentions.document_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Document editors can create mentions"
  ON public.mentions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = mentions.document_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Service role full access to mentions"
  ON public.mentions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- agent_sessions: public read (see where agents are working)
CREATE POLICY "Anyone authenticated can view agent sessions"
  ON public.agent_sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages agent sessions"
  ON public.agent_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- document_blocks: same access as the document
CREATE POLICY "Document collaborators can view blocks"
  ON public.document_blocks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = document_blocks.document_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Service role full access to blocks"
  ON public.document_blocks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- notifications: users see only their own
CREATE POLICY "Users can view their own notifications"
  ON public.agent_notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can update their own notifications"
  ON public.agent_notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Service role full access to notifications"
  ON public.agent_notifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- edit_proposals: document collaborators can view + decide
CREATE POLICY "Document collaborators can view edit proposals"
  ON public.agent_edit_proposals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = agent_edit_proposals.document_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Document editors can decide on proposals"
  ON public.agent_edit_proposals FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = agent_edit_proposals.document_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = agent_edit_proposals.document_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Service role full access to edit proposals"
  ON public.agent_edit_proposals FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- agent_personas: workspace members can view
CREATE POLICY "Workspace members can view personas"
  ON public.agent_personas FOR SELECT TO authenticated
  USING (
    is_shared = true
    OR created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = agent_personas.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Users can create personas in their workspaces"
  ON public.agent_personas FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Persona owners can update"
  ON public.agent_personas FOR UPDATE TO authenticated
  USING (created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1))
  WITH CHECK (created_by = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

CREATE POLICY "Service role full access to personas"
  ON public.agent_personas FOR ALL TO service_role
  USING (true) WITH CHECK (true);
