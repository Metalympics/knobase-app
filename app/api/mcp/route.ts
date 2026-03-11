import { NextRequest, NextResponse } from "next/server";
import {
  TOOL_DEFINITIONS,
  applyBlockOperations,
  formatBlockWriteResult,
  handleCreateMention,
  type MCPToolResult,
} from "@/lib/mcp/tools";
import { validateApiKey as validateApiKeyFromHeader, ApiKeyError } from "@/lib/auth/api-key";
import { findApiKeyByRawToken } from "@/lib/supabase/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";
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
  type PageMeta,
} from "@/lib/mcp/page-operations";
import type { BlockOperation } from "@/lib/mcp/block-operations";
import { addCorsHeaders, handlePreflight } from "@/lib/api/cors";

const SERVER_INFO = {
  name: "knobase-mcp",
  version: "1.0.0",
  protocolVersion: "2024-11-05",
};

interface MCPApiContext {
  agentId?: string;
  userId?: string;
  schoolId?: string | null;
}

/**
 * Resolve identity from the request. Supports three auth methods:
 * 1. X-API-Key header → api_keys table (user-level programmatic keys)
 * 2. Authorization: Bearer <kb_...> → agent_api_keys table (agent keys)
 * 3. Legacy: Bearer token matching MCP_API_KEY env var
 */
async function resolveApiContext(req: NextRequest): Promise<MCPApiContext | null> {
  // Method 1: X-API-Key header → api_keys table
  if (req.headers.has("x-api-key")) {
    try {
      const identity = await validateApiKeyFromHeader(req);
      const adminClient = createAdminClient();
      const { data: profile } = await adminClient
        .from("users")
        .select("id, type")
        .eq("id", identity.user_id)
        .single();

      return {
        userId: identity.user_id,
        agentId: profile?.type === "agent" ? profile.id : undefined,
        schoolId: identity.school_id,
      };
    } catch (err) {
      if (err instanceof ApiKeyError) return null;
      throw err;
    }
  }

  // Method 2: Authorization: Bearer <kb_...> → agent_api_keys table
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    if (token.startsWith("kb_")) {
      const agentKey = await findApiKeyByRawToken(token);
      if (!agentKey) return null;

      return {
        agentId: agentKey.agent_id ?? undefined,
        userId: agentKey.agent_id ?? undefined,
        schoolId: agentKey.school_id,
      };
    }

    // Method 3: Legacy MCP_API_KEY env var
    const legacyKey = process.env.MCP_API_KEY;
    if (legacyKey && token === legacyKey) {
      const agentId = req.headers.get("x-agent-id") ?? undefined;
      return { agentId };
    }

    return null;
  }

  return null;
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

export async function POST(request: NextRequest) {
  const ctx = await resolveApiContext(request);
  if (!ctx) {
    return addCorsHeaders(
      request,
      NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Unauthorized" } },
        { status: 401 },
      ),
    );
  }

  try {
    const body = await request.json();
    const { method, params, id } = body as {
      jsonrpc: string;
      id: string | number;
      method: string;
      params?: Record<string, unknown>;
    };

    let result: unknown;

    switch (method) {
      case "initialize":
        result = {
          ...SERVER_INFO,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
        };
        break;

      case "tools/list":
        result = { tools: TOOL_DEFINITIONS };
        break;

      case "tools/call":
        result = await executeTool(
          params as { name: string; arguments?: Record<string, unknown> },
          ctx,
        );
        break;

      case "resources/list": {
        if (!ctx.schoolId) {
          result = { resources: [] };
          break;
        }
        const pages = await listPages(ctx.schoolId);
        result = { resources: buildResourceList(pages) };
        break;
      }

      case "resources/read": {
        const uri = (params as { uri?: string })?.uri ?? "";
        result = await readResource(uri, ctx);
        break;
      }

      case "ping":
        result = {};
        break;

      default:
        return addCorsHeaders(
          request,
          NextResponse.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          }),
        );
    }

    return addCorsHeaders(request, NextResponse.json({ jsonrpc: "2.0", id, result }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[mcp/route] Error:", message);
    return addCorsHeaders(
      request,
      NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32603, message } },
        { status: 500 },
      ),
    );
  }
}

export async function GET(request: NextRequest) {
  const getCtx = await resolveApiContext(request);
  if (!getCtx) {
    return addCorsHeaders(request, new Response("Unauthorized", { status: 401 }));
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", server: SERVER_INFO })}\n\n`,
        ),
      );

      const interval = setInterval(async () => {
        try {
          const pages = getCtx.schoolId ? await listPages(getCtx.schoolId) : [];
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "sync",
                pageCount: pages.length,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          );
        } catch {
          /* swallow — SSE heartbeat is best-effort */
        }
      }, 10000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return addCorsHeaders(
    request,
    new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Tool execution (Supabase-backed)                                    */
/* ------------------------------------------------------------------ */

async function executeTool(
  params: { name: string; arguments?: Record<string, unknown> },
  ctx: MCPApiContext = {},
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
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              pages.map((p) => ({
                id: p.id,
                title: p.title,
                icon: p.icon,
                parent_id: p.parent_id,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
              })),
              null,
              2,
            ),
          },
        ],
      };
    }

    case "read_document": {
      const page = await getPage(args.id as string);
      if (!page) {
        return { content: [{ type: "text", text: "Page not found" }], isError: true };
      }
      if (ctx.schoolId && page.school_id !== ctx.schoolId) {
        return { content: [{ type: "text", text: "Access denied" }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: page.id,
                title: page.title,
                content: page.content_md,
                icon: page.icon,
                parent_id: page.parent_id,
                createdAt: page.created_at,
                updatedAt: page.updated_at,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "write_document": {
      const pageId = args.document_id as string;
      const operations = args.operations as BlockOperation[];
      const page = await getPage(pageId);
      if (!page) {
        return formatBlockWriteResult(
          pageId,
          { success: false, content: "", error: "Page not found" },
          0,
        );
      }
      if (ctx.schoolId && page.school_id !== ctx.schoolId) {
        return formatBlockWriteResult(
          pageId,
          { success: false, content: "", error: "Access denied" },
          0,
        );
      }

      const result = applyBlockOperations(page.content_md, operations);
      if (result.success) {
        await updatePageContent(pageId, { content_md: result.content });

        if (ctx.agentId || ctx.userId) {
          const modifiedBy = ctx.agentId ?? ctx.userId;
          const adminClient = createAdminClient();
          for (const op of operations) {
            if (op.block_id) {
              adminClient
                .from("page_blocks")
                .update({
                  modified_by: modifiedBy,
                  modified_by_type: ctx.agentId ? "agent" : "user",
                  modified_at: new Date().toISOString(),
                })
                .eq("block_id", op.block_id)
                .eq("page_id", pageId)
                .then(({ error: blockErr }) => {
                  if (blockErr) {
                    console.error("[MCP] Block attribution error:", blockErr.message);
                  }
                });
            }
          }
        }
      }
      return formatBlockWriteResult(pageId, result, operations.length);
    }

    case "search_documents": {
      const query = args.query as string;
      const pages = await searchPages(ctx.schoolId!, query);
      const q = query.toLowerCase();

      const scored = pages
        .map((p) => {
          let score = 0;
          if (p.title.toLowerCase().includes(q)) score += 10;
          if (p.content_md.toLowerCase().includes(q)) score += 5;
          q.split(/\s+/).forEach((word) => {
            if (p.title.toLowerCase().includes(word)) score += 3;
            if (p.content_md.toLowerCase().includes(word)) score += 1;
          });
          return { page: p, score };
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
                id: r.page.id,
                title: r.page.title,
                score: r.score,
                snippet:
                  r.page.content_md.substring(0, 200) +
                  (r.page.content_md.length > 200 ? "..." : ""),
              })),
              null,
              2,
            ),
          },
        ],
      };
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
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "created",
                id: page.id,
                title: page.title,
                parent_id: page.parent_id,
                createdAt: page.created_at,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "delete_document": {
      const pageId = args.id as string;
      const page = await getPage(pageId);
      if (page && ctx.schoolId && page.school_id !== ctx.schoolId) {
        return { content: [{ type: "text", text: "Access denied" }], isError: true };
      }
      const success = await deletePage(pageId);
      return {
        content: [{ type: "text", text: success ? "Page deleted successfully" : "Page not found" }],
        isError: !success,
      };
    }

    case "list_agents": {
      const agents = await listWorkspaceAgents(ctx.schoolId!);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              agents.map((a) => ({ id: a.id, name: a.name, avatar: a.avatar_url, type: a.type })),
              null,
              2,
            ),
          },
        ],
      };
    }

    case "get_agent_info": {
      if (!ctx.agentId) {
        return {
          content: [{ type: "text", text: "No agent context — API key not associated with an agent" }],
          isError: true,
        };
      }
      const agent = await getAgentProfile(ctx.agentId);
      if (!agent) {
        return { content: [{ type: "text", text: "Agent not found" }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { id: agent.id, name: agent.name, avatar: agent.avatar_url, type: agent.type },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "update_agent_profile": {
      if (!ctx.agentId) {
        return {
          content: [{ type: "text", text: "No agent context — API key not associated with an agent" }],
          isError: true,
        };
      }
      const patch: Record<string, string> = {};
      if (typeof args.name === "string") patch.name = args.name;
      if (typeof args.description === "string") patch.description = args.description;
      if (typeof args.avatar_url === "string") patch.avatar_url = args.avatar_url;
      if (Object.keys(patch).length === 0) {
        return { content: [{ type: "text", text: "No fields provided to update" }], isError: true };
      }
      const updated = await updateAgentProfile(ctx.agentId, patch);
      if (!updated) {
        return { content: [{ type: "text", text: "Failed to update agent profile" }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { status: "updated", id: updated.id, name: updated.name, avatar: updated.avatar_url },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "list_workspace_agents": {
      const agents = await listWorkspaceAgents(ctx.schoolId!);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              agents.map((a) => ({ id: a.id, name: a.name, avatar: a.avatar_url })),
              null,
              2,
            ),
          },
        ],
      };
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

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

function buildResourceList(pages: PageMeta[]) {
  const resources = [
    {
      uri: "workspace://info",
      name: "Workspace Info",
      description: "Current workspace metadata and page count",
      mimeType: "application/json",
    },
  ];
  for (const p of pages) {
    resources.push({
      uri: `page://${p.id}`,
      name: p.title || "Untitled",
      description: `Page updated ${p.updated_at}`,
      mimeType: "text/html",
    });
  }
  return resources;
}

async function readResource(uri: string, ctx: MCPApiContext) {
  if (uri === "workspace://info") {
    const pages = ctx.schoolId ? await listPages(ctx.schoolId) : [];
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            { name: "Knobase", pageCount: pages.length, pages },
            null,
            2,
          ),
        },
      ],
    };
  }

  const match = uri.match(/^(?:page|document):\/\/(.+)$/);
  if (match) {
    const page = await getPage(match[1]);
    if (page && (!ctx.schoolId || page.school_id === ctx.schoolId)) {
      return {
        contents: [{ uri, mimeType: "text/html", text: page.content_md }],
      };
    }
  }

  return { contents: [{ uri, mimeType: "text/plain", text: "Resource not found" }] };
}
