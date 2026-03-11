-- Migration 021: Re-point foreign keys from documents → pages
-- and create page_permissions / page_public_links / page_blocks tables.
--
-- Tables affected (all have 0 rows on live DB):
--   agent_tasks, agent_sessions, agent_edit_proposals, mentions, notifications
--
-- New tables:
--   page_permissions, page_public_links, page_blocks

-- ============================================
-- 1. Fix FK constraints: document_id → pages(id)
-- ============================================

-- mentions
ALTER TABLE public.mentions DROP CONSTRAINT IF EXISTS mentions_document_id_fkey;
ALTER TABLE public.mentions
  ADD CONSTRAINT mentions_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.pages(id) ON DELETE CASCADE;

-- agent_tasks
ALTER TABLE public.agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_document_id_fkey;
ALTER TABLE public.agent_tasks
  ADD CONSTRAINT agent_tasks_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.pages(id) ON DELETE CASCADE;

-- agent_sessions
ALTER TABLE public.agent_sessions DROP CONSTRAINT IF EXISTS agent_sessions_document_id_fkey;
ALTER TABLE public.agent_sessions
  ADD CONSTRAINT agent_sessions_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.pages(id) ON DELETE SET NULL;

-- agent_edit_proposals
ALTER TABLE public.agent_edit_proposals DROP CONSTRAINT IF EXISTS agent_edit_proposals_document_id_fkey;
ALTER TABLE public.agent_edit_proposals
  ADD CONSTRAINT agent_edit_proposals_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.pages(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_document_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.pages(id) ON DELETE CASCADE;

-- ============================================
-- 2. Create page_permissions
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('full', 'edit', 'comment', 'view')),
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_page_permissions_page ON public.page_permissions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_permissions_user ON public.page_permissions(user_id);

-- ============================================
-- 3. Create page_public_links
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit')),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id)
);

CREATE INDEX IF NOT EXISTS idx_page_public_links_token ON public.page_public_links(access_token);
CREATE INDEX IF NOT EXISTS idx_page_public_links_page ON public.page_public_links(page_id);

-- ============================================
-- 4. Create page_blocks
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN (
    'paragraph', 'heading', 'code', 'list', 'quote',
    'table', 'image', 'callout', 'agent_output'
  )),
  content JSONB NOT NULL DEFAULT '{}',
  markdown TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  yjs_id TEXT,
  created_by UUID REFERENCES public.users(id),
  created_by_type TEXT NOT NULL DEFAULT 'user' CHECK (created_by_type IN ('user', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by UUID REFERENCES public.users(id),
  modified_by_type TEXT NOT NULL DEFAULT 'user',
  modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(page_id, block_id)
);

CREATE INDEX IF NOT EXISTS idx_page_blocks_page ON public.page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_page_blocks_block ON public.page_blocks(block_id);

-- ============================================
-- 5. Helper functions (query pages, not documents)
-- ============================================

CREATE OR REPLACE FUNCTION can_access_page(p_page_id UUID, p_user_auth_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pages p
    WHERE p.id = p_page_id
    AND (
      p.created_by = p_user_auth_id
      OR p.visibility = 'public'
      OR (p.visibility IN ('shared', 'public') AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = p_user_auth_id AND u.school_id = p.school_id
      ))
      OR EXISTS (
        SELECT 1 FROM page_permissions pp
        JOIN users u ON u.id = pp.user_id
        WHERE pp.page_id = p_page_id AND u.auth_id = p_user_auth_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_page_permission(p_page_id UUID, p_user_auth_id UUID)
RETURNS TEXT AS $$
DECLARE
  is_owner BOOLEAN;
  explicit_perm TEXT;
  vis TEXT;
BEGIN
  SELECT (created_by = p_user_auth_id) INTO is_owner
  FROM pages WHERE id = p_page_id;
  IF is_owner THEN RETURN 'full'; END IF;

  SELECT pp.permission INTO explicit_perm
  FROM page_permissions pp JOIN users u ON u.id = pp.user_id
  WHERE pp.page_id = p_page_id AND u.auth_id = p_user_auth_id LIMIT 1;
  IF explicit_perm IS NOT NULL THEN RETURN explicit_perm; END IF;

  SELECT visibility INTO vis FROM pages WHERE id = p_page_id;

  IF vis = 'public' THEN
    SELECT permission INTO explicit_perm FROM page_public_links
    WHERE page_id = p_page_id AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1;
    RETURN COALESCE(explicit_perm, 'view');
  END IF;

  IF vis = 'shared' THEN
    IF EXISTS (
      SELECT 1 FROM users u JOIN pages p ON p.school_id = u.school_id
      WHERE p.id = p_page_id AND u.auth_id = p_user_auth_id
    ) THEN RETURN 'edit'; END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
