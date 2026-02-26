import { NextRequest, NextResponse } from "next/server";

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
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { taskId, prompt, documentId, documentTitle, agentId, context } = body;

  if (!taskId || !prompt || !documentId) {
    return NextResponse.json(
      { error: "Missing required fields: taskId, prompt, documentId" },
      { status: 400 },
    );
  }

  const openclawEndpoint = body.openclawEndpoint;
  const openclawApiKey = body.openclawApiKey;

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
      // If we have an OpenClaw endpoint, proxy the real stream
      if (openclawEndpoint) {
        try {
          await streamFromOpenClaw(
            controller,
            sendEvent,
            openclawEndpoint,
            openclawApiKey ?? "",
            { taskId, prompt, documentId, documentTitle, agentId, context },
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "OpenClaw stream failed";
          sendEvent(controller, "error", { message: msg });
        }
      } else {
        // Fallback: local demo stream so frontend works without OpenClaw
        await streamLocalDemo(controller, sendEvent, prompt, taskId);
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
  },
) {
  sendEvent(controller, "status", { status: "connecting" });

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
          prompt: params.prompt,
          documentId: params.documentId,
          documentTitle: params.documentTitle,
          agentId: params.agentId,
          context: params.context,
          stream: true,
        },
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    sendEvent(controller, "error", {
      message: `OpenClaw returned ${res.status}: ${errorText}`,
    });
    return;
  }

  if (!res.body) {
    sendEvent(controller, "error", { message: "No response body from OpenClaw" });
    return;
  }

  sendEvent(controller, "status", { status: "responding" });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines from the OpenClaw response
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === "delta" || data.content) {
            const content = data.content ?? data.delta ?? "";
            fullText += content;
            sendEvent(controller, "delta", { content });
          } else if (data.type === "suggestion") {
            sendEvent(controller, "suggestion", {
              original: data.original ?? "",
              proposed: data.proposed ?? data.content ?? "",
              explanation: data.explanation ?? "",
            });
          } else if (data.type === "cursor") {
            sendEvent(controller, "cursor", {
              anchor: data.anchor,
              head: data.head,
              status: data.status ?? "editing",
            });
          } else if (data.type === "done" || data.type === "complete") {
            fullText = data.result ?? data.content ?? fullText;
          } else if (data.type === "error") {
            sendEvent(controller, "error", {
              message: data.message ?? "Unknown error",
            });
            return;
          }
        } catch {
          // Non-JSON data line — treat as raw text delta
          const content = line.slice(6);
          if (content && content !== "[DONE]") {
            fullText += content;
            sendEvent(controller, "delta", { content });
          }
        }
      }
    }
  }

  sendEvent(controller, "done", { result: fullText });
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
) {
  sendEvent(controller, "status", { status: "thinking" });
  await sleep(400);

  sendEvent(controller, "status", { status: "responding" });

  // Generate a contextual response based on the prompt
  const response = generateDemoResponse(prompt);
  const words = response.split(" ");
  let fullText = "";

  for (let i = 0; i < words.length; i++) {
    const word = (i > 0 ? " " : "") + words[i];
    fullText += word;
    sendEvent(controller, "delta", { content: word });

    // Simulate varying speed — faster for common words, slower for longer ones
    const delay = 30 + Math.min(words[i].length * 8, 80) + Math.random() * 40;
    await sleep(delay);
  }

  sendEvent(controller, "done", { result: fullText });
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
