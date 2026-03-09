import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client";

export type TypedSupabaseClient = SupabaseClient<Database>;

export type AuthUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

export type UserProfile = Database["public"]["Tables"]["users"]["Row"];
export type School = Database["public"]["Tables"]["schools"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];

/* ------------------------------------------------------------------ */
/* Agent coordination types                                            */
/* ------------------------------------------------------------------ */
export type Agent = Database["public"]["Tables"]["agents"]["Row"];
export type AgentInsert = Database["public"]["Tables"]["agents"]["Insert"];
export type AgentUpdate = Database["public"]["Tables"]["agents"]["Update"];

export type AgentTask = Database["public"]["Tables"]["agent_tasks"]["Row"];
export type AgentTaskInsert = Database["public"]["Tables"]["agent_tasks"]["Insert"];
export type AgentTaskUpdate = Database["public"]["Tables"]["agent_tasks"]["Update"];

export type Mention = Database["public"]["Tables"]["mentions"]["Row"];
export type MentionInsert = Database["public"]["Tables"]["mentions"]["Insert"];
export type MentionUpdate = Database["public"]["Tables"]["mentions"]["Update"];

export type AgentSession = Database["public"]["Tables"]["agent_sessions"]["Row"];
export type AgentSessionInsert = Database["public"]["Tables"]["agent_sessions"]["Insert"];
export type AgentSessionUpdate = Database["public"]["Tables"]["agent_sessions"]["Update"];

export type AgentEditProposal = Database["public"]["Tables"]["agent_edit_proposals"]["Row"];
export type AgentEditProposalInsert = Database["public"]["Tables"]["agent_edit_proposals"]["Insert"];
export type AgentEditProposalUpdate = Database["public"]["Tables"]["agent_edit_proposals"]["Update"];

export type AgentNotification = Database["public"]["Tables"]["agent_notifications"]["Row"];
export type AgentNotificationInsert = Database["public"]["Tables"]["agent_notifications"]["Insert"];

export type DocumentBlock = Database["public"]["Tables"]["document_blocks"]["Row"];
export type DocumentBlockInsert = Database["public"]["Tables"]["document_blocks"]["Insert"];
export type DocumentBlockUpdate = Database["public"]["Tables"]["document_blocks"]["Update"];

export type AgentPersonaRow = Database["public"]["Tables"]["agent_personas"]["Row"];
export type AgentPersonaInsert = Database["public"]["Tables"]["agent_personas"]["Insert"];
export type AgentPersonaUpdate = Database["public"]["Tables"]["agent_personas"]["Update"];

export type AgentWebhook = Database["public"]["Tables"]["agent_webhooks"]["Row"];
export type AgentWebhookInsert = Database["public"]["Tables"]["agent_webhooks"]["Insert"];
export type AgentWebhookUpdate = Database["public"]["Tables"]["agent_webhooks"]["Update"];

export type AgentApiKey = Database["public"]["Tables"]["agent_api_keys"]["Row"];
export type AgentApiKeyInsert = Database["public"]["Tables"]["agent_api_keys"]["Insert"];
export type AgentApiKeyUpdate = Database["public"]["Tables"]["agent_api_keys"]["Update"];

/* ------------------------------------------------------------------ */
/* Marketplace types                                                   */
/* ------------------------------------------------------------------ */
export type KnowledgePack = Database["public"]["Tables"]["knowledge_packs"]["Row"];
export type KnowledgePackInsert = Database["public"]["Tables"]["knowledge_packs"]["Insert"];
export type KnowledgePackUpdate = Database["public"]["Tables"]["knowledge_packs"]["Update"];

export type PackPurchase = Database["public"]["Tables"]["pack_purchases"]["Row"];
export type PackPurchaseInsert = Database["public"]["Tables"]["pack_purchases"]["Insert"];

export type ImportJob = Database["public"]["Tables"]["import_jobs"]["Row"];
export type ImportJobInsert = Database["public"]["Tables"]["import_jobs"]["Insert"];
export type ImportJobUpdate = Database["public"]["Tables"]["import_jobs"]["Update"];

export type PackReview = Database["public"]["Tables"]["pack_reviews"]["Row"];
export type PackReviewInsert = Database["public"]["Tables"]["pack_reviews"]["Insert"];

/* ------------------------------------------------------------------ */
/* Workspace files types                                               */
/* ------------------------------------------------------------------ */
export type WorkspaceFile = Database["public"]["Tables"]["workspace_files"]["Row"];
export type WorkspaceFileInsert = Database["public"]["Tables"]["workspace_files"]["Insert"];
export type WorkspaceFileUpdate = Database["public"]["Tables"]["workspace_files"]["Update"];

export type AgentTaskStatus = AgentTask["status"];
export type AgentTaskType = AgentTask["task_type"];
export type MentionStatus = Mention["status"];
export type AgentSessionStatus = AgentSession["status"];
export type EditProposalStatus = AgentEditProposal["status"];
export type EditType = AgentEditProposal["edit_type"];

export type SchoolWithMembers = School & {
  members: UserProfile[];
};

export type DocumentWithCreator = Document & {
  creator: UserProfile;
};

export type SchoolRole = "admin" | "editor" | "viewer";

export type CreateSchoolInput = {
  name: string;
  icon?: string;
  color?: string;
  settings?: {
    isPublic?: boolean;
    allowGuests?: boolean;
    defaultAgent?: string | null;
  };
};

export type CreateDocumentInput = {
  title: string;
  content: string;
  school_id: string;
  visibility?: "private" | "shared" | "public";
};

export type UpdateDocumentInput = {
  title?: string;
  content?: string;
  visibility?: "private" | "shared" | "public";
};

export type UpdateProfileInput = {
  display_name?: string;
  avatar_url?: string;
};

export type AddSchoolMemberInput = {
  school_id: string;
  user_id: string;
  role: SchoolRole;
};

export type PermissionCheck = {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
};

/* ------------------------------------------------------------------ */
/* Collaborator Discovery types                                        */
/* ------------------------------------------------------------------ */

/**
 * Extended agent profile with discovery fields
 */
export type AgentWithDiscovery = Agent & {
  description?: string | null;
  expertise?: string[];
  availability?: 'online' | 'busy' | 'offline';
  total_invocations?: number;
  successful_invocations?: number;
  success_rate?: number;
  avg_response_time_ms?: number | null;
  primary_persona_id?: string | null;
};

/**
 * Extended user profile with discovery fields
 */
export type UserWithDiscovery = UserProfile & {
  description?: string | null;
  capabilities?: string[];
  expertise?: string[];
  availability?: 'online' | 'busy' | 'offline';
  last_active_at?: string | null;
};

/**
 * Workspace member (unified view of users and agents)
 */
export type WorkspaceMember = {
  workspace_id: string;
  member_id: string;
  member_type: 'human' | 'agent';
  name: string;
  avatar_url: string | null;
  description: string | null;
  capabilities: string[];
  expertise: string[];
  availability: 'online' | 'busy' | 'offline';
  last_active_at: string | null;
  created_at: string;
  
  // Human-specific fields (null for agents)
  role?: 'admin' | 'editor' | 'viewer' | null;
  email?: string | null;
  joined_at?: string | null;
  
  // Agent-specific fields (null for humans)
  agent_id?: string | null;
  agent_type?: 'openclaw' | 'knobase_ai' | 'custom' | null;
  version?: string | null;
  platform?: string | null;
  hostname?: string | null;
  total_invocations?: number | null;
  successful_invocations?: number | null;
  success_rate?: number | null;
  avg_response_time_ms?: number | null;
  primary_persona_id?: string | null;
};

/**
 * Workspace role type (for compatibility)
 */
export type WorkspaceRole = "admin" | "editor" | "viewer";
