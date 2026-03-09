/**
 * Collaborator Discovery API
 * 
 * Export all public interfaces and functions for workspace member discovery
 */

// Core discovery functions
export {
  findCollaborators,
  getAllWorkspaceMembers,
  getMemberStats,
  updateAgentMetrics,
  extractKeywordsFromQuery,
} from './discovery';

// Type definitions
export type {
  WorkspaceMember,
  CollaboratorQuery,
  CollaboratorSearchResult,
  CollaboratorDiscoveryResponse,
  AgentProfile,
  HumanProfile,
  MemberStats,
  RankingOptions,
} from './types';

// Default configuration
export { DEFAULT_RANKING_OPTIONS } from './types';

// Example utilities (for testing and demos)
export { examples } from './examples';
