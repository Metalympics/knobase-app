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
          name: string | null;
          avatar_url: string | null;
          school_id: string | null;
          role: string | null;
          role_id: string | null;
          type: string | null;
          is_deleted: boolean;
          is_suspended: boolean;
          is_verified: boolean;
          is_approved: boolean;
          description: string | null;
          capabilities: string[] | null;
          expertise: string[] | null;
          availability: string | null;
          agent_type: string | null;
          model: string | null;
          system_prompt: string | null;
          bot_id: string | null;
          owner_id: string | null;
          total_invocations: number;
          last_invoked_at: string | null;
          last_active_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          display_name?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          school_id?: string | null;
          role?: string | null;
          role_id?: string | null;
          type?: string | null;
          is_deleted?: boolean;
          is_suspended?: boolean;
          is_verified?: boolean;
          is_approved?: boolean;
          description?: string | null;
          capabilities?: string[] | null;
          expertise?: string[] | null;
          availability?: string | null;
          agent_type?: string | null;
          model?: string | null;
          system_prompt?: string | null;
          bot_id?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          display_name?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          school_id?: string | null;
          role?: string | null;
          role_id?: string | null;
          type?: string | null;
          is_deleted?: boolean;
          is_suspended?: boolean;
          is_verified?: boolean;
          is_approved?: boolean;
          description?: string | null;
          capabilities?: string[] | null;
          expertise?: string[] | null;
          availability?: string | null;
          agent_type?: string | null;
          model?: string | null;
          system_prompt?: string | null;
          bot_id?: string | null;
          owner_id?: string | null;
          total_invocations?: number;
          last_invoked_at?: string | null;
          last_active_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      auth_profiles: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          last_login_at: string | null;
          email_verified: boolean;
          email_verified_at: string | null;
          last_active_school_id: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          last_login_at?: string | null;
          email_verified?: boolean;
          email_verified_at?: string | null;
          last_active_school_id?: string | null;
        };
        Update: {
          auth_id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          last_login_at?: string | null;
          email_verified?: boolean;
          email_verified_at?: string | null;
          last_active_school_id?: string | null;
        };
        Relationships: [];
      };
      schools: {
        Row: {
          id: string;
          name: string;
          slug?: string | null;
          owner_id?: string | null;
          admin_user_id?: string | null;
          invite_code?: string | null;
          settings?: Record<string, unknown> | null;
          logo_url: string | null;
          icon: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          owner_id?: string | null;
          admin_user_id?: string | null;
          invite_code?: string | null;
          settings?: Record<string, unknown> | null;
          logo_url?: string | null;
          icon?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          owner_id?: string | null;
          admin_user_id?: string | null;
          invite_code?: string | null;
          settings?: Record<string, unknown> | null;
          logo_url?: string | null;
          icon?: string | null;
          color?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_settings: {
        Row: {
          id: string;
          school_id: string;
          site_title: string | null;
          subdomain_id: string | null;
          memory_enabled: boolean;
          default_bot_id: string | null;
          use_custom_icon: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          site_title?: string | null;
          subdomain_id?: string | null;
          memory_enabled?: boolean;
          default_bot_id?: string | null;
          use_custom_icon?: boolean;
          updated_at?: string;
        };
        Update: {
          school_id?: string;
          site_title?: string | null;
          subdomain_id?: string | null;
          memory_enabled?: boolean;
          default_bot_id?: string | null;
          use_custom_icon?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      bots: {
        Row: {
          id: string;
          name: string;
          school_id: string;
          created_by: string;
          system_prompt: string | null;
          model: string | null;
          config: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          school_id: string;
          created_by: string;
          system_prompt?: string | null;
          model?: string | null;
          config?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          system_prompt?: string | null;
          model?: string | null;
          config?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      page_permissions: {
        Row: {
          id: string;
          page_id: string;
          user_id: string;
          permission: "full" | "edit" | "comment" | "view";
          granted_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          user_id: string;
          permission: "full" | "edit" | "comment" | "view";
          granted_by: string;
          created_at?: string;
        };
        Update: {
          permission?: "full" | "edit" | "comment" | "view";
        };
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          school_id: string;
          parent_id: string | null;
          title: string;
          content_md: string;
          content_json: Record<string, unknown> | null;
          icon: string | null;
          created_by: string;
          visibility: "private" | "shared" | "public";
          position: number;
          depth: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          parent_id?: string | null;
          title?: string;
          content_md?: string;
          content_json?: Record<string, unknown> | null;
          icon?: string | null;
          created_by: string;
          visibility?: "private" | "shared" | "public";
          position?: number;
          depth?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          parent_id?: string | null;
          title?: string;
          content_md?: string;
          content_json?: Record<string, unknown> | null;
          icon?: string | null;
          visibility?: "private" | "shared" | "public";
          position?: number;
          depth?: number;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          knowledge_base_id: string | null;
          name: string;
          file_path: string | null;
          file_type: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
          school_id: string;
          file_size: number | null;
          status: string;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          knowledge_base_id?: string | null;
          name: string;
          file_path?: string | null;
          file_type?: string | null;
          user_id: string;
          school_id: string;
          status?: string;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          name?: string;
          file_path?: string | null;
          file_type?: string | null;
          status?: string;
          metadata?: Record<string, unknown> | null;
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
          school_id: string;
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
          school_id: string;
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
          school_id: string;
          block_id: string | null;
          content_offset: number | null;
          source_type: "human" | "agent";
          source_id: string;
          source_name: string | null;
          target_type: "human" | "agent";
          target_id: string;
          target_name: string;
          mention_text: string;
          context_text: string | null;
          resolution_status: "pending" | "resolved" | "unknown";
          is_agent_generated: boolean;
          parent_mention_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          school_id: string;
          block_id?: string | null;
          content_offset?: number | null;
          source_type: "human" | "agent";
          source_id: string;
          source_name?: string | null;
          target_type: "human" | "agent";
          target_id: string;
          target_name: string;
          mention_text?: string;
          context_text?: string | null;
          resolution_status?: "pending" | "resolved" | "unknown";
          is_agent_generated?: boolean;
          parent_mention_id?: string | null;
          created_at?: string;
        };
        Update: {
          resolution_status?: "pending" | "resolved" | "unknown";
          context_text?: string | null;
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
          school_id: string | null;
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
          school_id?: string | null;
          current_task_id?: string | null;
          status?: "idle" | "reading" | "thinking" | "editing" | "waiting";
          current_section?: string | null;
          current_block_id?: string | null;
        };
        Update: {
          document_id?: string | null;
          school_id?: string | null;
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
          school_id: string | null;
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
          school_id?: string | null;
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
      page_blocks: {
        Row: {
          id: string;
          page_id: string;
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
          page_id: string;
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
          school_id: string;
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
          school_id: string;
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
      agent_api_keys: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          agent_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          tier: "free" | "pro" | "enterprise";
          scopes: string[];
          is_active: boolean;
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id?: string;
          agent_id?: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          tier?: "free" | "pro" | "enterprise";
          scopes?: string[];
          is_active?: boolean;
          expires_at?: string | null;
        };
        Update: {
          name?: string;
          tier?: "free" | "pro" | "enterprise";
          scopes?: string[];
          is_active?: boolean;
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          key_hash: string;
          key_prefix: string;
          user_id: string;
          school_id: string | null;
          scopes: string[];
          name: string;
          created_by: string;
          expires_at: string | null;
          last_used_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          key_hash: string;
          key_prefix: string;
          user_id: string;
          school_id?: string | null;
          scopes?: string[];
          name: string;
          created_by: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          scopes?: string[];
          is_active?: boolean;
          last_used_at?: string | null;
          expires_at?: string | null;
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
          school_id: string | null;
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
          school_id?: string | null;
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
          school_id: string;
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
          school_id: string;
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
          school_id: string | null;
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
          school_id?: string | null;
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
          school_id?: string | null;
          document_id?: string | null;
          invited_by?: string;
          role?: string;
          used_at?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };
      user_webhooks: {
        Row: {
          id: string;
          user_id: string;
          event_type: "mention" | "comment" | "invite" | "task_assigned";
          webhook_url: string;
          secret: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: "mention" | "comment" | "invite" | "task_assigned";
          webhook_url: string;
          secret: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          event_type?: "mention" | "comment" | "invite" | "task_assigned";
          webhook_url?: string;
          secret?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      oauth_device_codes: {
        Row: {
          id: string;
          device_code: string;
          user_code: string;
          client_id: string;
          user_id: string | null;
          school_id: string | null;
          scope: string[];
          status: "pending" | "authorized" | "completed";
          expires_at: string;
          interval: number;
          last_polled_at: string | null;
          access_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_code: string;
          user_code: string;
          client_id: string;
          user_id?: string | null;
          school_id?: string | null;
          scope?: string[];
          status?: "pending" | "authorized" | "completed";
          expires_at: string;
          interval?: number;
          last_polled_at?: string | null;
          access_token?: string | null;
          created_at?: string;
        };
        Update: {
          device_code?: string;
          user_code?: string;
          client_id?: string;
          user_id?: string | null;
          school_id?: string | null;
          scope?: string[];
          status?: "pending" | "authorized" | "completed";
          expires_at?: string;
          interval?: number;
          last_polled_at?: string | null;
          access_token?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      find_collaborators: {
        Args: {
          p_school_id: string;
          p_search_query?: string | null;
          p_capabilities?: string[] | null;
          p_type?: string;
          p_available_only?: boolean;
          p_limit?: number;
        };
        Returns: Array<{
          id: string;
          type: string;
          name: string;
          avatar_url: string | null;
          description: string | null;
          capabilities: string[];
          expertise: string[];
          availability: string;
          relevance_score: number;
        }>;
      };
      update_agent_invocation_stats: {
        Args: {
          p_agent_id: string;
          p_success: boolean;
          p_response_time_ms: number;
        };
        Returns: void;
      };
      get_page_ancestors: {
        Args: { page_uuid: string };
        Returns: Array<{
          id: string;
          title: string;
          icon: string | null;
          depth: number;
        }>;
      };
    };
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
