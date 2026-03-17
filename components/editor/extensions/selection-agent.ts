import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Agent } from "@/lib/agents/store";
import { syncTaskToSupabase } from "@/lib/agents/sync-bridge";
import {
  createEditorStreamHandler,
  getOpenClawConfig,
  type AgentStreamHandler,
} from "@/lib/agents/stream-handler";
import type { InlineSuggestionData } from "@/components/agent/inline-suggestion";
import { getCurrentUserId } from "@/lib/schools/store";

/* ------------------------------------------------------------------ */
/* Selection Agent Plugin                                               */
/*                                                                      */
/* Manages a ProseMirror decoration that pulses over the selected       */
/* range while an agent is processing. Exposes a simple API via         */
/* plugin meta to add/remove the highlight.                             */
/* ------------------------------------------------------------------ */

export const selectionAgentPluginKey = new PluginKey("selectionAgent");

interface SelectionAgentState {
  processing: boolean;
  range: { from: number; to: number } | null;
  taskId: string | null;
}

export function createSelectionAgentPlugin() {
  return new Plugin<SelectionAgentState>({
    key: selectionAgentPluginKey,
    state: {
      init(): SelectionAgentState {
        return { processing: false, range: null, taskId: null };
      },
      apply(tr, value): SelectionAgentState {
        const meta = tr.getMeta(selectionAgentPluginKey) as
          | Partial<SelectionAgentState>
          | undefined;
        if (meta) {
          return { ...value, ...meta };
        }
        if (value.range) {
          return {
            ...value,
            range: {
              from: tr.mapping.map(value.range.from),
              to: tr.mapping.map(value.range.to),
            },
          };
        }
        return value;
      },
    },
    props: {
      decorations(state) {
        const pluginState = selectionAgentPluginKey.getState(state) as
          | SelectionAgentState
          | undefined;
        if (!pluginState?.range || !pluginState.processing) {
          return DecorationSet.empty;
        }
        const { from, to } = pluginState.range;
        const safeFrom = Math.max(0, Math.min(from, state.doc.content.size));
        const safeTo = Math.max(safeFrom, Math.min(to, state.doc.content.size));
        if (safeFrom >= safeTo) return DecorationSet.empty;

        const deco = Decoration.inline(safeFrom, safeTo, {
          class: "selection-agent-highlight-inline processing",
        });
        return DecorationSet.create(state.doc, [deco]);
      },
    },
  });
}

/* ------------------------------------------------------------------ */
/* Helpers to control the plugin from outside                           */
/* ------------------------------------------------------------------ */

export function startSelectionHighlight(
  editor: Editor,
  range: { from: number; to: number },
  taskId: string,
) {
  const tr = editor.state.tr.setMeta(selectionAgentPluginKey, {
    processing: true,
    range,
    taskId,
  });
  editor.view.dispatch(tr);
}

export function stopSelectionHighlight(editor: Editor) {
  const tr = editor.state.tr.setMeta(selectionAgentPluginKey, {
    processing: false,
    range: null,
    taskId: null,
  });
  editor.view.dispatch(tr);
}

/* ------------------------------------------------------------------ */
/* Active streams for selection-agent tasks                             */
/* ------------------------------------------------------------------ */

const activeSelectionStreams = new Map<string, AgentStreamHandler>();

/**
 * Create a selection-based agent task. The selected text is sent as
 * context and the instruction is the user prompt. The agent response
 * replaces the selection when accepted.
 */
export async function createSelectionAgentTask(
  editor: Editor,
  agent: Agent,
  instruction: string,
  selectedText: string,
  range: { from: number; to: number },
  documentId: string,
  documentTitle: string,
  schoolId: string,
  userId?: string,
  onSuggestion?: (suggestion: InlineSuggestionData) => void,
  onDone?: () => void,
): Promise<string> {
  const prompt = `${instruction}\n\n---\nSelected text:\n${selectedText}`;

  let supabaseTaskId: string;
  try {
    const { taskId } = await syncTaskToSupabase({
      documentId,
      schoolId,
      prompt,
      mentionedAgent: `@${agent.name}`,
      agentId: agent.id,
      agentName: agent.name,
      userId: userId ?? getCurrentUserId() ?? "anonymous",
    });
    supabaseTaskId = taskId;
  } catch (err) {
    console.error("[SelectionAgent] sync-bridge failed, using local ID:", err);
    supabaseTaskId = crypto.randomUUID();
  }

  // Fire-and-forget OpenClaw notification
  import("@/lib/agents/mention-handler")
    .then(({ handleAgentMention }) => {
      handleAgentMention({
        documentId,
        schoolId,
        mentionedAgent: `@${agent.name}`,
        message: prompt,
        context: selectedText,
        userId: userId ?? getCurrentUserId() ?? "anonymous",
      }).catch(() => {});
    })
    .catch(() => {});

  // Start pulsing highlight
  startSelectionHighlight(editor, range, supabaseTaskId);

  const openclawConfig = getOpenClawConfig();

  const streamHandler = createEditorStreamHandler(
    editor,
    {
      taskId: supabaseTaskId,
      prompt,
      documentId,
      documentTitle,
      agentId: agent.id,
      agentName: agent.name,
      insertPos: range.from,
      selectedText,
      openclawEndpoint: openclawConfig.endpoint ?? undefined,
      openclawApiKey: openclawConfig.apiKey ?? undefined,
      schoolId,
    },
    (suggestion) => {
      // Adjust suggestion range to cover the original selection
      const adjusted: InlineSuggestionData = {
        ...suggestion,
        originalText: selectedText,
        range: { from: range.from, to: range.to },
      };
      onSuggestion?.(adjusted);
    },
  );

  activeSelectionStreams.set(supabaseTaskId, streamHandler);

  streamHandler
    .start()
    .then(() => {
      stopSelectionHighlight(editor);
      onDone?.();
    })
    .catch((err) => {
      console.error("[SelectionAgent] Stream error:", err);
      stopSelectionHighlight(editor);
    })
    .finally(() => {
      activeSelectionStreams.delete(supabaseTaskId);
    });

  return supabaseTaskId;
}

export function cancelSelectionAgentStream(
  taskId: string,
  editor: Editor,
): void {
  const handler = activeSelectionStreams.get(taskId);
  if (handler) {
    handler.abort();
    activeSelectionStreams.delete(taskId);
  }
  stopSelectionHighlight(editor);
}
