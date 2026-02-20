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
} from "./tools";
import type { Document } from "@/lib/documents/types";

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

export function handleMCPRequest(req: MCPRequest): MCPResponse {
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
      return ok(id, executeTool(params as { name: string; arguments?: Record<string, unknown> }));

    case "resources/list":
      return ok(id, { resources: buildResourceList(listDocuments()) });

    case "resources/read": {
      const uri = (params as { uri?: string })?.uri ?? "";
      return ok(id, readResource(uri));
    }

    case "ping":
      return ok(id, {});

    default:
      return err(id, -32601, `Method not found: ${method}`);
  }
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

function readResource(uri: string): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  if (uri === "workspace://info") {
    const docs = listDocuments();
    const name =
      typeof window !== "undefined"
        ? localStorage.getItem("knobase-app:workspace") ?? "Knobase"
        : "Knobase";
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            { name, documentCount: docs.length, documents: docs },
            null,
            2
          ),
        },
      ],
    };
  }

  const match = uri.match(/^document:\/\/(.+)$/);
  if (match) {
    const doc = getDocument(match[1]);
    if (doc) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: doc.content,
          },
        ],
      };
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
