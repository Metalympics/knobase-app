export interface OpenClawAction {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  prompt: string;
}

export interface OpenClawSkill {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  actions: OpenClawAction[];
  mcpEndpoint: string;
}

export const knobaseSkill: OpenClawSkill = {
  name: "knobase",
  displayName: "Knobase",
  description:
    "AI-powered knowledge base integration. Read, write, search, and manage documents with Claw AI assistance.",
  version: "1.0.0",
  author: "Knobase Team",
  icon: "brain",
  mcpEndpoint: "http://localhost:3000/api/mcp",
  actions: [
    {
      name: "open_knobase",
      description: "Open the Knobase workspace and return current state",
      parameters: {},
      prompt:
        "Connect to my Knobase workspace and show me the current state including document list and workspace info.",
    },
    {
      name: "create_document",
      description: "Create a new document in Knobase",
      parameters: {
        title: {
          type: "string",
          description: "Title of the new document",
          required: true,
        },
        content: {
          type: "string",
          description: "Initial content in markdown",
          required: false,
        },
      },
      prompt:
        "Create a new document in my knowledge base with the given title and content.",
    },
    {
      name: "edit_with_ai",
      description:
        "Use the Claw AI agent to suggest edits to a document",
      parameters: {
        documentId: {
          type: "string",
          description: "ID of the document to edit",
          required: true,
        },
        instruction: {
          type: "string",
          description: "What kind of edit to make",
          required: false,
        },
      },
      prompt:
        "Have Claw review and suggest improvements to the specified document. Use the agent's capabilities for writing and suggesting.",
    },
    {
      name: "search_knowledge",
      description: "Search across all documents in Knobase",
      parameters: {
        query: {
          type: "string",
          description: "Search query",
          required: true,
        },
      },
      prompt:
        "Search my Knobase workspace for documents matching the query and return relevant results with snippets.",
    },
    {
      name: "list_documents",
      description: "List all documents with metadata",
      parameters: {},
      prompt:
        "List all documents in my Knobase workspace with their titles and last updated timestamps.",
    },
    {
      name: "read_document",
      description: "Read the full content of a document",
      parameters: {
        documentId: {
          type: "string",
          description: "ID of the document to read",
          required: true,
        },
      },
      prompt:
        "Read and return the full content of the specified document from my Knobase workspace.",
    },
  ],
};

export function buildMCPCall(
  actionName: string,
  args: Record<string, unknown>
): { method: string; params: Record<string, unknown> } {
  switch (actionName) {
    case "open_knobase":
      return { method: "resources/read", params: { uri: "workspace://info" } };
    case "create_document":
      return {
        method: "tools/call",
        params: { name: "write_document", arguments: args },
      };
    case "edit_with_ai":
      return {
        method: "tools/call",
        params: {
          name: "read_document",
          arguments: { id: args.documentId },
        },
      };
    case "search_knowledge":
      return {
        method: "tools/call",
        params: { name: "search_documents", arguments: args },
      };
    case "list_documents":
      return { method: "tools/call", params: { name: "list_documents", arguments: {} } };
    case "read_document":
      return {
        method: "tools/call",
        params: {
          name: "read_document",
          arguments: { id: args.documentId },
        },
      };
    default:
      throw new Error(`Unknown action: ${actionName}`);
  }
}
