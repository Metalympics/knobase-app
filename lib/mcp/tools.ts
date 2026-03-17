import type { Document, DocumentMeta } from "@/lib/documents/types";
import type { Agent } from "@/lib/agents/types";
import type { Mention, MentionInsert } from "@/lib/supabase/types";
import { createMention } from "@/lib/supabase/mentions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type BlockOperation,
  type BlockMutationResult,
  applyOperations,
} from "@/lib/mcp/block-operations";
import { transformAgentContent } from "@/lib/editor/content-transformer";
import {
  listVaultKeys,
  decryptVaultKeyByEnvName,
} from "@/lib/vault/store";

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string; items?: Record<string, unknown> }>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const TOOL_DEFINITIONS: MCPToolDefinition[] = [
  {
    name: "list_documents",
    description:
      "List all documents in the Knobase workspace. Returns document metadata including id, title, and timestamps.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "read_document",
    description:
      "Read the full content of a specific document by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The document ID to read" },
      },
      required: ["id"],
    },
  },
  {
    name: "write_document",
    description:
      "Apply block-level operations to an existing document. Operations are applied sequentially and atomically — if any operation fails, the document is left unchanged. Use read_document first to discover block IDs.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "The ID of the document to modify",
        },
        operations: {
          type: "array",
          description:
            "Ordered list of block operations to apply. Each operation has: type (replace_block | insert_after_block | insert_before_block | delete_block | append | prepend), block_id (required for block-targeted ops), content (HTML string for the new/replacement content).",
        },
      },
      required: ["document_id", "operations"],
    },
  },
  {
    name: "search_documents",
    description:
      "Search documents by title or content. Returns matching documents with relevance.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_document",
    description:
      "Create a new document in the Knobase workspace. Optionally set initial content and nest it under a parent document.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title for the new document" },
        content: {
          type: "string",
          description: "Initial HTML content for the document (optional)",
        },
        parent_id: {
          type: "string",
          description: "ID of the parent document to nest this document under (optional)",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "delete_document",
    description: "Delete a document by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The document ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_agents",
    description:
      "List all AI agents configured in the Knobase workspace.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_agent_info",
    description:
      "Get the current agent's own profile information (name, avatar, status, capabilities). Uses the API key to identify the calling agent.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_agent_profile",
    description:
      "Update the current agent's own profile. Allows changing name, description (personality), and avatar_url. Uses the API key to identify the calling agent.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New display name for the agent" },
        description: {
          type: "string",
          description: "New description / personality text for the agent",
        },
        avatar_url: {
          type: "string",
          description: "New avatar URL or emoji for the agent",
        },
      },
    },
  },
  {
    name: "list_workspace_agents",
    description:
      "List all agents in the workspace with their id, name, description, and avatar. Uses the API key to scope to the correct workspace.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_task_status",
    description:
      "Update the status of a Knobase agent task. Use this to report progress, change the current action label (shown to the user), or mark a task as completed/failed. This allows the user to see real-time feedback about what the agent is doing.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "The ID of the agent task to update",
        },
        status: {
          type: "string",
          description:
            "Task status: 'working' (in progress), 'completed' (done), or 'failed' (error). Use 'working' to send progress updates while still processing.",
        },
        current_action: {
          type: "string",
          description:
            "A short human-readable label describing what the agent is currently doing, e.g. 'Reading document...', 'Analyzing content...', 'Writing response...'. Shown to the user in real time.",
        },
        progress_percent: {
          type: "number",
          description: "Optional progress percentage (0-100)",
        },
        result_summary: {
          type: "string",
          description:
            "A short summary of the result when status is 'completed'. Shown to the user.",
        },
        error_message: {
          type: "string",
          description: "Error message when status is 'failed'.",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "stream_edit",
    description:
      "Apply an incremental edit to a document during a streaming response. Unlike write_document which is atomic, stream_edit is designed for progressive edits where the agent appends or modifies content as it generates output. Each call applies a single operation. Use this when you want the user to see edits appear in real time.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "The ID of the document to edit",
        },
        operation: {
          type: "string",
          description:
            "The edit operation: 'append' (add to end), 'prepend' (add to start), 'replace_block' (replace a specific block), 'insert_after_block', 'insert_before_block', 'delete_block'",
        },
        content: {
          type: "string",
          description: "The HTML content for the edit (not required for delete_block)",
        },
        block_id: {
          type: "string",
          description: "The data-block-id to target (required for block-targeted operations)",
        },
        task_id: {
          type: "string",
          description: "Optional task ID — if provided, the task's current_action will be updated to reflect the edit",
        },
      },
      required: ["document_id", "operation"],
    },
  },
  {
    name: "create_mention",
    description:
      "Create a @mention in a document, targeting a specific user or agent. Automatically triggers a notification for the mentioned user via the database trigger.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "The ID of the document containing the mention",
        },
        target_user_id: {
          type: "string",
          description: "The ID of the user or agent being mentioned",
        },
        mention_text: {
          type: "string",
          description: "The display text for the mention (e.g. '@Alice')",
        },
        context_text: {
          type: "string",
          description: "Surrounding text providing context for the mention (optional)",
        },
        block_id: {
          type: "string",
          description: "The block ID within the document where the mention occurs (optional)",
        },
      },
      required: ["document_id", "target_user_id", "mention_text"],
    },
  },
  {
    name: "knobase_list_apis",
    description:
      "List all available API keys in the workspace vault with their environment variable names and descriptions. Does NOT return secret values — use knobase_get_api_key for that.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "knobase_get_api_key",
    description:
      "Retrieve a decrypted API key from the workspace vault by its environment variable name. The key value is returned for immediate use and expires in 5 minutes. Access is logged for audit.",
    inputSchema: {
      type: "object",
      properties: {
        env_name: {
          type: "string",
          description: "The environment variable name of the key to retrieve, e.g. OPENAI_API_KEY",
        },
        purpose: {
          type: "string",
          description: "Short description of why this key is being accessed, for the audit log",
        },
      },
      required: ["env_name"],
    },
  },
];

export function formatDocumentList(docs: DocumentMeta[]): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          docs.map((d) => ({
            id: d.id,
            title: d.title,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          })),
          null,
          2
        ),
      },
    ],
  };
}

export function formatDocument(doc: Document | null): MCPToolResult {
  if (!doc) {
    return {
      content: [{ type: "text", text: "Document not found" }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function formatWriteResult(doc: Document | null, created: boolean): MCPToolResult {
  if (!doc) {
    return {
      content: [{ type: "text", text: "Failed to write document" }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: created ? "created" : "updated",
            id: doc.id,
            title: doc.title,
            updatedAt: doc.updatedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function formatCreateResult(doc: Document): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "created",
            id: doc.id,
            title: doc.title,
            ...(doc.parentId ? { parent_id: doc.parentId } : {}),
            createdAt: doc.createdAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Apply block-level operations to document content and return an MCP-formatted result.
 */
export function applyBlockOperations(
  content: string,
  operations: BlockOperation[],
): BlockMutationResult {
  return applyOperations(content, operations);
}

export function formatBlockWriteResult(
  documentId: string,
  result: BlockMutationResult,
  operationCount: number,
): MCPToolResult {
  if (!result.success) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "error",
              document_id: documentId,
              error: result.error,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "updated",
            document_id: documentId,
            operations_applied: operationCount,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export function formatSearchResults(
  docs: Document[],
  query: string
): MCPToolResult {
  const q = query.toLowerCase();
  const scored = docs
    .map((doc) => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      if (titleLower.includes(q)) score += 10;
      if (contentLower.includes(q)) score += 5;
      q.split(/\s+/).forEach((word) => {
        if (titleLower.includes(word)) score += 3;
        if (contentLower.includes(word)) score += 1;
      });
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          scored.map((r) => ({
            id: r.doc.id,
            title: r.doc.title,
            score: r.score,
            snippet:
              r.doc.content.substring(0, 200) +
              (r.doc.content.length > 200 ? "..." : ""),
          })),
          null,
          2
        ),
      },
    ],
  };
}

export function formatDeleteResult(success: boolean): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: success
          ? "Document deleted successfully"
          : "Document not found",
      },
    ],
    isError: !success,
  };
}

export function formatAgentList(agents: Agent[]): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          agents.map((a) => ({
            id: a.id,
            name: a.name,
            avatar: a.avatar,
            status: a.status,
            capabilities: a.capabilities,
            personality: a.personality,
          })),
          null,
          2
        ),
      },
    ],
  };
}

export function formatAgentInfo(agent: Agent | null): MCPToolResult {
  if (!agent) {
    return {
      content: [{ type: "text", text: "Agent not found for the provided API key" }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            id: agent.id,
            name: agent.name,
            avatar: agent.avatar,
            color: agent.color,
            status: agent.status,
            personality: agent.personality,
            capabilities: agent.capabilities,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function formatAgentUpdateResult(agent: Agent | null): MCPToolResult {
  if (!agent) {
    return {
      content: [{ type: "text", text: "Failed to update agent profile" }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "updated",
            id: agent.id,
            name: agent.name,
            avatar: agent.avatar,
            personality: agent.personality,
            updatedAt: agent.updatedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function formatWorkspaceAgentList(agents: Agent[]): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          agents.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.personality,
            avatar: a.avatar,
          })),
          null,
          2
        ),
      },
    ],
  };
}

export interface CreateMentionInput {
  document_id: string;
  target_user_id: string;
  mention_text: string;
  context_text?: string;
  block_id?: string;
}

export async function handleCreateMention(
  input: CreateMentionInput,
  ctx: { agentId?: string; userId?: string; schoolId?: string | null },
): Promise<MCPToolResult> {
  const { document_id, target_user_id, mention_text, context_text, block_id } = input;

  if (!document_id || !target_user_id || !mention_text) {
    return {
      content: [{ type: "text", text: "Missing required fields: document_id, target_user_id, and mention_text are required" }],
      isError: true,
    };
  }

  const sourceId = ctx.agentId ?? ctx.userId;
  if (!sourceId) {
    return {
      content: [{ type: "text", text: "No authenticated context — cannot determine mention source" }],
      isError: true,
    };
  }

  if (!ctx.schoolId) {
    return {
      content: [{ type: "text", text: "No workspace context — school_id is required to create a mention" }],
      isError: true,
    };
  }

  const sourceType: MentionInsert["source_type"] = ctx.agentId ? "agent" : "human";

  // Resolve target_type from users table: agents use type='agent', humans use type='human' or null
  let targetType: MentionInsert["target_type"] = "human";
  try {
    const adminClient = createAdminClient();
    const { data: targetUser } = await adminClient
      .from("users")
      .select("type")
      .eq("id", target_user_id)
      .single();
    if (targetUser?.type === "agent") {
      targetType = "agent";
    }
  } catch {
    // Default to human if lookup fails (e.g. user not found)
  }

  const insertPayload: MentionInsert = {
    document_id,
    school_id: ctx.schoolId,
    source_type: sourceType,
    source_id: sourceId,
    target_type: targetType,
    target_id: target_user_id,
    target_name: mention_text.replace(/^@/, ""),
    mention_text,
    ...(context_text ? { context_text } : {}),
    ...(block_id ? { block_id } : {}),
    is_agent_generated: !!ctx.agentId,
  };

  try {
    const mention = await createMention(insertPayload);
    return formatCreateMentionResult(mention);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Failed to create mention: ${message}` }],
      isError: true,
    };
  }
}

export function formatCreateMentionResult(mention: Mention): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "created",
            id: mention.id,
            document_id: mention.document_id,
            target_id: mention.target_id,
            target_name: mention.target_name,
            mention_text: mention.mention_text,
            resolution_status: mention.resolution_status,
            created_at: mention.created_at,
          },
          null,
          2,
        ),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* update_task_status handler                                          */
/* ------------------------------------------------------------------ */

export interface UpdateTaskStatusInput {
  task_id: string;
  status?: "working" | "completed" | "failed";
  current_action?: string;
  progress_percent?: number;
  result_summary?: string;
  error_message?: string;
}

export async function handleUpdateTaskStatus(
  input: UpdateTaskStatusInput,
  ctx: { agentId?: string; userId?: string; schoolId?: string | null },
): Promise<MCPToolResult> {
  const { task_id, status, current_action, progress_percent, result_summary, error_message } =
    input;

  if (!task_id) {
    return {
      content: [{ type: "text", text: "Missing required field: task_id" }],
      isError: true,
    };
  }

  const adminClient = createAdminClient();

  const patch: Record<string, unknown> = {
    last_activity_at: new Date().toISOString(),
  };

  if (status === "completed") {
    patch.status = "completed";
    patch.completed_at = new Date().toISOString();
    if (result_summary) patch.result = result_summary;
  } else if (status === "failed") {
    patch.status = "failed";
    if (error_message) patch.result = error_message;
  } else if (status === "working") {
    patch.status = "working";
  }

  if (current_action) {
    patch.current_action = current_action;
  }

  if (typeof progress_percent === "number") {
    patch.progress_percent = Math.max(0, Math.min(100, progress_percent));
  }

  const { error } = await adminClient
    .from("agent_tasks")
    .update(patch)
    .eq("id", task_id);

  if (error) {
    return {
      content: [{ type: "text", text: `Failed to update task: ${error.message}` }],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "updated",
            task_id,
            task_status: patch.status ?? "unchanged",
            current_action: current_action ?? null,
            progress_percent: progress_percent ?? null,
          },
          null,
          2,
        ),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* stream_edit handler                                                  */
/* ------------------------------------------------------------------ */

export interface StreamEditInput {
  document_id: string;
  operation: string;
  content?: string;
  block_id?: string;
  task_id?: string;
}

export async function handleStreamEdit(
  input: StreamEditInput,
  ctx: { agentId?: string; userId?: string; schoolId?: string | null },
): Promise<MCPToolResult> {
  const { document_id, operation, content, block_id, task_id } = input;

  if (!document_id || !operation) {
    return {
      content: [{ type: "text", text: "Missing required fields: document_id and operation" }],
      isError: true,
    };
  }

  const adminClient = createAdminClient();

  const { data: page, error: fetchErr } = await adminClient
    .from("pages")
    .select("id, content_md, school_id")
    .eq("id", document_id)
    .single();

  if (fetchErr || !page) {
    return {
      content: [{ type: "text", text: "Page not found" }],
      isError: true,
    };
  }

  if (ctx.schoolId && page.school_id !== ctx.schoolId) {
    return {
      content: [{ type: "text", text: "Access denied" }],
      isError: true,
    };
  }

  const op: BlockOperation = {
    type: operation as BlockOperation["type"],
    block_id: block_id,
    content: content ? transformAgentContent(content) : content,
  };

  const result = applyOperations(page.content_md ?? "", [op]);

  if (!result.success) {
    return {
      content: [{ type: "text", text: `Edit failed: ${result.error}` }],
      isError: true,
    };
  }

  const { error: updateErr } = await adminClient
    .from("pages")
    .update({ content_md: result.content })
    .eq("id", document_id);

  if (updateErr) {
    return {
      content: [{ type: "text", text: `Failed to save: ${updateErr.message}` }],
      isError: true,
    };
  }

  if (task_id) {
    await adminClient
      .from("agent_tasks")
      .update({
        last_activity_at: new Date().toISOString(),
        current_action: `Editing document (${operation})`,
      })
      .eq("id", task_id)
      .then(() => {});
  }

  if (ctx.agentId && block_id) {
    adminClient
      .from("page_blocks")
      .update({
        modified_by: ctx.agentId,
        modified_by_type: "agent",
        modified_at: new Date().toISOString(),
      })
      .eq("block_id", block_id)
      .eq("page_id", document_id)
      .then(({ error: blockErr }) => {
        if (blockErr) console.error("[MCP] stream_edit block attribution error:", blockErr.message);
      });
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "applied",
            document_id,
            operation,
            block_id: block_id ?? null,
          },
          null,
          2,
        ),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Vault tool handlers                                                  */
/* ------------------------------------------------------------------ */

export async function handleListApis(
  ctx: { agentId?: string; userId?: string; schoolId?: string | null },
): Promise<MCPToolResult> {
  if (!ctx.schoolId) {
    return {
      content: [{ type: "text", text: "No workspace context — school_id is required" }],
      isError: true,
    };
  }

  const keys = await listVaultKeys(ctx.schoolId);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            apis: keys.map((k) => ({
              env_name: k.env_name,
              description: k.description,
            })),
          },
          null,
          2,
        ),
      },
    ],
  };
}

export interface GetApiKeyInput {
  env_name: string;
  purpose?: string;
}

export async function handleGetApiKey(
  input: GetApiKeyInput,
  ctx: { agentId?: string; userId?: string; schoolId?: string | null },
): Promise<MCPToolResult> {
  if (!ctx.schoolId) {
    return {
      content: [{ type: "text", text: "No workspace context — school_id is required" }],
      isError: true,
    };
  }

  if (!input.env_name) {
    return {
      content: [{ type: "text", text: "Missing required field: env_name" }],
      isError: true,
    };
  }

  const result = await decryptVaultKeyByEnvName(ctx.schoolId, input.env_name, {
    agentId: ctx.agentId,
    purpose: input.purpose,
  });

  if (!result) {
    return {
      content: [
        {
          type: "text",
          text: `API key "${input.env_name}" not found in the workspace vault. Use knobase_list_apis to see available keys.`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            env_name: result.env_name,
            description: result.description,
            value: result.value,
            expires_in: 300,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export function buildResourceList(docs: DocumentMeta[]): MCPResource[] {
  const resources: MCPResource[] = [
    {
      uri: "workspace://info",
      name: "Workspace Info",
      description: "Current workspace metadata and document count",
      mimeType: "application/json",
    },
  ];
  for (const doc of docs) {
    resources.push({
      uri: `document://${doc.id}`,
      name: doc.title || "Untitled",
      description: `Document updated ${doc.updatedAt}`,
      mimeType: "text/markdown",
    });
  }
  return resources;
}
