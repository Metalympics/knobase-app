import { NextRequest, NextResponse } from "next/server";
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/documents/store";
import { listAgents } from "@/lib/agents/store";
import {
  TOOL_DEFINITIONS,
  buildResourceList,
  formatDocumentList,
  formatDocument,
  formatWriteResult,
  formatSearchResults,
  formatDeleteResult,
  formatAgentList,
  type MCPToolResult,
} from "@/lib/mcp/tools";
import type { Document } from "@/lib/documents/types";

const SERVER_INFO = {
  name: "knobase-mcp",
  version: "1.0.0",
  protocolVersion: "2024-11-05",
};

function validateApiKey(req: NextRequest): boolean {
  const key = process.env.MCP_API_KEY;
  if (!key) return true; // no key configured = open access
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${key}`;
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Unauthorized" } },
      { status: 401 }
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
        result = executeTool(params as { name: string; arguments?: Record<string, unknown> });
        break;

      case "resources/list":
        result = { resources: buildResourceList(listDocuments()) };
        break;

      case "resources/read": {
        const uri = (params as { uri?: string })?.uri ?? "";
        result = readResource(uri);
        break;
      }

      case "ping":
        result = {};
        break;

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        });
    }

    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[mcp/route] Error:", message);
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32603, message } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", server: SERVER_INFO })}\n\n`
        )
      );

      const interval = setInterval(() => {
        const docs = listDocuments();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "sync", documentCount: docs.length, timestamp: new Date().toISOString() })}\n\n`
          )
        );
      }, 10000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function executeTool(params: { name: string; arguments?: Record<string, unknown> }): MCPToolResult {
  const { name, arguments: args = {} } = params;

  switch (name) {
    case "list_documents":
      return formatDocumentList(listDocuments());
    case "read_document":
      return formatDocument(getDocument(args.id as string));
    case "write_document": {
      const docId = args.id as string | undefined;
      const title = args.title as string | undefined;
      const content = args.content as string;
      if (docId) {
        const updated = updateDocument(docId, {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        });
        return formatWriteResult(updated, false);
      }
      const created = createDocument(title ?? "Untitled");
      if (content) {
        updateDocument(created.id, { content });
        created.content = content;
      }
      return formatWriteResult(created, true);
    }
    case "search_documents": {
      const query = args.query as string;
      const allDocs = listDocuments();
      const fullDocs: Document[] = allDocs
        .map((m) => getDocument(m.id))
        .filter((d): d is Document => d !== null);
      return formatSearchResults(fullDocs, query);
    }
    case "delete_document":
      return formatDeleteResult(deleteDocument(args.id as string));
    case "list_agents":
      return formatAgentList(listAgents());
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

function readResource(uri: string) {
  if (uri === "workspace://info") {
    const docs = listDocuments();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ name: "Knobase", documentCount: docs.length, documents: docs }, null, 2),
        },
      ],
    };
  }

  const match = uri.match(/^document:\/\/(.+)$/);
  if (match) {
    const doc = getDocument(match[1]);
    if (doc) {
      return {
        contents: [{ uri, mimeType: "text/markdown", text: doc.content }],
      };
    }
  }

  return { contents: [{ uri, mimeType: "text/plain", text: "Resource not found" }] };
}
