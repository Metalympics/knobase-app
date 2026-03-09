-- Migration 013: Agent Discovery System (FIXED for Schools Schema)
-- Uses users table with type='agent' alongside human users
-- Uses schools table instead of workspaces
--
-- Dependencies:
-- - users table (with type column enum: user_type)
-- - schools table (replaces workspaces)
-- - agent_tasks table (from 011)
-- - documents table
--
-- NOTE ON ENUM SAFETY:
-- 'human' and 'agent' are added to the user_type enum here. PostgreSQL
-- prevents using newly-added enum VALUES as literals in the SAME transaction
-- (error 55P04). All comparisons within this file therefore cast the column
-- to TEXT (e.g. type::text = 'agent') to avoid that restriction.
-- Migration 014 and beyond can use the plain enum literals freely because
-- this migration will have committed by then.

-- ============================================
-- 1. Extend user_type enum
-- ============================================

ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'human';
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'agent';

-- ============================================
-- 2. Extend users table for agent discovery
-- ============================================

-- Add type column if not exists (should already exist, but safe to check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'type') THEN
    ALTER TABLE public.users 
    ADD COLUMN type public.user_type DEFAULT 'human';
  END IF;
END $$;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expertise TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'online'
  CHECK (availability IN ('online', 'busy', 'offline'));

-- Agent-specific fields (only meaningful for type='agent')
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_model TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_provider TEXT DEFAULT 'knobase';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_invocations INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS successful_invocations INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avg_response_time_ms INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- ============================================
-- 3. Create indexes for discovery queries
--    Partial indexes (WHERE type = ...) cannot be created in the same
--    transaction as ALTER TYPE ADD VALUE — they are added in migration 014
--    once this transaction has committed.
-- ============================================

-- Non-partial indexes are safe here
CREATE INDEX IF NOT EXISTS idx_users_type ON public.users(type);
CREATE INDEX IF NOT EXISTS idx_users_availability ON public.users(availability)
  WHERE availability = 'online';

-- ============================================
-- 4. Create unified school members view
-- ============================================

CREATE OR REPLACE VIEW public.school_members AS
SELECT 
  u.id as member_id,
  u.type as member_type,
  u.name,
  u.avatar_url,
  u.email,
  u.description,
  u.capabilities,
  u.expertise,
  u.availability,
  u.last_active_at,
  u.school_id,
  u.created_at,
  u.agent_model,
  u.agent_provider,
  u.system_prompt,
  u.total_invocations,
  u.successful_invocations,
  u.avg_response_time_ms,
  CASE 
    WHEN u.type::text = 'agent' AND u.total_invocations > 0 
    THEN (u.successful_invocations::DECIMAL / u.total_invocations) * 100
    ELSE NULL
  END as success_rate,
  owner.name as owner_name,
  owner.email as owner_email
FROM public.users u
LEFT JOIN public.users owner ON owner.id = u.owner_id
WHERE u.type::text IN ('human', 'agent')
  AND u.is_deleted = false 
  AND u.is_suspended = false;

-- ============================================
-- 5. Create search function for collaborators
-- ============================================

CREATE OR REPLACE FUNCTION public.find_collaborators(
  p_school_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_capabilities TEXT[] DEFAULT NULL,
  p_type TEXT DEFAULT 'all', -- 'human', 'agent', or 'all'
  p_available_only BOOLEAN DEFAULT false,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  member_id UUID,
  member_type TEXT,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  description TEXT,
  capabilities TEXT[],
  expertise TEXT[],
  availability TEXT,
  total_invocations INTEGER,
  relevance_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as member_id,
    u.type::TEXT as member_type,
    u.name,
    u.email,
    u.avatar_url,
    u.description,
    u.capabilities,
    u.expertise,
    u.availability,
    u.total_invocations,
    (
      CASE 
        WHEN p_capabilities IS NOT NULL AND u.capabilities && p_capabilities THEN 1.0
        ELSE 0.0
      END +
      CASE 
        WHEN p_search_query IS NOT NULL AND u.description ILIKE '%' || p_search_query || '%' THEN 0.5
        ELSE 0.0
      END +
      CASE 
        WHEN p_search_query IS NOT NULL AND u.name ILIKE '%' || p_search_query || '%' THEN 0.3
        ELSE 0.0
      END +
      CASE 
        WHEN p_search_query IS NOT NULL
             AND u.expertise && string_to_array(lower(p_search_query), ' ')
        THEN 0.4
        ELSE 0.0
      END
    )::FLOAT as relevance_score

  FROM public.users u
  WHERE 
    u.school_id = p_school_id
    AND (p_type = 'all' OR u.type::TEXT = p_type)
    AND u.is_deleted = false
    AND u.is_suspended = false
    AND (NOT p_available_only OR u.availability = 'online')
    AND (
      p_search_query IS NULL
      OR u.description ILIKE '%' || p_search_query || '%'
      OR u.name ILIKE '%' || p_search_query || '%'
      OR u.capabilities && string_to_array(lower(p_search_query), ' ')
    )
  ORDER BY 
    relevance_score DESC,
    u.availability = 'online' DESC,
    u.total_invocations DESC NULLS LAST,
    u.last_active_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Create function to update agent invocation stats
-- ============================================

CREATE OR REPLACE FUNCTION public.update_agent_invocation_stats(
  p_agent_id UUID,
  p_success BOOLEAN,
  p_response_time_ms INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET 
    total_invocations = COALESCE(total_invocations, 0) + 1,
    successful_invocations = CASE 
      WHEN p_success THEN COALESCE(successful_invocations, 0) + 1 
      ELSE COALESCE(successful_invocations, 0)
    END,
    avg_response_time_ms = CASE
      WHEN avg_response_time_ms IS NULL THEN p_response_time_ms
      ELSE ((COALESCE(avg_response_time_ms, 0) * COALESCE(total_invocations, 0)) + p_response_time_ms) / (COALESCE(total_invocations, 0) + 1)
    END,
    last_active_at = now()
  WHERE id = p_agent_id AND type::text = 'agent';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Create trigger to update user activity
-- ============================================

CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_active_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_activity_on_document ON public.documents;
CREATE TRIGGER trg_update_user_activity_on_document
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_activity();

-- ============================================
-- 8. Seed example agent descriptions (optional)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE type::text = 'agent' AND description IS NULL) THEN
    UPDATE public.users
    SET description = 
      CASE 
        WHEN name ILIKE '%data%' OR name ILIKE '%analyst%' THEN 
          'Specializes in data analysis, SQL queries, statistical modeling, and creating insightful visualizations'
        WHEN name ILIKE '%writer%' OR name ILIKE '%content%' THEN
          'Expert in content creation, copywriting, blog posts, and technical documentation'
        WHEN name ILIKE '%code%' OR name ILIKE '%developer%' THEN
          'Software development specialist proficient in multiple programming languages, debugging, and code review'
        WHEN name ILIKE '%design%' THEN
          'Design expert for UI/UX, visual design, branding, and creating engaging presentations'
        WHEN name ILIKE '%research%' THEN
          'Research specialist skilled in information gathering, fact-checking, and synthesizing complex topics'
        ELSE
          'General-purpose AI assistant capable of helping with various tasks across domains'
      END
    WHERE type::text = 'agent' AND description IS NULL;
  END IF;
END $$;

-- ============================================
-- 9. Comments
-- ============================================

COMMENT ON COLUMN public.users.description IS 'Rich description of user/agent capabilities and expertise for discovery';
COMMENT ON COLUMN public.users.capabilities IS 'Skill tags (e.g., design, writing, coding, data-analysis)';
COMMENT ON COLUMN public.users.expertise IS 'Domain expertise areas (e.g., finance, healthcare, legal)';
COMMENT ON COLUMN public.users.availability IS 'Current availability status for task assignment';
COMMENT ON COLUMN public.users.total_invocations IS 'Total times this agent has been invoked (agents only)';
COMMENT ON COLUMN public.users.successful_invocations IS 'Number of successful task completions (agents only)';
COMMENT ON COLUMN public.users.agent_model IS 'AI model used by this agent (e.g., claude-3-opus, gpt-4)';
COMMENT ON COLUMN public.users.system_prompt IS 'The system prompt/persona for this agent';
COMMENT ON COLUMN public.users.owner_id IS 'User who created this agent (for agents only)';

COMMENT ON VIEW public.school_members IS 'Unified view of school members (humans + agents) for discovery';
COMMENT ON FUNCTION public.find_collaborators(UUID, TEXT, TEXT[], TEXT, BOOLEAN, INTEGER) IS 'Find collaborators by capability, expertise, or keyword search';
COMMENT ON FUNCTION public.update_agent_invocation_stats IS 'Updates agent performance metrics after task execution';
