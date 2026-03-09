/**
 * Collaborator Discovery Service
 * 
 * Enables semantic search and intelligent matching of workspace members
 * (both humans and agents) based on capabilities, expertise, and availability.
 */

import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_RANKING_OPTIONS,
} from './types';
import type {
  WorkspaceMember,
  CollaboratorQuery,
  CollaboratorSearchResult,
  CollaboratorDiscoveryResponse,
  RankingOptions,
  MemberStats,
} from './types';

/**
 * Find collaborators in a workspace based on query criteria
 */
export async function findCollaborators(
  workspaceId: string,
  query: CollaboratorQuery,
  rankingOptions: RankingOptions = DEFAULT_RANKING_OPTIONS
): Promise<CollaboratorDiscoveryResponse> {
  const supabase = await createServerClient();
  
  const {
    query: searchQuery,
    capabilities: requiredCapabilities = [],
    expertise: requiredExpertise = [],
    type = 'all',
    available_only = false,
    limit = 10,
    min_confidence = 0.3,
    exclude_ids = [],
  } = query;

  // Build the base query
  let dbQuery = supabase
    .from('workspace_members_unified')
    .select('*')
    .eq('workspace_id', workspaceId);

  // Filter by member type
  if (type !== 'all') {
    dbQuery = dbQuery.eq('member_type', type);
  }

  // Filter by availability
  if (available_only) {
    dbQuery = dbQuery.eq('availability', 'online');
  }

  // Exclude specific IDs
  if (exclude_ids.length > 0) {
    dbQuery = dbQuery.not('member_id', 'in', `(${exclude_ids.join(',')})`);
  }

  const { data: members, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to fetch workspace members: ${error.message}`);
  }

  if (!members || members.length === 0) {
    return {
      collaborators: [],
      total: 0,
      query_summary: searchQuery || 'No query provided',
    };
  }

  // Convert to WorkspaceMember format and score each member
  const scoredResults: CollaboratorSearchResult[] = members
    .map((member) => {
      const workspaceMember = convertToWorkspaceMember(member);
      const score = calculateRelevanceScore(
        workspaceMember,
        {
          searchQuery,
          requiredCapabilities,
          requiredExpertise,
        },
        rankingOptions
      );

      return {
        member: workspaceMember,
        confidence: score.totalScore,
        matched_capabilities: score.matchedCapabilities,
        matched_expertise: score.matchedExpertise,
        match_reason: generateMatchReason(score, searchQuery),
      };
    })
    .filter((result) => result.confidence >= min_confidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);

  return {
    collaborators: scoredResults,
    total: scoredResults.length,
    query_summary: searchQuery || `Found ${scoredResults.length} matching collaborators`,
  };
}

/**
 * Get detailed stats for a workspace member
 */
export async function getMemberStats(
  memberId: string,
  memberType: 'human' | 'agent'
): Promise<MemberStats> {
  const supabase = await createServerClient();

  const { data: tasks, error } = await supabase
    .from('agent_tasks')
    .select('status, created_at, completed_at')
    .eq(memberType === 'agent' ? 'agent_id' : 'created_by', memberId);

  if (error) {
    throw new Error(`Failed to fetch member stats: ${error.message}`);
  }

  const completedTasks = tasks?.filter((t) => t.status === 'completed') || [];
  const failedTasks = tasks?.filter((t) => t.status === 'failed') || [];
  
  let avgCompletionTime = 0;
  if (completedTasks.length > 0) {
    const times = completedTasks
      .filter((t) => t.completed_at && t.created_at)
      .map((t) => {
        const created = new Date(t.created_at!).getTime();
        const completed = new Date(t.completed_at!).getTime();
        return completed - created;
      });
    
    avgCompletionTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  return {
    member_id: memberId,
    total_tasks: tasks?.length || 0,
    completed_tasks: completedTasks.length,
    failed_tasks: failedTasks.length,
    avg_completion_time_ms: Math.round(avgCompletionTime),
    success_rate: tasks && tasks.length > 0 
      ? completedTasks.length / tasks.length 
      : 0,
    last_task_at: tasks && tasks.length > 0
      ? new Date(tasks[0].created_at)
      : null,
  };
}

/**
 * Get all workspace members without filtering
 */
export async function getAllWorkspaceMembers(
  workspaceId: string,
  type?: 'human' | 'agent' | 'all'
): Promise<WorkspaceMember[]> {
  const supabase = await createServerClient();

  let dbQuery = supabase
    .from('workspace_members_unified')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (type && type !== 'all') {
    dbQuery = dbQuery.eq('member_type', type);
  }

  const { data: members, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to fetch workspace members: ${error.message}`);
  }

  return (members || []).map(convertToWorkspaceMember);
}

/**
 * Update agent performance metrics
 */
export async function updateAgentMetrics(
  agentId: string,
  success: boolean,
  responseTimeMs: number
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase.rpc('update_agent_invocation_stats', {
    p_agent_id: agentId,
    p_success: success,
    p_response_time_ms: responseTimeMs,
  });

  if (error) {
    console.error('Failed to update agent metrics:', error);
  }
}

/**
 * Convert database row to WorkspaceMember
 */
function convertToWorkspaceMember(row: any): WorkspaceMember {
  const isAgent = row.member_type === 'agent';

  return {
    id: row.member_id,
    type: row.member_type,
    name: row.name,
    avatar_url: row.avatar_url,
    description: row.description,
    capabilities: row.capabilities || [],
    expertise: row.expertise || [],
    availability: row.availability,
    last_active: row.last_active_at ? new Date(row.last_active_at) : null,
    ...(isAgent
      ? {
          agent_profile: {
            agent_id: row.agent_id,
            model: null,
            system_prompt_summary: null,
            agent_type: row.agent_type,
            version: row.version,
            platform: row.platform,
            hostname: row.hostname,
            success_rate: row.success_rate ? parseFloat(row.success_rate) : undefined,
            total_invocations: row.total_invocations || 0,
            avg_response_time: row.avg_response_time_ms,
            persona_id: row.primary_persona_id,
            persona_name: null,
          },
        }
      : {
          human_profile: {
            user_id: row.member_id,
            email: row.email,
            display_name: row.name,
            role: row.role,
            joined_at: new Date(row.joined_at),
          },
        }),
  };
}

interface ScoringContext {
  searchQuery?: string;
  requiredCapabilities: string[];
  requiredExpertise: string[];
}

interface ScoreBreakdown {
  totalScore: number;
  capabilityScore: number;
  expertiseScore: number;
  semanticScore: number;
  availabilityScore: number;
  successRateScore: number;
  activityScore: number;
  matchedCapabilities: string[];
  matchedExpertise: string[];
}

/**
 * Calculate relevance score for a workspace member
 */
function calculateRelevanceScore(
  member: WorkspaceMember,
  context: ScoringContext,
  options: RankingOptions
): ScoreBreakdown {
  const {
    capability_weight = 0.3,
    expertise_weight = 0.25,
    semantic_weight = 0.25,
    availability_weight = 0.1,
    success_rate_weight = 0.05,
    activity_weight = 0.05,
    online_boost = 0.2,
  } = options;

  // 1. Capability matching
  const matchedCapabilities = context.requiredCapabilities.filter((cap) =>
    member.capabilities.some((mc) => 
      mc.toLowerCase().includes(cap.toLowerCase()) ||
      cap.toLowerCase().includes(mc.toLowerCase())
    )
  );
  const capabilityScore =
    context.requiredCapabilities.length > 0
      ? matchedCapabilities.length / context.requiredCapabilities.length
      : 0;

  // 2. Expertise matching
  const matchedExpertise = context.requiredExpertise.filter((exp) =>
    member.expertise.some((me) => 
      me.toLowerCase().includes(exp.toLowerCase()) ||
      exp.toLowerCase().includes(me.toLowerCase())
    )
  );
  const expertiseScore =
    context.requiredExpertise.length > 0
      ? matchedExpertise.length / context.requiredExpertise.length
      : 0;

  // 3. Semantic description matching
  let semanticScore = 0;
  if (context.searchQuery && member.description) {
    const queryTerms = context.searchQuery.toLowerCase().split(/\s+/);
    const description = member.description.toLowerCase();
    const matchedTerms = queryTerms.filter((term) => description.includes(term));
    semanticScore = queryTerms.length > 0 ? matchedTerms.length / queryTerms.length : 0;
    
    // Also check capabilities and expertise in semantic search
    const allTags = [...member.capabilities, ...member.expertise].map(t => t.toLowerCase());
    const tagMatches = queryTerms.filter((term) => 
      allTags.some(tag => tag.includes(term) || term.includes(tag))
    );
    semanticScore = Math.max(semanticScore, tagMatches.length / queryTerms.length);
  }

  // 4. Availability score
  const availabilityScore =
    member.availability === 'online' ? 1 : member.availability === 'busy' ? 0.5 : 0;

  // 5. Success rate score (for agents)
  const successRateScore =
    member.agent_profile?.success_rate !== undefined
      ? member.agent_profile.success_rate / 100
      : 0.5; // Default for humans

  // 6. Recent activity score
  let activityScore = 0.5; // Default
  if (member.last_active) {
    const hoursSinceActive =
      (Date.now() - member.last_active.getTime()) / (1000 * 60 * 60);
    if (hoursSinceActive < 1) activityScore = 1;
    else if (hoursSinceActive < 24) activityScore = 0.8;
    else if (hoursSinceActive < 168) activityScore = 0.5;
    else activityScore = 0.2;
  }

  // Calculate weighted total
  let totalScore =
    capabilityScore * capability_weight +
    expertiseScore * expertise_weight +
    semanticScore * semantic_weight +
    availabilityScore * availability_weight +
    successRateScore * success_rate_weight +
    activityScore * activity_weight;

  // Apply online boost
  if (member.availability === 'online') {
    totalScore = Math.min(1, totalScore + online_boost);
  }

  // If no specific criteria provided, use a base score
  if (!context.searchQuery && context.requiredCapabilities.length === 0 && context.requiredExpertise.length === 0) {
    totalScore = availabilityScore * 0.5 + activityScore * 0.3 + successRateScore * 0.2;
  }

  return {
    totalScore,
    capabilityScore,
    expertiseScore,
    semanticScore,
    availabilityScore,
    successRateScore,
    activityScore,
    matchedCapabilities,
    matchedExpertise,
  };
}

/**
 * Generate human-readable match reason
 */
function generateMatchReason(score: ScoreBreakdown, searchQuery?: string): string {
  const reasons: string[] = [];

  if (score.matchedCapabilities.length > 0) {
    reasons.push(`Has ${score.matchedCapabilities.join(', ')} capabilities`);
  }

  if (score.matchedExpertise.length > 0) {
    reasons.push(`Expert in ${score.matchedExpertise.join(', ')}`);
  }

  if (score.semanticScore > 0.5 && searchQuery) {
    reasons.push(`Relevant to "${searchQuery}"`);
  }

  if (score.availabilityScore === 1) {
    reasons.push('Currently online');
  }

  if (score.successRateScore > 0.8) {
    reasons.push('High success rate');
  }

  if (score.activityScore > 0.8) {
    reasons.push('Recently active');
  }

  return reasons.length > 0 
    ? reasons.join('; ')
    : 'General match';
}

/**
 * Extract keywords from natural language query
 */
export function extractKeywordsFromQuery(query: string): {
  capabilities: string[];
  expertise: string[];
  keywords: string[];
} {
  const lowercaseQuery = query.toLowerCase();
  
  // Common capability keywords
  const capabilityMap: Record<string, string[]> = {
    'data-analysis': ['analyze', 'data', 'analytics', 'statistics', 'metrics'],
    'writing': ['write', 'writing', 'content', 'blog', 'article', 'copy'],
    'coding': ['code', 'coding', 'program', 'develop', 'software', 'engineer'],
    'design': ['design', 'ui', 'ux', 'visual', 'graphics', 'mockup'],
    'research': ['research', 'investigate', 'study', 'analyze', 'explore'],
    'finance': ['finance', 'financial', 'accounting', 'budget', 'money'],
    'sql': ['sql', 'database', 'query', 'postgres', 'mysql'],
    'presentation': ['present', 'presentation', 'deck', 'slide', 'pitch'],
  };

  const capabilities: string[] = [];
  const expertise: string[] = [];
  
  // Match capabilities
  for (const [capability, keywords] of Object.entries(capabilityMap)) {
    if (keywords.some((keyword) => lowercaseQuery.includes(keyword))) {
      capabilities.push(capability);
    }
  }

  // Extract domain expertise hints
  const expertiseKeywords = ['expert', 'specialist', 'experienced in'];
  for (const keyword of expertiseKeywords) {
    if (lowercaseQuery.includes(keyword)) {
      const afterKeyword = lowercaseQuery.split(keyword)[1];
      if (afterKeyword) {
        const words = afterKeyword.trim().split(/\s+/).slice(0, 3);
        expertise.push(...words);
      }
    }
  }

  return {
    capabilities: [...new Set(capabilities)],
    expertise: [...new Set(expertise)],
    keywords: query.split(/\s+/).filter(w => w.length > 3),
  };
}
