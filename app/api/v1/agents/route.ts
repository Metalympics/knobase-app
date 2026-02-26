import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import { listServerAgents } from "@/lib/api/server-store";
import { invokeAgentSchema, validateBody } from "@/lib/api/validation";

/**
 * REST API v1 - Agents
 * 
 * This endpoint lists available agents and provides metadata.
 * IMPORTANT: Knobase does NOT run AI natively.
 * Agents are external MCP-compatible agents that users connect.
 */

export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const agents = listServerAgents();
  return apiJson({
    data: agents.map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      status: a.status,
      capabilities: a.capabilities,
      type: "external", // All agents are external now
      connection: "mcp",
    })),
    note: "Knobase does not provide native AI. Agents are external MCP-compatible agents.",
  });
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const validation = validateBody(invokeAgentSchema, body);
  if (!validation.success) return validation.error;

  const { agentId, action, documentId } = validation.data;
  const agents = listServerAgents();
  const agent = agentId ? agents.find((a) => a.id === agentId) : agents[0];

  if (!agent) {
    return apiError("Agent not found", "NOT_FOUND", 404);
  }

  // Knobase does not run native AI
  // Agents must be invoked via MCP from external sources (OpenClaw, etc.)
  return apiError(
    "Native AI is disabled. Use MCP to invoke external agents.",
    "AI_NOT_AVAILABLE",
    501,
    {
      message: "Knobase is an agent-friendly workspace, not an AI service.",
      solution: "Connect an external agent via MCP (Settings > Integration)",
      documentation: "https://docs.knobase.ai/mcp-integration",
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      },
      action,
      documentId,
    }
  );
}
