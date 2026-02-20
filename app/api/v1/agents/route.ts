import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import { listServerAgents } from "@/lib/api/server-store";
import { invokeAgentSchema, validateBody } from "@/lib/api/validation";

export async function GET(request: NextRequest) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const agents = listServerAgents();
  return apiJson({
    data: agents.map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      status: a.status,
      capabilities: a.capabilities,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const validation = validateBody(invokeAgentSchema, body);
  if (!validation.success) return validation.error;

  const { agentId, action, documentId, content, context } = validation.data;
  const agents = listServerAgents();
  const agent = agentId ? agents.find((a) => a.id === agentId) : agents[0];

  if (!agent) {
    return apiError("Agent not found", "NOT_FOUND", 404);
  }

  try {
    const { callAI } = await import("@/lib/agents/ai-provider");

    const prompts: Record<string, { system: string; user: string }> = {
      read: {
        system: "You are a helpful AI assistant. Analyze the document and provide insights.",
        user: `Analyze this document:\n\n${content ?? ""}`,
      },
      write: {
        system: "You are a helpful AI assistant. Help write and improve content.",
        user: context
          ? `Context: ${context}\n\nContent:\n${content ?? ""}\n\nSuggest improvements.`
          : `Improve this content:\n\n${content ?? ""}`,
      },
      chat: {
        system: "You are a helpful AI assistant.",
        user: context ? `[Context]\n${context}\n\n[Message]\n${content ?? ""}` : content ?? "",
      },
      summarize: {
        system: "You are a helpful AI assistant. Create concise summaries.",
        user: `Summarize:\n\n${content ?? ""}`,
      },
    };

    const prompt = prompts[action];
    const result = await callAI(prompt.system, prompt.user);

    return apiJson({
      data: {
        agentId: agent.id,
        agentName: agent.name,
        action,
        documentId,
        content: result.content,
        reasoning: result.reasoning,
        model: result.model,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent invocation failed";
    return apiError(message, "AGENT_ERROR", 500);
  }
}
