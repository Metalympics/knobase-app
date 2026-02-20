import type { AgentAction, AgentResponse } from "./types";

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
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Agent API error: ${res.status}`);
  }

  return res.json();
}

export function sendAgentAction(action: AgentAction): Promise<AgentResponse> {
  return new Promise((resolve, reject) => {
    queue.push({ action, resolve, reject, retries: 0 });
    processQueue();
  });
}

export async function agentChat(
  message: string,
  documentContext?: string
): Promise<AgentResponse> {
  return sendAgentAction({
    action: "chat",
    content: message,
    context: documentContext,
  });
}

export async function agentSuggestEdit(
  documentId: string,
  content: string,
  instruction?: string
): Promise<AgentResponse> {
  return sendAgentAction({
    action: "write",
    documentId,
    content,
    context: instruction,
  });
}

export async function agentSummarize(
  documentId: string,
  content: string
): Promise<AgentResponse> {
  return sendAgentAction({
    action: "summarize",
    documentId,
    content,
  });
}

export async function agentRead(
  documentId: string,
  content: string
): Promise<AgentResponse> {
  return sendAgentAction({
    action: "read",
    documentId,
    content,
  });
}
