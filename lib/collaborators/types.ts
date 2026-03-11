/**
 * Types for workspace member discovery and collaboration
 * Enables agents to find the right collaborators (humans + agents) for tasks
 */

/**
 * Unified interface for workspace members (both humans and agents)
 */
export interface WorkspaceMember {
  id: string;
  type: 'human' | 'agent';
  name: string;
  avatar_url: string | null;
  
  // Rich description of capabilities and expertise
  description: string | null;
  
  // Searchable capability tags
  capabilities: string[];
  
  // Domain expertise areas
  expertise: string[];
  
  // Current availability status
  availability: 'online' | 'busy' | 'offline';
  
  // Activity tracking
  last_active: Date | null;
  
  // Agent-specific profile (only for type='agent')
  agent_profile?: AgentProfile;
  
  // Human-specific profile (only for type='human')
  human_profile?: HumanProfile;
}

/**
 * Agent-specific profile information
 */
export interface AgentProfile {
  agent_id: string;
  model: string | null;
  system_prompt_summary: string | null;
  agent_type: 'openclaw' | 'knobase_ai' | 'custom';
  version: string;
  platform: string | null;
  hostname: string | null;
  
  // Performance metrics
  success_rate?: number;
  total_invocations: number;
  avg_response_time?: number;
  
  // Persona information
  persona_id?: string | null;
  persona_name?: string | null;
}

/**
 * Human-specific profile information
 */
export interface HumanProfile {
  user_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  joined_at: Date;
}

/**
 * Query parameters for discovering collaborators
 */
export interface CollaboratorQuery {
  // Natural language query: "who can analyze financial data?"
  query?: string;
  
  // Filter by specific capability tags
  capabilities?: string[];
  
  // Filter by domain expertise
  expertise?: string[];
  
  // Filter by member type
  type?: 'human' | 'agent' | 'all';
  
  // Only return available members
  available_only?: boolean;
  
  // Maximum number of results
  limit?: number;
  
  // Minimum confidence threshold (0-1) for semantic matching
  min_confidence?: number;
  
  // Exclude specific member IDs
  exclude_ids?: string[];
}

/**
 * Search result with relevance scoring
 */
export interface CollaboratorSearchResult {
  member: WorkspaceMember;
  
  // Relevance score (0-1)
  confidence: number;
  
  // Matching capabilities from query
  matched_capabilities: string[];
  
  // Matching expertise areas from query
  matched_expertise: string[];
  
  // Explanation of why this member was matched
  match_reason: string;
}

/**
 * Response from collaborator discovery
 */
export interface CollaboratorDiscoveryResponse {
  collaborators: CollaboratorSearchResult[];
  total: number;
  query_summary?: string;
}

/**
 * Stats for a workspace member's activity
 */
export interface MemberStats {
  member_id: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  avg_completion_time_ms: number;
  success_rate: number;
  last_task_at: Date | null;
}

/**
 * Options for ranking collaborators
 */
export interface RankingOptions {
  // Weight for capability match (0-1)
  capability_weight?: number;
  
  // Weight for expertise match (0-1)
  expertise_weight?: number;
  
  // Weight for semantic description match (0-1)
  semantic_weight?: number;
  
  // Weight for availability (0-1)
  availability_weight?: number;
  
  // Weight for success rate (0-1)
  success_rate_weight?: number;
  
  // Weight for recent activity (0-1)
  activity_weight?: number;
  
  // Boost for online members
  online_boost?: number;
}

/**
 * Default ranking weights
 */
export const DEFAULT_RANKING_OPTIONS: RankingOptions = {
  capability_weight: 0.3,
  expertise_weight: 0.25,
  semantic_weight: 0.25,
  availability_weight: 0.1,
  success_rate_weight: 0.05,
  activity_weight: 0.05,
  online_boost: 0.2,
};
