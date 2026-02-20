import type { AgentAction, AgentResponse } from "./types";

/**
 * Agent Bridge - External Agent Only
 * 
 * This module provides the client-side interface for agent interactions.
 * IMPORTANT: Knobase does NOT run AI natively.
 * 
 * How it works:
 * 1. External agents (OpenClaw, etc.) connect via MCP server at /api/mcp
 * 2. Those agents read/write documents through the MCP protocol
 * 3. This bridge is for UI demo purposes and future external agent orchestration
 * 
 * The "Claw" agent you see in the UI is a placeholder/mascot, not a real AI.
 * Real AI interactions happen through MCP-connected external agents.
 */

interface QueueItem {
  action: AgentAction;
  resolve: (res: AgentResponse) => void;
  reject: (err: Error) => void;
  retries: number;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
let queue: QueueItem[] = [];
let processing = false;

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const item = queue.shift()!;
    try {
      const result = await callAgentAPI(item.action);
      item.resolve(result);
    } catch (err) {
      if (item.retries < MAX_RETRIES) {
        item.retries++;
        queue.unshift(item);
        await new Promise((r) => setTimeout(r, RETRY_DELAY * item.retries));
      } else {
        item.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  processing = false;
}

async function callAgentAPI(action: AgentAction): Promise<AgentResponse> {
  // This endpoint now returns a helpful error directing users to MCP
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });

  const body = await res.json();

  // Return the error as a message so UI can handle it gracefully
  if (!res.ok || !body.success) {
    return {
      success: false,
      content: body.message || body.error || "Native AI is disabled. Use MCP to connect external agents.",
      agentId: "claw-demo",
      timestamp: new Date().toISOString(),
    };
  }

  return body;
}

export function sendAgentAction(action: AgentAction): Promise<AgentResponse> {
  return new Promise((resolve, reject) => {
    queue.push({ action, resolve, reject, retries: 0 });
    processQueue();
  });
}

/**
 * Chat with the demo agent
 * NOTE: This is a UI demo only. Real AI requires connecting via MCP.
 */
export async function agentChat(
  message: string,
  documentContext?: string
): Promise<AgentResponse> {
  // Return a helpful message explaining that Knobase doesn't run AI natively
  return {
    success: true,
    content: `Hi! I'm Claw, your friendly workspace mascot. 🐾\n\nI don't run AI myself—I'm just here to help you navigate Knobase.\n\nTo use AI with your documents:\n1. Go to Settings → Integration\n2. Connect OpenClaw or any MCP-compatible agent\n3. Your external agent will be able to read and write documents here\n\nKnobase is your agent's workspace, not the agent itself.`,
    agentId: "claw-demo",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Suggest edit - Demo only
 * NOTE: Real AI editing requires connecting via MCP.
 */
export async function agentSuggestEdit(
  documentId: string,
  content: string,
  instruction?: string
): Promise<AgentResponse> {
  return {
    success: true,
    content: `To get AI suggestions, connect an external agent via MCP:\n\n1. Go to Settings → Integration\n2. Connect your OpenClaw instance\n3. Use your AI agent to suggest edits through the MCP interface`,
    reasoning: "Demo mode - Connect external agent for real AI",
    agentId: "claw-demo",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Summarize - Demo only
 * NOTE: Real AI summarization requires connecting via MCP.
 */
export async function agentSummarize(
  documentId: string,
  content: string
): Promise<AgentResponse> {
  return {
    success: true,
    content: `To summarize documents with AI:\n\n1. Connect an external agent via MCP (Settings → Integration)\n2. Your agent will have full read access to documents\n3. Use your AI to generate summaries`,
    reasoning: "Demo mode - Connect external agent for real AI",
    agentId: "claw-demo",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Read document - Demo only
 */
export async function agentRead(
  documentId: string,
  content: string
): Promise<AgentResponse> {
  return {
    success: true,
    content: `Document analysis requires an external AI agent.\n\nConnect via MCP to enable AI-powered document insights.`,
    agentId: "claw-demo",
    timestamp: new Date().toISOString(),
  };
}
