import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { DOCUMENT_FORMAT_GUIDE } from "@/lib/agents/document-format-guide";

/**
 * SSE streaming endpoint for OpenClaw agent responses.
 *
 * This route acts as a proxy/bridge:
 *  1. Client sends a task (prompt, documentId, agentId)
 *  2. Route opens an SSE connection to the configured OpenClaw daemon
 *  3. Streams agent response chunks back to the browser as SSE events
 *
 * If no OpenClaw endpoint is configured, the route falls back to a local
 * echo/demo that simulates streaming so the frontend never breaks.
 *
 * Event types sent to the client:
 *  - "delta"       → { content: string }           (incremental text)
 *  - "suggestion"  → { original, proposed, explanation }
 *  - "cursor"      → { anchor, head, status }      (agent cursor position)
 *  - "status"      → { status: "reading"|"editing"|... }
 *  - "done"        → { result: string }             (full final text)
 *  - "error"       → { message: string }
 */

export const runtime = "edge";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseAdmin(url, key);
}

type TaskStatus = "pending" | "acknowledged" | "working" | "completed" | "failed" | "cancelled";
const TERMINAL_STATUSES: TaskStatus[] = ["completed", "failed", "cancelled"];

async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  extra: Record<string, unknown> = {},
) {
  const sb = getSupabase();
  if (!sb) return;
  const { data: task } = await sb
    .from("agent_tasks")
    .select("status")
    .eq("id", taskId)
    .single();
  if (task && TERMINAL_STATUSES.includes(task.status as TaskStatus)) return;
  await sb
    .from("agent_tasks")
    .update({ status, last_activity_at: new Date().toISOString(), ...extra })
    .eq("id", taskId);
}

export async function POST(request: NextRequest) {
  let body: {
    taskId: string;
    prompt: string;
    documentId: string;
    documentTitle?: string;
    agentId?: string;
    context?: string;
    openclawEndpoint?: string;
    openclawApiKey?: string;
    requestingUserId?: string;
    schoolId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { taskId, prompt, documentId, documentTitle, agentId, context, requestingUserId, schoolId } = body;

  if (!taskId || !prompt || !documentId) {
    return NextResponse.json(
      { error: "Missing required fields: taskId, prompt, documentId" },
      { status: 400 },
    );
  }

  const openclawEndpoint = body.openclawEndpoint;
  const openclawApiKey = body.openclawApiKey;

  // Derive the public base URL so OpenClaw can call back
  const origin =
    request.headers.get("x-forwarded-proto") && request.headers.get("host")
      ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("host")}`
      : request.nextUrl.origin;
  const callbackUrl = `${origin}/api/v1/agents/tasks/${taskId}`;
  const mcpEndpoint = `${origin}/api/mcp`;

  const encoder = new TextEncoder();

  function sendEvent(
    controller: ReadableStreamDefaultController,
    event: string,
    data: unknown,
  ) {
    controller.enqueue(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Server-side fallback: mark the task as working before streaming begins.
      // If OpenClaw or the browser already updated the status, this is a safe no-op
      // because updateTaskStatus checks for terminal statuses.
      await updateTaskStatus(taskId, "working", {
        started_at: new Date().toISOString(),
        current_action: "processing",
      }).catch(() => {});

      let streamResult = "";
      let streamError: string | null = null;

      if (openclawEndpoint) {
        try {
          streamResult = await streamFromOpenClaw(
            controller,
            sendEvent,
            openclawEndpoint,
            openclawApiKey ?? "",
            { taskId, prompt, documentId, documentTitle, agentId, context, callbackUrl, mcpEndpoint, requestingUserId, schoolId },
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "OpenClaw stream failed";
          streamError = msg;
          sendEvent(controller, "error", { message: msg });
        }
      } else {
        streamResult = await streamLocalDemo(controller, sendEvent, prompt, taskId);
      }

      // Server-side fallback: mark complete or failed after stream ends.
      if (streamError) {
        await updateTaskStatus(taskId, "failed", {
          error_message: streamError,
          completed_at: new Date().toISOString(),
        }).catch(() => {});
      } else {
        await updateTaskStatus(taskId, "completed", {
          completed_at: new Date().toISOString(),
          progress_percent: 100,
          current_action: null,
          result_summary: streamResult.slice(0, 500) || null,
        }).catch(() => {});
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/* ------------------------------------------------------------------ */
/* OpenClaw proxy stream                                               */
/* ------------------------------------------------------------------ */

async function streamFromOpenClaw(
  controller: ReadableStreamDefaultController,
  sendEvent: (
    c: ReadableStreamDefaultController,
    e: string,
    d: unknown,
  ) => void,
  endpoint: string,
  apiKey: string,
  params: {
    taskId: string;
    prompt: string;
    documentId: string;
    documentTitle?: string;
    agentId?: string;
    context?: string;
    callbackUrl: string;
    mcpEndpoint: string;
    requestingUserId?: string;
    schoolId?: string;
  },
): Promise<string> {
  sendEvent(controller, "status", { status: "connecting" });

  // Build explicit instructions so the agent knows how to use Knobase tools
  // and specifically how to mention the requesting user when done.
  const knobaseContext = {
    mcp_endpoint: params.mcpEndpoint,
    api_key: apiKey || undefined,
    agent_id: params.agentId,
    requesting_user_id: params.requestingUserId,
    school_id: params.schoolId,
    available_tools: [
      "list_documents",
      "read_document",
      "write_document",
      "stream_edit",
      "search_documents",
      "create_document",
      "delete_document",
      "list_agents",
      "get_agent_info",
      "create_mention",
      "update_task_status",
    ],
    instructions: [
      "You are an AI agent operating inside the Knobase workspace platform.",
      `You have access to workspace tools via the Knobase MCP endpoint: ${params.mcpEndpoint}`,
      `Authenticate all MCP calls with the API key provided in this context.`,
      "",
      "PROGRESS & STATUS — update_task_status:",
      `Your current task ID is: ${params.taskId}. Use update_task_status to report your progress in real-time.`,
      "Call it with status='working' and a current_action string (e.g. 'Reading document...', 'Analyzing content...') so the user sees live feedback.",
      "Call it with status='completed' and result_summary when you're done, or status='failed' and error_message if something goes wrong.",
      "",
      "STREAMING EDITS — stream_edit:",
      "Use stream_edit to apply incremental edits to a document during your response. Each call applies one operation.",
      "This is preferred over write_document when making progressive changes that should be visible to the user in real-time.",
      "Supported operations: append, prepend, replace_block, insert_after_block, insert_before_block, delete_block.",
      "Pass your task_id so the user sees 'Editing document...' in the status bar.",
      "",
      "MENTIONS — create_mention:",
      "Use this tool to @mention and notify a user when you complete a task, want their attention, or need to reply.",
      "Parameters: document_id (required), target_user_id (required), mention_text (e.g. '@Alice'), context_text (summary of your work).",
      params.requestingUserId
        ? `The user who requested this task has ID: ${params.requestingUserId}. Use create_mention with their ID to notify them when you are done.`
        : "Use list_agents or get_agent_info to find the requesting user's ID, then use create_mention to notify them.",
      "",
      "DOCUMENT TOOLS:",
      "• read_document — Read a document's content by ID",
      "• write_document — Apply block-level edits atomically (all-or-nothing)",
      "• stream_edit — Apply a single incremental edit (preferred for real-time feedback)",
      "• search_documents — Full-text search across all workspace documents",
      "• create_document — Create a new document",
      "• list_documents — List all documents in the workspace",
      "",
      DOCUMENT_FORMAT_GUIDE,
    ].join("\n"),
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: params.taskId,
      method: "tools/call",
      params: {
        name: "agent_respond",
        arguments: {
          taskId: params.taskId,
          prompt: params.prompt,
          documentId: params.documentId,
          documentTitle: params.documentTitle,
          agentId: params.agentId,
          context: params.context,
          stream: true,
          callbackUrl: params.callbackUrl,
          mcpEndpoint: params.mcpEndpoint,
          apiKey: apiKey || undefined,
          knobase_context: knobaseContext,
        },
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    const msg = `OpenClaw returned ${res.status}: ${errorText}`;
    sendEvent(controller, "error", { message: msg });
    throw new Error(msg);
  }

  if (!res.body) {
    const msg = "No response body from OpenClaw";
    sendEvent(controller, "error", { message: msg });
    throw new Error(msg);
  }

  sendEvent(controller, "status", { status: "responding" });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let sseBuffer = "";
  let currentSseEvent = ""; // Tracks the `event:` field for SSE frames

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });

    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() ?? "";

    for (const line of lines) {
      // Track SSE event type (e.g. `event: response.output_text.delta`)
      if (line.startsWith("event: ")) {
        currentSseEvent = line.slice(7).trim();
        continue;
      }

      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6);
      if (raw === "[DONE]") continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw);
      } catch {
        // Non-JSON data line — treat as raw text delta
        if (raw) {
          fullText += raw;
          sendEvent(controller, "delta", { content: raw });
        }
        continue;
      }

      // Derive a canonical event key from either the SSE `event:` line,
      // the JSON `type` field, or the `stream` field (AgentEventPayload).
      const eventType =
        currentSseEvent ||
        (data.type as string) ||
        (data.stream as string) ||
        "";
      currentSseEvent = ""; // Consume once

      // ── OpenResponses API events ───────────────────────────────
      if (eventType === "response.output_text.delta") {
        const delta = (data.delta as string) ?? "";
        fullText += delta;
        sendEvent(controller, "delta", { content: delta });
        continue;
      }
      if (eventType === "response.output_text.done") {
        const text = (data.text as string) ?? fullText;
        fullText = text;
        continue;
      }
      if (eventType === "response.created") {
        sendEvent(controller, "lifecycle", { phase: "start" });
        continue;
      }
      if (eventType === "response.completed") {
        // Final text may come from the nested response object
        continue;
      }
      if (
        eventType === "response.function_call_arguments.delta" ||
        eventType === "response.function_call.delta"
      ) {
        sendEvent(controller, "tool_call", {
          name: (data.name as string) ?? (data.tool as string) ?? "function",
          delta: (data.delta as string) ?? "",
        });
        continue;
      }
      if (eventType === "response.output_item.added") {
        const item = data.item as Record<string, unknown> | undefined;
        if (item?.type === "function_call") {
          sendEvent(controller, "tool_call", {
            name: (item.name as string) ?? "function",
            params: item.arguments ?? null,
          });
        }
        continue;
      }
      if (eventType === "response.output_item.done") {
        const item = data.item as Record<string, unknown> | undefined;
        if (item?.type === "function_call") {
          sendEvent(controller, "tool_result", {
            name: (item.name as string) ?? "function",
            result: item.output ?? null,
          });
        }
        continue;
      }

      // ── AgentEventPayload stream types ─────────────────────────
      const payload = (data.data ?? data) as Record<string, unknown>;
      if (eventType === "lifecycle") {
        sendEvent(controller, "lifecycle", { phase: payload.phase ?? "start" });
        if (payload.phase === "error") {
          const errMsg = (payload.error as string) ?? "Agent run failed";
          sendEvent(controller, "error", { message: errMsg });
          throw new Error(errMsg);
        }
        continue;
      }
      if (eventType === "assistant") {
        const delta = (payload.delta as string) ?? "";
        if (delta) {
          fullText += delta;
          sendEvent(controller, "delta", { content: delta });
        }
        continue;
      }
      if (eventType === "tool") {
        const toolType = (payload.type as string) ?? "";
        if (toolType === "tool.call") {
          sendEvent(controller, "tool_call", {
            name: (payload.tool as string) ?? "function",
            params: payload.params ?? null,
          });
        } else if (toolType === "tool.result") {
          sendEvent(controller, "tool_result", {
            name: (payload.tool as string) ?? "function",
            result: payload.result ?? null,
          });
        }
        continue;
      }
      if (eventType === "error") {
        const errMsg = (payload.message as string) ?? (data.message as string) ?? "Unknown error";
        sendEvent(controller, "error", { message: errMsg });
        throw new Error(errMsg);
      }

      // ── Gateway chat events ────────────────────────────────────
      if (eventType === "chat.delta") {
        const delta = (payload.delta as string) ?? (data.delta as string) ?? "";
        if (delta) {
          fullText += delta;
          sendEvent(controller, "delta", { content: delta });
        }
        continue;
      }
      if (eventType === "chat.done" || eventType === "chat.final") {
        continue; // lifecycle:end + done event below will finalize
      }

      // ── Thinking / reasoning ───────────────────────────────────
      if (
        eventType === "thinking" ||
        eventType === "reasoning" ||
        eventType === "response.reasoning.delta"
      ) {
        const content = (payload.delta as string) ?? (payload.content as string) ?? (data.delta as string) ?? "";
        if (content) {
          sendEvent(controller, "thinking", { content });
        }
        continue;
      }

      // ── Legacy / simple event format (original handler) ────────
      if (eventType === "delta" || data.content || data.delta) {
        const content = (data.content as string) ?? (data.delta as string) ?? "";
        if (content) {
          fullText += content;
          sendEvent(controller, "delta", { content });
        }
        continue;
      }
      if (eventType === "suggestion" || data.type === "suggestion") {
        sendEvent(controller, "suggestion", {
          original: (data.original as string) ?? "",
          proposed: (data.proposed as string) ?? (data.content as string) ?? "",
          explanation: (data.explanation as string) ?? "",
        });
        continue;
      }
      if (eventType === "cursor" || data.type === "cursor") {
        sendEvent(controller, "cursor", {
          anchor: data.anchor,
          head: data.head,
          status: data.status ?? "editing",
        });
        continue;
      }
      if (eventType === "done" || eventType === "complete" || data.type === "done" || data.type === "complete") {
        fullText = (data.result as string) ?? (data.content as string) ?? fullText;
        continue;
      }
      if (eventType === "status") {
        sendEvent(controller, "status", { status: (data.status as string) ?? "" });
        continue;
      }
    }
  }

  sendEvent(controller, "done", { result: fullText });
  return fullText;
}

/* ------------------------------------------------------------------ */
/* Local demo stream (when no OpenClaw is configured)                  */
/* ------------------------------------------------------------------ */

async function streamLocalDemo(
  controller: ReadableStreamDefaultController,
  sendEvent: (
    c: ReadableStreamDefaultController,
    e: string,
    d: unknown,
  ) => void,
  prompt: string,
  taskId: string,
): Promise<string> {
  sendEvent(controller, "lifecycle", { phase: "start" });
  sendEvent(controller, "status", { status: "thinking" });

  // Simulate thinking phase with streamed reasoning
  const thinkingSteps = [
    "Let me analyze the document context... ",
    "Considering the prompt and what would be most helpful... ",
    "Formulating a comprehensive response.",
  ];
  for (const step of thinkingSteps) {
    await sleep(200 + Math.random() * 150);
    sendEvent(controller, "thinking", { content: step });
  }

  await sleep(200);
  sendEvent(controller, "status", { status: "responding" });

  // Simulate a tool call for richer demo experience
  if (prompt.toLowerCase().includes("document") || prompt.toLowerCase().includes("review")) {
    sendEvent(controller, "tool_call", { name: "read_document", params: { documentId: taskId } });
    await sleep(600 + Math.random() * 400);
    sendEvent(controller, "tool_result", { name: "read_document", result: { success: true } });
    await sleep(150);
  }

  const response = generateDemoResponse(prompt);
  const words = response.split(" ");
  let fullText = "";

  for (let i = 0; i < words.length; i++) {
    const word = (i > 0 ? " " : "") + words[i];
    fullText += word;
    sendEvent(controller, "delta", { content: word });

    const delay = 30 + Math.min(words[i].length * 8, 80) + Math.random() * 40;
    await sleep(delay);
  }

  sendEvent(controller, "lifecycle", { phase: "end" });
  sendEvent(controller, "done", { result: fullText });
  return fullText;
}

function generateDemoResponse(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("summary") || lower.includes("summarize")) {
    return "This document covers the key concepts and implementation details discussed throughout. The main points include the architecture decisions, the integration approach with external services, and the collaboration model between human users and AI agents. Key takeaways are the emphasis on real-time editing, MCP-based agent connectivity, and encrypted credential management.";
  }

  if (lower.includes("review") || lower.includes("feedback")) {
    return "Overall the document is well-structured. A few suggestions: (1) The introduction could benefit from a clearer thesis statement. (2) Consider adding concrete examples in section 2 to support the claims. (3) The conclusion effectively summarizes the main points but could include forward-looking recommendations. (4) Minor: check for consistency in terminology between 'agent' and 'assistant' usage throughout.";
  }

  if (lower.includes("rewrite") || lower.includes("improve")) {
    return "Here's an improved version that enhances clarity and flow while preserving the original meaning. The key changes focus on tightening the prose, using more active voice constructions, and ensuring each paragraph leads logically to the next.";
  }

  if (lower.includes("code") || lower.includes("implement")) {
    return "Here's a suggested implementation approach. First, define the interface with clear type boundaries. Then implement the core logic with proper error handling. Finally, add unit tests covering the main paths and edge cases. The implementation should prioritize readability and maintainability over premature optimization.";
  }

  if (lower.includes("explain") || lower.includes("what")) {
    return "This section explains the concept by breaking it down into its core components. At a high level, the system works by maintaining synchronized document state across multiple clients using a CRDT-based approach. Each change is expressed as an operation that can be applied in any order while converging to the same final state.";
  }

  return `Based on the prompt "${prompt}", here is my analysis. The document's current content provides a solid foundation. I recommend focusing on three key areas: structure, completeness, and clarity. Each section should clearly state its purpose, provide supporting evidence, and connect to the overall narrative. Let me know if you'd like me to elaborate on any specific aspect.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
