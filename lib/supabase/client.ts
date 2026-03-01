import { createBrowserClient } from "@supabase/ssr";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
          settings: Record<string, unknown>;
          invite_code: string;
          icon: string | null;
          color: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          settings?: Record<string, unknown>;
          invite_code: string;
          icon?: string | null;
          color?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          settings?: Record<string, unknown>;
          invite_code?: string;
          icon?: string | null;
          color?: string | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "admin" | "editor" | "viewer";
          joined_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: "admin" | "editor" | "viewer";
          joined_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: "admin" | "editor" | "viewer";
          joined_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
          created_by: string;
          visibility: "private" | "shared" | "public";
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          created_by: string;
          visibility?: "private" | "shared" | "public";
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
          visibility?: "private" | "shared" | "public";
        };
        Relationships: [];
      };
      agent_tasks: {
        Row: {
          id: string;
          task_type: "mention" | "queued" | "scheduled" | "background";
          status: "pending" | "acknowledged" | "working" | "completed" | "failed" | "cancelled";
          priority: number;
          agent_id: string;
          agent_persona_id: string | null;
          document_id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          prompt: string;
          target_context: Record<string, unknown>;
          created_by: string | null;
          created_by_type: "user" | "agent" | "system";
          source_mention_id: string | null;
          created_at: string;
          acknowledged_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          due_date: string | null;
          progress_percent: number;
          current_action: string | null;
          result_summary: string | null;
          result_blocks: string[] | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          visibility: "private" | "collaborators" | "public";
        };
        Insert: {
          id?: string;
          task_type: "mention" | "queued" | "scheduled" | "background";
          status?: "pending" | "acknowledged" | "working" | "completed" | "failed" | "cancelled";
          priority?: number;
          agent_id?: string;
          agent_persona_id?: string | null;
          document_id: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          prompt: string;
          target_context?: Record<string, unknown>;
          created_by?: string | null;
          created_by_type?: "user" | "agent" | "system";
          source_mention_id?: string | null;
          created_at?: string;
          due_date?: string | null;
          visibility?: "private" | "collaborators" | "public";
        };
        Update: {
          id?: string;
          status?: "pending" | "acknowledged" | "working" | "completed" | "failed" | "cancelled";
          priority?: number;
          agent_persona_id?: string | null;
          acknowledged_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          progress_percent?: number;
          current_action?: string | null;
          result_summary?: string | null;
          result_blocks?: string[] | null;
          error_message?: string | null;
          retry_count?: number;
          visibility?: "private" | "collaborators" | "public";
        };
        Relationships: [];
      };
      mentions: {
        Row: {
          id: string;
          document_id: string;
          block_id: string | null;
          yjs_position: number | null;
          target_type: "agent" | "user";
          target_id: string;
          target_name: string;
          mention_text: string;
          context_before: string | null;
          context_after: string | null;
          prompt: string | null;
          created_by: string | null;
          created_at: string;
          status: "unread" | "acknowledged" | "completed" | "dismissed";
          resolved_by: string | null;
          resolved_at: string | null;
          linked_task_id: string | null;
          notified_at: string | null;
        };
        Insert: {
          id?: string;
          document_id: string;
          block_id?: string | null;
          yjs_position?: number | null;
          target_type: "agent" | "user";
          target_id: string;
          target_name: string;
          mention_text: string;
          context_before?: string | null;
          context_after?: string | null;
          prompt?: string | null;
          created_by?: string | null;
          status?: "unread" | "acknowledged" | "completed" | "dismissed";
        };
        Update: {
          status?: "unread" | "acknowledged" | "completed" | "dismissed";
          resolved_by?: string | null;
          resolved_at?: string | null;
          linked_task_id?: string | null;
          notified_at?: string | null;
        };
        Relationships: [];
      };
      agent_sessions: {
        Row: {
          id: string;
          agent_id: string;
          agent_name: string;
          agent_avatar: string | null;
          agent_color: string;
          document_id: string | null;
          workspace_id: string | null;
          current_task_id: string | null;
          status: "idle" | "reading" | "thinking" | "editing" | "waiting";
          current_section: string | null;
          current_block_id: string | null;
          started_at: string;
          last_activity_at: string;
          expires_at: string;
          followed_by: string[];
        };
        Insert: {
          id?: string;
          agent_id: string;
          agent_name: string;
          agent_avatar?: string | null;
          agent_color?: string;
          document_id?: string | null;
          workspace_id?: string | null;
          current_task_id?: string | null;
          status?: "idle" | "reading" | "thinking" | "editing" | "waiting";
          current_section?: string | null;
          current_block_id?: string | null;
        };
        Update: {
          document_id?: string | null;
          workspace_id?: string | null;
          current_task_id?: string | null;
          status?: "idle" | "reading" | "thinking" | "editing" | "waiting";
          current_section?: string | null;
          current_block_id?: string | null;
          last_activity_at?: string;
          expires_at?: string;
          followed_by?: string[];
        };
        Relationships: [];
      };
      agent_edit_proposals: {
        Row: {
          id: string;
          task_id: string;
          document_id: string;
          block_id: string | null;
          edit_type: "insert" | "replace" | "delete" | "append" | "prepend" | "transform";
          original_content: Record<string, unknown> | null;
          proposed_content: Record<string, unknown>;
          explanation: string | null;
          surrounding_context: string | null;
          status: "pending" | "accepted" | "rejected" | "modified" | "superseded";
          decided_by: string | null;
          decided_at: string | null;
          modified_content: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          document_id: string;
          block_id?: string | null;
          edit_type: "insert" | "replace" | "delete" | "append" | "prepend" | "transform";
          original_content?: Record<string, unknown> | null;
          proposed_content: Record<string, unknown>;
          explanation?: string | null;
          surrounding_context?: string | null;
        };
        Update: {
          status?: "pending" | "accepted" | "rejected" | "modified" | "superseded";
          decided_by?: string | null;
          decided_at?: string | null;
          modified_content?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      agent_notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "mention" | "task_assigned" | "task_completed" | "agent_busy" | "agent_waiting" | "collaborator_joined" | "document_shared";
          source_id: string | null;
          source_name: string | null;
          source_avatar: string | null;
          title: string;
          message: string | null;
          document_id: string | null;
          workspace_id: string | null;
          task_id: string | null;
          mention_id: string | null;
          is_read: boolean;
          read_at: string | null;
          action_url: string | null;
          action_text: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "mention" | "task_assigned" | "task_completed" | "agent_busy" | "agent_waiting" | "collaborator_joined" | "document_shared";
          source_id?: string | null;
          source_name?: string | null;
          source_avatar?: string | null;
          title: string;
          message?: string | null;
          document_id?: string | null;
          workspace_id?: string | null;
          task_id?: string | null;
          mention_id?: string | null;
          action_url?: string | null;
          action_text?: string;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
        Relationships: [];
      };
      document_blocks: {
        Row: {
          id: string;
          document_id: string;
          block_id: string;
          block_type: "paragraph" | "heading" | "code" | "list" | "quote" | "table" | "image" | "callout" | "agent_output";
          content: Record<string, unknown>;
          markdown: string | null;
          order_index: number;
          yjs_id: string | null;
          created_by: string | null;
          created_by_type: "user" | "agent";
          created_at: string;
          modified_by: string | null;
          modified_by_type: string;
          modified_at: string;
          created_by_task_id: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          document_id: string;
          block_id: string;
          block_type: "paragraph" | "heading" | "code" | "list" | "quote" | "table" | "image" | "callout" | "agent_output";
          content: Record<string, unknown>;
          markdown?: string | null;
          order_index: number;
          yjs_id?: string | null;
          created_by?: string | null;
          created_by_type?: "user" | "agent";
          created_by_task_id?: string | null;
        };
        Update: {
          content?: Record<string, unknown>;
          markdown?: string | null;
          order_index?: number;
          modified_by?: string | null;
          modified_by_type?: string;
          modified_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      agent_webhooks: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string;
          url: string;
          secret: string;
          events: string[];
          active: boolean;
          failure_count: number;
          last_triggered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id: string;
          url: string;
          secret: string;
          events?: string[];
          active?: boolean;
        };
        Update: {
          url?: string;
          secret?: string;
          events?: string[];
          active?: boolean;
          failure_count?: number;
          last_triggered_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      agents: {
        Row: {
          id: string;
          agent_id: string;
          workspace_id: string;
          name: string;
          type: "openclaw" | "knobase_ai" | "custom";
          version: string;
          capabilities: string[];
          platform: string | null;
          hostname: string | null;
          is_active: boolean;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          workspace_id: string;
          name: string;
          type?: "openclaw" | "knobase_ai" | "custom";
          version?: string;
          capabilities?: string[];
          platform?: string | null;
          hostname?: string | null;
          is_active?: boolean;
          last_seen_at?: string | null;
        };
        Update: {
          name?: string;
          type?: "openclaw" | "knobase_ai" | "custom";
          version?: string;
          capabilities?: string[];
          platform?: string | null;
          hostname?: string | null;
          is_active?: boolean;
          last_seen_at?: string | null;
        };
        Relationships: [];
      };
      agent_api_keys: {
        Row: {
          id: string;
          workspace_id: string;
          agent_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          tier: "free" | "pro" | "enterprise";
          scopes: string[];
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          agent_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          tier?: "free" | "pro" | "enterprise";
          scopes?: string[];
          expires_at?: string | null;
        };
        Update: {
          name?: string;
          tier?: "free" | "pro" | "enterprise";
          scopes?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      agent_personas: {
        Row: {
          id: string;
          agent_id: string;
          name: string;
          role: string;
          avatar: string;
          color: string;
          tone: string;
          voice_description: string | null;
          expertise: string[];
          instructions: string | null;
          constraints: string[];
          learned_preferences: Record<string, unknown>;
          common_patterns: Record<string, unknown>;
          workspace_id: string | null;
          created_by: string | null;
          is_default: boolean;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          agent_id: string;
          name: string;
          role: string;
          avatar?: string;
          color?: string;
          tone?: string;
          voice_description?: string | null;
          expertise?: string[];
          instructions?: string | null;
          constraints?: string[];
          workspace_id?: string | null;
          created_by?: string | null;
          is_default?: boolean;
          is_shared?: boolean;
        };
        Update: {
          name?: string;
          role?: string;
          avatar?: string;
          color?: string;
          tone?: string;
          voice_description?: string | null;
          expertise?: string[];
          instructions?: string | null;
          constraints?: string[];
          learned_preferences?: Record<string, unknown>;
          common_patterns?: Record<string, unknown>;
          is_default?: boolean;
          is_shared?: boolean;
          last_used_at?: string | null;
        };
        Relationships: [];
      };
      workspace_files: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          file_path: string;
          public_url: string | null;
          file_type: string;
          file_size: number;
          mime_type: string | null;
          status: "uploading" | "ready" | "processing" | "completed" | "failed";
          uploaded_by: string;
          folder_path: string;
          description: string | null;
          tags: string[];
          metadata: Record<string, unknown>;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          file_path: string;
          public_url?: string | null;
          file_type: string;
          file_size: number;
          mime_type?: string | null;
          status?: "uploading" | "ready" | "processing" | "completed" | "failed";
          uploaded_by: string;
          folder_path?: string;
          description?: string | null;
          tags?: string[];
          metadata?: Record<string, unknown>;
        };
        Update: {
          name?: string;
          public_url?: string | null;
          status?: "uploading" | "ready" | "processing" | "completed" | "failed";
          folder_path?: string;
          description?: string | null;
          tags?: string[];
          metadata?: Record<string, unknown>;
          error_message?: string | null;
        };
        Relationships: [];
      };
      knowledge_packs: {
        Row: {
          id: string;
          slug: string;
          creator_id: string;
          name: string;
          description: string;
          short_description: string | null;
          readme: string | null;
          manifest: Record<string, unknown>;
          price_cents: number;
          currency: string;
          sales_count: number;
          rating_average: number;
          rating_count: number;
          status: "draft" | "pending_review" | "active" | "rejected" | "archived";
          featured: boolean;
          published_at: string | null;
          preview_images: string[];
          thumbnail_url: string | null;
          demo_video_url: string | null;
          package_url: string | null;
          categories: string[];
          tags: string[];
          agent_count: number;
          document_count: number;
          workflow_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          creator_id: string;
          name: string;
          description: string;
          short_description?: string | null;
          readme?: string | null;
          manifest?: Record<string, unknown>;
          price_cents?: number;
          currency?: string;
          status?: "draft" | "pending_review" | "active" | "rejected" | "archived";
          featured?: boolean;
          preview_images?: string[];
          thumbnail_url?: string | null;
          demo_video_url?: string | null;
          package_url?: string | null;
          categories?: string[];
          tags?: string[];
          agent_count?: number;
          document_count?: number;
          workflow_count?: number;
        };
        Update: {
          name?: string;
          description?: string;
          short_description?: string | null;
          readme?: string | null;
          manifest?: Record<string, unknown>;
          price_cents?: number;
          currency?: string;
          status?: "draft" | "pending_review" | "active" | "rejected" | "archived";
          featured?: boolean;
          published_at?: string | null;
          preview_images?: string[];
          thumbnail_url?: string | null;
          demo_video_url?: string | null;
          package_url?: string | null;
          categories?: string[];
          tags?: string[];
          agent_count?: number;
          document_count?: number;
          workflow_count?: number;
        };
        Relationships: [];
      };
      pack_purchases: {
        Row: {
          id: string;
          pack_id: string;
          buyer_id: string;
          stripe_payment_intent_id: string | null;
          stripe_session_id: string | null;
          amount_cents: number;
          currency: string;
          status: "pending" | "completed" | "refunded" | "failed";
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          pack_id: string;
          buyer_id: string;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          amount_cents: number;
          currency?: string;
          status?: "pending" | "completed" | "refunded" | "failed";
        };
        Update: {
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          amount_cents?: number;
          status?: "pending" | "completed" | "refunded" | "failed";
          completed_at?: string | null;
        };
        Relationships: [];
      };
      import_jobs: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          source_type: "file_upload" | "marketplace_purchase" | "url";
          source_id: string | null;
          original_filename: string | null;
          status: "pending" | "processing" | "completed" | "failed";
          manifest: Record<string, unknown> | null;
          created_documents: string[];
          created_agents: string[];
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          source_type: "file_upload" | "marketplace_purchase" | "url";
          source_id?: string | null;
          original_filename?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          manifest?: Record<string, unknown> | null;
        };
        Update: {
          status?: "pending" | "processing" | "completed" | "failed";
          manifest?: Record<string, unknown> | null;
          created_documents?: string[];
          created_agents?: string[];
          error_message?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      pack_reviews: {
        Row: {
          id: string;
          pack_id: string;
          reviewer_id: string;
          rating: number;
          title: string | null;
          body: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pack_id: string;
          reviewer_id: string;
          rating: number;
          title?: string | null;
          body?: string | null;
        };
        Update: {
          rating?: number;
          title?: string | null;
          body?: string | null;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          token: string;
          email: string;
          workspace_id: string | null;
          document_id: string | null;
          invited_by: string;
          role: string;
          used_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          email: string;
          workspace_id?: string | null;
          document_id?: string | null;
          invited_by: string;
          role?: string;
          used_at?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          email?: string;
          workspace_id?: string | null;
          document_id?: string | null;
          invited_by?: string;
          role?: string;
          used_at?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

function getEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local to enable authentication and database features."
    );
  }

  return { url, anonKey };
}

/**
 * Browser client for client-side usage
 * Automatically handles cookie-based session management
 */
export function createClient() {
  const { url, anonKey } = getEnvVars();

  return createBrowserClient<Database>(url, anonKey);
}
