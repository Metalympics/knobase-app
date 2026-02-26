import type { Editor } from "@tiptap/react";
import {
  beginWork,
  reportProgress,
  completeWithResult,
  handleFailure,
} from "@/lib/agents/task-coordinator";
import { createProposal } from "@/lib/supabase/proposals";
import { agentActivity } from "@/lib/activity/logger";
import type { InlineSuggestionData } from "@/components/agent/inline-suggestion";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface StreamHandlerConfig {
  taskId: string;
  prompt: string;
  documentId: string;
  documentTitle: string;
  agentId: string;
  agentName: string;
  /** Position in the document where the inline agent node is */
  insertPos: number;
  /** Optional existing text selection that the agent is editing */
  selectedText?: string;
  /** OpenClaw endpoint (from localStorage) */
  openclawEndpoint?: string;
  /** OpenClaw API key (from localStorage) */
  openclawApiKey?: string;
  /** Workspace ID for Supabase coordination */
  workspaceId?: string;
}

export interface StreamCallbacks {
  onDelta?: (content: string, fullText: string) => void;
  onSuggestion?: (suggestion: InlineSuggestionData) => void;
  onCursor?: (cursor: { anchor: number; head: number; status: string }) => void;
  onStatus?: (status: string) => void;
  onDone?: (result: string) => void;
  onError?: (message: string) => void;
}

/* ------------------------------------------------------------------ */
/* Stream handler                                                      */
/* ------------------------------------------------------------------ */

/**
 * Connects to the /api/agent/stream SSE endpoint and streams the agent
 * response back into the editor. Handles:
 *  - Incremental text insertion into the document
 *  - Suggestion creation (accept/reject flow)
 *  - Task store updates (status, result)
 *  - Agent activity logging
 */
export class AgentStreamHandler {
  private abortController: AbortController | null = null;
  private fullText = "";
  private config: StreamHandlerConfig;
  private callbacks: StreamCallbacks;

  constructor(config: StreamHandlerConfig, callbacks: StreamCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Start the streaming response. Returns a promise that resolves with
   * the full response text when the stream completes.
   */
  async start(): Promise<string> {
    this.abortController = new AbortController();

    // Mark task as working in Supabase
    beginWork(this.config.taskId, {
      agentId: this.config.agentId,
      agentName: this.config.agentName,
    }, `responding to: "${this.config.prompt.slice(0, 60)}"`).
      catch(() => { /* best effort */ });

    agentActivity.log(
      this.config.agentId,
      this.config.agentName,
      "agent-mention-response",
      `responding to: "${this.config.prompt.slice(0, 60)}${this.config.prompt.length > 60 ? "..." : ""}"`,
      {
        documentId: this.config.documentId,
        documentTitle: this.config.documentTitle,
        silent: true,
      },
    );

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: this.config.taskId,
          prompt: this.config.prompt,
          documentId: this.config.documentId,
          documentTitle: this.config.documentTitle,
          agentId: this.config.agentId,
          context: this.config.selectedText,
          openclawEndpoint: this.config.openclawEndpoint,
          openclawApiKey: this.config.openclawApiKey,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      await this.processStream(response.body);

      // Complete the task in Supabase
      completeWithResult(
        this.config.taskId,
        {
          agentId: this.config.agentId,
          agentName: this.config.agentName,
        },
        this.fullText.slice(0, 500),
      ).catch(() => { /* best effort */ });

      this.callbacks.onDone?.(this.fullText);

      agentActivity.logTaskComplete(
        this.config.agentId,
        this.config.agentName,
        this.config.documentId,
        `completed: "${this.config.prompt.slice(0, 60)}${this.config.prompt.length > 60 ? "..." : ""}"`,
      );

      return this.fullText;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Cancellation is handled by cancelAgentStream → handleCancellation
        return this.fullText;
      }

      const message = err instanceof Error ? err.message : "Stream failed";
      handleFailure(
        this.config.taskId,
        this.config.agentId,
        this.config.documentId,
        message,
      ).catch(() => { /* best effort */ });
      this.callbacks.onError?.(message);

      agentActivity.logError(
        this.config.agentId,
        this.config.agentName,
        message,
      );

      throw err;
    }
  }

  /** Abort the stream */
  abort() {
    this.abortController?.abort();
  }

  /** Process the SSE response body */
  private async processStream(
    body: ReadableStream<Uint8Array>,
  ) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEvent = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const raw = line.slice(6);
          try {
            const data = JSON.parse(raw);
            this.handleEvent(currentEvent, data);
          } catch {
            // Non-JSON, treat as raw text
            if (currentEvent === "delta") {
              this.handleEvent("delta", { content: raw });
            }
          }
        }
      }
    }
  }

  private handleEvent(event: string, data: Record<string, unknown>) {
    switch (event) {
      case "delta":
        this.fullText += (data.content as string) ?? "";
        this.callbacks.onDelta?.(
          (data.content as string) ?? "",
          this.fullText,
        );
        break;

      case "suggestion": {
        const suggestion: InlineSuggestionData = {
          id: crypto.randomUUID(),
          agentId: this.config.agentId,
          originalText: (data.original as string) ?? "",
          suggestedText: (data.proposed as string) ?? "",
          explanation: (data.explanation as string) ?? undefined,
          range: {
            from: this.config.insertPos,
            to: this.config.insertPos + ((data.original as string) ?? "").length,
          },
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        this.callbacks.onSuggestion?.(suggestion);

        // Persist as Supabase proposal
        createProposal({
          task_id: this.config.taskId,
          document_id: this.config.documentId,
          edit_type: "replace",
          original_content: { text: suggestion.originalText },
          proposed_content: { text: suggestion.suggestedText },
          explanation: suggestion.explanation ?? null,
        }).catch(() => { /* best effort */ });
        break;
      }

      case "cursor":
        this.callbacks.onCursor?.(
          data as unknown as {
            anchor: number;
            head: number;
            status: string;
          },
        );
        break;

      case "status":
        this.callbacks.onStatus?.((data.status as string) ?? "");
        break;

      case "done":
        this.fullText = (data.result as string) ?? this.fullText;
        break;

      case "error":
        this.callbacks.onError?.((data.message as string) ?? "Unknown error");
        break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Helper: connect the stream handler to an editor instance            */
/* ------------------------------------------------------------------ */

/**
 * Creates an AgentStreamHandler wired to the editor for inline text
 * insertion. The streamed response replaces the inline agent node
 * with real text in the document.
 */
export function createEditorStreamHandler(
  editor: Editor,
  config: StreamHandlerConfig,
  onSuggestion?: (suggestion: InlineSuggestionData) => void,
): AgentStreamHandler {
  let nodePos: number | null = null;
  let streamNodeDeleted = false;

  // Find the inline agent node position by taskId
  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name === "inlineAgent" &&
      node.attrs.taskId === config.taskId &&
      nodePos === null
    ) {
      nodePos = pos;
    }
  });

  return new AgentStreamHandler(config, {
    onDelta(content, fullText) {
      if (!editor || editor.isDestroyed) return;

      // On first delta, delete the inline agent node and place cursor there
      if (!streamNodeDeleted && nodePos !== null) {
        try {
          // Delete the inline-agent node
          const tr = editor.state.tr;
          const node = tr.doc.nodeAt(nodePos);
          if (node && node.type.name === "inlineAgent") {
            tr.delete(nodePos, nodePos + node.nodeSize);
            // Insert the full text so far at that position
            tr.insertText(fullText, nodePos);
            editor.view.dispatch(tr);
            streamNodeDeleted = true;
            return;
          }
        } catch {
          // Node may have been moved — fall through to append
        }
      }

      // Subsequent deltas: append at the end of the running text
      if (streamNodeDeleted && nodePos !== null) {
        try {
          const insertAt = nodePos + fullText.length - content.length;
          const tr = editor.state.tr;
          tr.insertText(content, insertAt);
          editor.view.dispatch(tr);
        } catch {
          // Position may be invalid — skip this delta
        }
      }
    },

    onSuggestion(suggestion) {
      onSuggestion?.(suggestion);
    },

    onCursor(cursor) {
      // Forward cursor updates to awareness if provider is available
      // This is handled by the inline-agent.ts caller
    },

    onStatus(status) {
      // Could be used to update the pending block UI
    },

    onDone(result) {
      // If we never got deltas (e.g., suggestion-only flow), insert the result
      if (!streamNodeDeleted && nodePos !== null && result) {
        try {
          const tr = editor.state.tr;
          const node = tr.doc.nodeAt(nodePos);
          if (node && node.type.name === "inlineAgent") {
            tr.delete(nodePos, nodePos + node.nodeSize);
            tr.insertText(result, nodePos);
            editor.view.dispatch(tr);
          }
        } catch {
          // Best effort
        }
      }
    },

    onError(message) {
      console.error("[AgentStream] Error:", message);
      // The task store update is handled by the stream handler itself
    },
  });
}

/* ------------------------------------------------------------------ */
/* Helper: read OpenClaw config from localStorage                      */
/* ------------------------------------------------------------------ */

const LS_PREFIX = "knobase-app:";

export function getOpenClawConfig(): {
  endpoint: string | null;
  apiKey: string | null;
} {
  if (typeof window === "undefined") return { endpoint: null, apiKey: null };
  return {
    endpoint: localStorage.getItem(`${LS_PREFIX}openclaw-endpoint`) || null,
    apiKey: localStorage.getItem(`${LS_PREFIX}openclaw-apikey`) || null,
  };
}
