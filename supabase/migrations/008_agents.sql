-- ── Migration 008: Agents Table ──
-- Tracks registered external agents (OpenClaw, custom) per workspace.
-- Separate from agent_personas (which hold personality config).

CREATE TABLE IF NOT EXISTS public.agents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    TEXT UNIQUE NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'openclaw' CHECK (type IN ('openclaw', 'knobase_ai', 'custom')),
  version     TEXT DEFAULT '1.0.0',
  capabilities TEXT[] DEFAULT ARRAY[]::TEXT[],
  platform    TEXT,
  hostname    TEXT,
  is_active   BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agents_agent_id ON public.agents(agent_id);
CREATE INDEX idx_agents_workspace_id ON public.agents(workspace_id);
CREATE INDEX idx_agents_active ON public.agents(agent_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Workspace members can view agents
CREATE POLICY "Users can view agents in their workspaces"
  ON public.agents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = agents.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    )
  );

-- Workspace admins can manage agents
CREATE POLICY "Workspace admins can manage agents"
  ON public.agents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = agents.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = agents.workspace_id
        AND wm.user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
        AND wm.role = 'admin'
    )
  );

-- Service role has full access (for API routes)
CREATE POLICY "Service role full access on agents"
  ON public.agents FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime for agents table
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
