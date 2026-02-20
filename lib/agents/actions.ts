import { agentChat, agentRead, agentSuggestEdit, agentSummarize } from "./bridge";
import { getDefaultAgent, addSuggestion } from "./store";
import type { AgentResponse, AgentSuggestion } from "./types";

/**
 * Agent Actions - Demo Mode
 * 
 * IMPORTANT: These functions provide UI demo functionality only.
 * Knobase does NOT run AI natively.
 * 
 * For real AI interactions:
 * - Connect an external agent via MCP (Settings → Integration)
 * - External agents read/write through the MCP server at /api/mcp
 * - Use OpenClaw or any MCP-compatible agent framework
 */

export async function readDocument(
  documentId: string,
  content: string
): Promise<AgentResponse> {
  return agentRead(documentId, content);
}

export async function suggestEdit(
  documentId: string,
  currentContent: string,
  instruction?: string
): Promise<AgentSuggestion> {
  const response = await agentSuggestEdit(documentId, currentContent, instruction);
  const agent = getDefaultAgent();

  const suggestion: AgentSuggestion = {
    id: crypto.randomUUID(),
    agentId: agent.id,
    documentId,
    originalContent: currentContent,
    suggestedContent: response.content,
    reasoning: response.reasoning ?? "",
    model: "demo-mode",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  addSuggestion(suggestion);
  return suggestion;
}

export async function chat(
  message: string,
  documentContext?: string
): Promise<AgentResponse> {
  return agentChat(message, documentContext);
}

export async function summarize(
  documentId: string,
  content: string
): Promise<AgentResponse> {
  return agentSummarize(documentId, content);
}
