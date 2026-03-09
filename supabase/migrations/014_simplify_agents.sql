-- Migration 014: Simplify Agent Schema (FIXED)
-- Remove separate agents table, use users.type='agent' instead
-- Note: user_type enum values 'human'/'agent' were committed in migration 013.
-- Partial indexes on users.type are created here (not in 013) because
-- PostgreSQL does not allow index predicates involving a cast of an enum type
-- that was altered in the same transaction.

-- ============================================
-- 1. Partial indexes deferred from migration 013
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_school_agents
  ON public.users(school_id)
  WHERE type = 'agent';

CREATE INDEX IF NOT EXISTS idx_users_school_humans
  ON public.users(school_id)
  WHERE type = 'human';

CREATE INDEX IF NOT EXISTS idx_users_capabilities
  ON public.users USING GIN (capabilities)
  WHERE type = 'agent';

CREATE INDEX IF NOT EXISTS idx_users_expertise
  ON public.users USING GIN (expertise)
  WHERE type = 'agent';

CREATE INDEX IF NOT EXISTS idx_users_description_search
  ON public.users USING GIN (to_tsvector('english', COALESCE(description, '')))
  WHERE type = 'agent';

-- ============================================
-- 2. Add agent-specific fields to users table
-- ============================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS expertise TEXT[] DEFAULT '{}';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'online' 
  CHECK (availability IN ('online', 'busy', 'offline'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS agent_type TEXT 
  CHECK (agent_type IN ('openclaw', 'knobase_ai', 'custom'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS model TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bot_id TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(id);

-- FIXED: Removed WHERE clauses from ALTER TABLE
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS total_invocations INTEGER DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_invoked_at TIMESTAMPTZ;

-- 3. View for workspace members (humans + agents combined)
CREATE OR REPLACE VIEW public.workspace_members AS
SELECT 
  id,
  type,
  name,
  avatar_url,
  description,
  capabilities,
  expertise,
  availability,
  school_id,
  CASE 
    WHEN type = 'agent' THEN jsonb_build_object(
      'bot_id', bot_id,
      'model', model,
      'system_prompt', system_prompt,
      'total_invocations', total_invocations,
      'last_invoked_at', last_invoked_at,
      'owner_id', owner_id
    )
    ELSE NULL
  END as agent_data
FROM public.users
WHERE type IN ('human', 'agent')
  AND is_deleted = false
  AND is_suspended = false;

-- 4. Function to find collaborators by capability
-- Drop all existing overloads first to avoid ambiguity
DROP FUNCTION IF EXISTS public.find_collaborators(UUID, TEXT, TEXT[], TEXT, BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS public.find_collaborators(UUID, TEXT, TEXT[], TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.find_collaborators(
  p_school_id UUID,
  p_query TEXT DEFAULT NULL,
  p_capabilities TEXT[] DEFAULT NULL,
  p_type TEXT DEFAULT 'all', -- 'human', 'agent', or 'all'
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  name TEXT,
  avatar_url TEXT,
  description TEXT,
  capabilities TEXT[],
  expertise TEXT[],
  availability TEXT,
  relevance_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.type::TEXT,
    u.name,
    u.avatar_url,
    u.description,
    u.capabilities,
    u.expertise,
    u.availability,
    CASE 
      WHEN p_capabilities IS NOT NULL AND u.capabilities && p_capabilities THEN 1.0
      WHEN p_query IS NOT NULL AND u.description ILIKE '%' || p_query || '%' THEN 0.8
      WHEN p_query IS NOT NULL AND u.name ILIKE '%' || p_query || '%' THEN 0.6
      ELSE 0.5
    END +
    CASE u.availability
      WHEN 'online' THEN 0.2
      WHEN 'busy' THEN 0.1
      ELSE 0.0
    END as relevance_score
  FROM public.users u
  WHERE u.school_id = p_school_id
    AND (p_type = 'all' OR u.type::TEXT = p_type)
    AND u.is_deleted = false
    AND u.is_suspended = false
  ORDER BY relevance_score DESC, u.last_invoked_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON VIEW public.workspace_members IS 'Unified view of all workspace members (humans and agents)';
COMMENT ON FUNCTION public.find_collaborators(UUID, TEXT, TEXT[], TEXT, INTEGER) IS 'Find collaborators by capability, expertise, or name';
