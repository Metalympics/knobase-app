/**
 * MCP server handler — Supabase-backed.
 *
 * This module is the reusable core of the MCP JSON-RPC server.
 * It can be called from the Next.js API route or any other entry point.
 */

import {
  TOOL_DEFINITIONS,
  buildResourceList,
  formatDocumentList,
  formatDocument,
  formatSearchResults,
  formatCreateResult,
  formatDeleteResult,
  formatAgentList,
  formatAgentInfo,
  formatAgentUpdateResult,
  formatWorkspaceAgentList,
  applyBlockOperations,
  formatBlockWriteResult,
  handleCreateMention,
  type MCPToolResult,
} from "./tools";
import type { BlockOperation } from "@/lib/mcp/block-operations";
import {
  listPages,
  getPage,
  createPage,
  updatePageContent,
  deletePage,
  searchPages,
  getAgentProfile,
  updateAgentProfile,
  listWorkspaceAgents,
} from "./page-operations";

export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const SERVER_INFO = {
  name: "knobase-mcp",
  version: "1.0.0",
  protocolVersion: "2024-11-05",
};

export interface MCPContext {
  agentId?: string;
  userId?: string;
  schoolId?: string | null;
}

export async function handleMCPRequest(req: MCPRequest, ctx: MCPContext = {}): Promise<MCPResponse> {
  const { method, params, id } = req;

  switch (method) {
    case "initialize":
      return ok(id, {
        ...SERVER_INFO,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
      });

    case "tools/list":
      return ok(id, { tools: TOOL_DEFINITIONS });

    case "tools/call":
      return ok(id, await executeTool(params as { name: string; arguments?: Record<string, unknown> }, ctx));

    case "resources/list": {
      const pages = ctx.schoolId ? await listPages(ctx.schoolId) : [];
      return ok(id, {
        resources: buildResourceList(
          pages.map((p) => ({
            id: p.id,
            title: p.title,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            position: p.position ?? 0,
          })),
        ),
      });
    }

    case "resources/read": {
      const uri = (params as { uri?: string })?.uri ?? "";
      return ok(id, await readResource(uri, ctx));
    }

    case "ping":
      return ok(id, {});

    default:
      return err(id, -32601, `Method not found: ${method}`);
  }
}

async function executeTool(
  params: { name: string; arguments?: Record<string, unknown> },
  ctx: MCPContext = {},
): Promise<MCPToolResult> {
  const { name, arguments: args = {} } = params;

  if (!ctx.schoolId && !["get_agent_info", "update_agent_profile", "ping"].includes(name)) {
    return {
      content: [{ type: "text", text: "No workspace context — school_id required" }],
      isError: true,
    };
  }

  switch (name) {
    case "list_documents": {
      const pages = await listPages(ctx.schoolId!);
      return formatDocumentList(
        pages.map((p) => ({
          id: p.id,
          title: p.title,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          position: p.position ?? 0,
        })),
      );
    }

    case "read_document": {
      const page = await getPage(args.id as string);
      if (!page) return formatDocument(null);
      if (ctx.schoolId && page.school_id !== ctx.schoolId) return formatDocument(null);
      return formatDocument({
        id: page.id,
        title: page.title,
        content: page.content_md,
        createdAt: page.created_at,
        updatedAt: page.updated_at,
      });
    }

    case "write_document": {
      const pageId = args.document_id as string;
      const operations = args.operations as BlockOperation[];
      const page = await getPage(pageId);
      if (!page) {
        return formatBlockWriteResult(pageId, { success: false, content: "", error: "Page not found" }, 0);
      }
      if (ctx.schoolId && page.school_id !== ctx.schoolId) {
        return formatBlockWriteResult(pageId, { success: false, content: "", error: "Access denied" }, 0);
      }
      const result = applyBlockOperations(page.content_md, operations);
      if (result.success) {
        await updatePageContent(pageId, { content_md: result.content });
      }
      return formatBlockWriteResult(pageId, result, operations.length);
    }

    case "search_documents": {
      const query = args.query as string;
      const pages = await searchPages(ctx.schoolId!, query);
      return formatSearchResults(
        pages.map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content_md,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })),
        query,
      );
    }

    case "create_document": {
      const title = args.title as string;
      const parentId = typeof args.parent_id === "string" ? args.parent_id : undefined;
      const createdBy = ctx.agentId ?? ctx.userId;
      if (!createdBy) {
        return { content: [{ type: "text", text: "Cannot determine creator identity" }], isError: true };
      }
      const page = await createPage({
        title,
        content_md: typeof args.content === "string" ? args.content : "",
        school_id: ctx.schoolId!,
        created_by: createdBy,
        parent_id: parentId ?? null,
      });
      return formatCreateResult({
        id: page.id,
        title: page.title,
        content: page.content_md,
        createdAt: page.created_at,
        updatedAt: page.updated_at,
        parentId: page.parent_id ?? undefined,
      });
    }

    case "delete_document": {
      const delPage = await getPage(args.id as string);
      if (delPage && ctx.schoolId && delPage.school_id !== ctx.schoolId) {
        return { content: [{ type: "text", text: "Access denied" }], isError: true };
      }
      const success = await deletePage(args.id as string);
      return formatDeleteResult(success);
    }

    case "list_agents": {
      const agents = await listWorkspaceAgents(ctx.schoolId!);
      return formatAgentList(
        agents.map((a) => ({
          id: a.id,
          name: a.name ?? "Agent",
          avatar: a.avatar_url ?? "🤖",
          color: "#8B5CF6",
          status: "online" as const,
          personality: "",
          capabilities: ["read", "write"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      );
    }

    case "get_agent_info": {
      if (!ctx.agentId) {
        return { content: [{ type: "text", text: "No agent context — API key not associated with an agent" }], isError: true };
      }
      const profile = await getAgentProfile(ctx.agentId);
      if (!profile) return formatAgentInfo(null);
      return formatAgentInfo({
        id: profile.id,
        name: profile.name ?? "Agent",
        avatar: profile.avatar_url ?? "🤖",
        color: "#8B5CF6",
        status: "online",
        personality: "",
        capabilities: ["read", "write"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    case "update_agent_profile": {
      if (!ctx.agentId) {
        return { content: [{ type: "text", text: "No agent context — API key not associated with an agent" }], isError: true };
      }
      const patch: Record<string, string> = {};
      if (typeof args.name === "string") patch.name = args.name;
      if (typeof args.description === "string") patch.description = args.description;
      if (typeof args.avatar_url === "string") patch.avatar_url = args.avatar_url;
      if (Object.keys(patch).length === 0) {
        return { content: [{ type: "text", text: "No fields provided to update" }], isError: true };
      }
      const updated = await updateAgentProfile(ctx.agentId, patch);
      if (!updated) return formatAgentUpdateResult(null);
      return formatAgentUpdateResult({
        id: updated.id,
        name: updated.name ?? "Agent",
        avatar: updated.avatar_url ?? "🤖",
        color: "#8B5CF6",
        status: "online",
        personality: patch.description ?? "",
        capabilities: ["read", "write"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    case "list_workspace_agents": {
      const agents = await listWorkspaceAgents(ctx.schoolId!);
      return formatWorkspaceAgentList(
        agents.map((a) => ({
          id: a.id,
          name: a.name ?? "Agent",
          avatar: a.avatar_url ?? "🤖",
          color: "#8B5CF6",
          status: "online" as const,
          personality: "",
          capabilities: ["read", "write"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      );
    }

    case "create_mention":
      return handleCreateMention(
        {
          document_id: args.document_id as string,
          target_user_id: args.target_user_id as string,
          mention_text: args.mention_text as string,
          context_text: typeof args.context_text === "string" ? args.context_text : undefined,
          block_id: typeof args.block_id === "string" ? args.block_id : undefined,
        },
        { agentId: ctx.agentId, userId: ctx.userId, schoolId: ctx.schoolId },
      );

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

async function readResource(
  uri: string,
  ctx: MCPContext,
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  if (uri === "workspace://info") {
    const pages = ctx.schoolId ? await listPages(ctx.schoolId) : [];
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ name: "Knobase", pageCount: pages.length, pages }, null, 2),
        },
      ],
    };
  }

  const match = uri.match(/^(?:page|document):\/\/(.+)$/);
  if (match) {
    const page = await getPage(match[1]);
    if (page && (!ctx.schoolId || page.school_id === ctx.schoolId)) {
      return { contents: [{ uri, mimeType: "text/html", text: page.content_md }] };
    }
  }

  return { contents: [{ uri, mimeType: "text/plain", text: "Resource not found" }] };
}

function ok(id: string | number, result: unknown): MCPResponse {
  return { jsonrpc: "2.0", id, result };
}

function err(id: string | number, code: number, message: string): MCPResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
