import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";
import type { AgentTask } from "@/lib/agents/task-types";
import { syncTaskToSupabase } from "@/lib/agents/sync-bridge";
import {
  createEditorStreamHandler,
  getOpenClawConfig,
  type AgentStreamHandler,
} from "@/lib/agents/stream-handler";
import type { InlineSuggestionData } from "@/components/agent/inline-suggestion";
import { InlineAgentNodeView } from "./inline-agent-view";
import type { MentionableUser, HumanMention, AIMention, Mention } from "@/lib/mentions/types";
import { notifyMentionedUser } from "@/lib/mentions/store";
import { getCurrentUserId } from "@/lib/schools/store";
import type { Agent } from "@/lib/agents/store";

export interface InlineAgentOptions {
  HTMLAttributes: Record<string, string>;
}

interface InlineAgentStorage {
  showAgentSelector: boolean;
  position: { top: number; left: number };
  query: string;
  onTaskCreate: ((task: AgentTask) => void) | null;
  onTaskUpdate: ((taskId: string, updates: Partial<AgentTask>) => void) | null;
  onTaskCancel: ((taskId: string) => void) | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineAgent: {
      insertInlineAgent: (taskId: string) => ReturnType;
      updateInlineAgent: (taskId: string, updates: Partial<AgentTask>) => ReturnType;
      insertMention: (mention: Mention) => ReturnType;
    };
  }
  
  interface EditorStorage {
    inlineAgent: InlineAgentStorage;
  }
}

export const InlineAgent = Node.create<InlineAgentOptions>({
  name: "inlineAgent",

  group: "inline",

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      taskId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-task-id"),
        renderHTML: (attributes) => {
          if (!attributes.taskId) return {};
          return { "data-task-id": attributes.taskId };
        },
      },
      mention: {
        default: null,
        parseHTML: (element) => {
          const mentionData = element.getAttribute("data-mention");
          return mentionData ? JSON.parse(mentionData) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.mention) return {};
          return {
            "data-mention": JSON.stringify(attributes.mention),
            "data-mention-type": attributes.mention.type,
          };
        },
      },
      // Transient attrs — used by the React node view to manage the inline
      // prompt → progress → result lifecycle.  Not serialized to HTML.
      promptMode: { default: false, renderHTML: () => ({}) },
      agentId: { default: null, renderHTML: () => ({}) },
      agentName: { default: null, renderHTML: () => ({}) },
      agentModel: { default: null, renderHTML: () => ({}) },
      agentAvatar: { default: null, renderHTML: () => ({}) },
      agentColor: { default: null, renderHTML: () => ({}) },
      documentId: { default: null, renderHTML: () => ({}) },
      documentTitle: { default: null, renderHTML: () => ({}) },
      schoolId: { default: null, renderHTML: () => ({}) },
      userId: { default: null, renderHTML: () => ({}) },
      submittedPrompt: { default: null, renderHTML: () => ({}) },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-agent"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        { "data-type": "inline-agent" }
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineAgentNodeView);
  },

  addCommands() {
    return {
      insertInlineAgent:
        (taskId: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { taskId },
          });
        },
      updateInlineAgent:
        (taskId: string, updates: Partial<AgentTask>) =>
        ({ tr, state }) => {
          let updated = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.taskId === taskId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                ...updates,
              });
              updated = true;
            }
          });
          return updated;
        },
      insertMention:
        (mention: Mention) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { 
              taskId: mention.type === 'ai' ? mention.taskId : null,
              mention: mention,
            },
          });
        },
    };
  },

  addKeyboardShortcuts() {
    const isSelectorOpen = () => {
      const s = this.editor.storage as unknown as { inlineAgent: InlineAgentStorage };
      return s.inlineAgent.showAgentSelector;
    };

    return {
      "@": () => {
        const { state, dispatch } = this.editor.view;
        const { selection } = state;
        const { $from } = selection;

        const textBefore = $from.parent.textContent.slice(
          Math.max(0, $from.parentOffset - 1),
          $from.parentOffset
        );

        if (textBefore !== " " && textBefore !== "" && $from.parentOffset !== 0) {
          return false;
        }

        if (dispatch) {
          const tr = state.tr.insertText("@");
          dispatch(tr);
        }

        const storage = this.editor.storage as unknown as { inlineAgent: InlineAgentStorage };
        storage.inlineAgent.showAgentSelector = true;
        storage.inlineAgent.position = this.editor.view.coordsAtPos(
          selection.from + 1
        );

        return true;
      },
      // Swallow navigation/selection keys when the agent selector dropdown
      // is open so ProseMirror doesn't act on them. The AgentSelector's
      // own document-level keydown listener handles the actual behavior.
      Enter: () => isSelectorOpen(),
      Tab: () => isSelectorOpen(),
      ArrowUp: () => isSelectorOpen(),
      ArrowDown: () => isSelectorOpen(),
      Escape: () => {
        const storage = this.editor.storage as unknown as { inlineAgent: InlineAgentStorage };
        if (storage.inlineAgent.showAgentSelector) {
          storage.inlineAgent.showAgentSelector = false;
          return true;
        }
        return false;
      },
    };
  },

  addStorage() {
    return {
      showAgentSelector: false,
      position: { top: 0, left: 0 },
      query: "",
      onTaskCreate: null as ((task: AgentTask) => void) | null,
      onTaskUpdate: null as ((taskId: string, updates: Partial<AgentTask>) => void) | null,
      onTaskCancel: null as ((taskId: string) => void) | null,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("inlineAgentDetection"),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, set) {
            set = set.map(tr.mapping, tr.doc);
            
            const { selection } = tr;
            const { $from } = selection;
            const textBefore = $from.parent.textContent.slice(
              Math.max(0, $from.parentOffset - 20),
              $from.parentOffset
            );

            // Only match @ at start-of-line or after whitespace to avoid
            // triggering on mid-word @ (e.g. email addresses).
            const mentionMatch = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
            const storage = editor.storage as unknown as { inlineAgent: InlineAgentStorage };

            if (mentionMatch) {
              storage.inlineAgent.showAgentSelector = true;
              // Empty capture group = bare @, show all options (query = "")
              storage.inlineAgent.query = mentionMatch[1];
              const coords = editor.view.coordsAtPos(selection.from);
              storage.inlineAgent.position = coords;
            } else {
              storage.inlineAgent.showAgentSelector = false;
              storage.inlineAgent.query = "";
            }

            return set;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },

  onCreate() {
    // Realtime task updates are handled via Supabase subscriptions
    // in the useDocumentTasks hook — no local store subscription needed.
  },
});

/**
 * Active stream handlers keyed by taskId, so they can be cancelled.
 */
const activeStreams = new Map<string, AgentStreamHandler>();

/**
 * Suggestion callback registry. The TiptapEditor can register a handler
 * to receive inline suggestions from the agent stream.
 */
let onSuggestionCallback: ((suggestion: InlineSuggestionData) => void) | null = null;

export function setOnSuggestionCallback(
  cb: ((suggestion: InlineSuggestionData) => void) | null,
): void {
  onSuggestionCallback = cb;
}

/**
 * Create an agent task and start the SSE stream. Returns the Supabase task ID
 * so the caller (typically InlineAgentNodeView) can wire the node to it.
 *
 * The inline-agent node is expected to ALREADY be in the document when this
 * function is called — the AgentSelector inserts it in "promptMode" and the
 * node view flips it to progress mode then calls this function.
 */
export async function createInlineAgentTask(
  editor: Editor,
  agent: Agent,
  prompt: string,
  documentId: string,
  documentTitle: string,
  schoolId: string,
  userId?: string,
): Promise<string> {
  const { from } = editor.state.selection;

  // Gather surrounding context for the mention
  const docSize = editor.state.doc.content.size;
  const contextBefore = editor.state.doc.textBetween(
    Math.max(0, from - 200),
    from,
    "\n",
  );
  const contextAfter = editor.state.doc.textBetween(
    from,
    Math.min(docSize, from + 200),
    "\n",
  );

  // 1. Sync to Supabase via the bridge (optimistic local update + persist + webhook)
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
    console.error("[InlineAgent] sync-bridge failed, using local ID:", err);
    supabaseTaskId = crypto.randomUUID();
  }

  // 1b. Fire-and-forget OpenClaw notification
  import("@/lib/agents/mention-handler").then(({ handleAgentMention }) => {
    handleAgentMention({
      documentId,
      schoolId,
      mentionedAgent: `@${agent.name}`,
      message: prompt,
      context: `${contextBefore}\n---\n${contextAfter}`,
      userId: userId ?? getCurrentUserId() ?? "anonymous",
    }).catch(() => {});
  }).catch(() => {});

  // 2. Notify local task-create listeners
  const storage = editor.storage as unknown as { inlineAgent: InlineAgentStorage };
  if (storage.inlineAgent.onTaskCreate) {
    storage.inlineAgent.onTaskCreate({
      id: supabaseTaskId,
      type: "inline",
      status: "queued",
      prompt,
      documentId,
      documentTitle,
      agent: { name: agent.name, model: agent.id, provider: "openclaw" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 3. Start SSE streaming (connects to /api/agent/stream)
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
      insertPos: from,
      openclawEndpoint: openclawConfig.endpoint ?? undefined,
      openclawApiKey: openclawConfig.apiKey ?? undefined,
      schoolId,
    },
    onSuggestionCallback ?? undefined,
  );

  activeStreams.set(supabaseTaskId, streamHandler);

  streamHandler.start().catch((err) => {
    console.error("[InlineAgent] Stream error:", err);
  }).finally(() => {
    activeStreams.delete(supabaseTaskId);
  });

  return supabaseTaskId;
}

/**
 * Cancel an active agent stream.
 */
export function cancelAgentStream(taskId: string): void {
  const handler = activeStreams.get(taskId);
  if (handler) {
    handler.abort();
    activeStreams.delete(taskId);
  }
}

export function insertHumanMention(
  editor: Editor,
  user: MentionableUser,
  documentId: string,
  documentTitle: string,
  schoolId: string
): void {
  const mention: HumanMention = {
    type: 'human',
    id: crypto.randomUUID(),
    userId: user.userId,
    name: user.displayName,
    color: user.color,
    avatar: user.avatar,
  };

  const { from } = editor.state.selection;
  const textBefore = editor.state.doc.textBetween(
    Math.max(0, from - 20),
    from,
    ""
  );
  const mentionMatch = textBefore.match(/@([a-zA-Z0-9_-]*)$/);
  
  if (mentionMatch) {
    const mentionPos = from - mentionMatch[0].length;
    editor
      .chain()
      .focus()
      .deleteRange({ from: mentionPos, to: from })
      .insertMention(mention)
      .run();
  }

  // Get current user's name for the notification
  const currentUserId = getCurrentUserId();
  const authorName = "You"; // This could be fetched from workspace members
  
  // Create notification for the mentioned user
  notifyMentionedUser(mention, documentId, documentTitle, authorName);
}
