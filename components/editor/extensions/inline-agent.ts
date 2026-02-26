import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";
import type { AgentTask } from "@/lib/agents/task-types";
import { handleMention } from "@/lib/agents/task-coordinator";
import {
  createEditorStreamHandler,
  getOpenClawConfig,
  type AgentStreamHandler,
} from "@/lib/agents/stream-handler";
import type { InlineSuggestionData } from "@/components/agent/inline-suggestion";
import { InlineAgentNodeView } from "./inline-agent-view";
import type { MentionableUser, HumanMention, AIMention } from "@/lib/mentions/types";
import { notifyMentionedUser } from "@/lib/mentions/store";
import { getCurrentUserId } from "@/lib/workspaces/store";
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
      insertMention: (mention: HumanMention | AIMention) => ReturnType;
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
          if (!attributes.taskId) {
            return {};
          }
          return {
            "data-task-id": attributes.taskId,
          };
        },
      },
      mention: {
        default: null,
        parseHTML: (element) => {
          const mentionData = element.getAttribute("data-mention");
          return mentionData ? JSON.parse(mentionData) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.mention) {
            return {};
          }
          return {
            "data-mention": JSON.stringify(attributes.mention),
            "data-mention-type": attributes.mention.type,
          };
        },
      },
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
        (mention: HumanMention | AIMention) =>
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

            const mentionMatch = textBefore.match(/@([a-zA-Z0-9_-]*)$/);
            const storage = editor.storage as unknown as { inlineAgent: InlineAgentStorage };

            if (mentionMatch && mentionMatch[1].length > 0) {
              storage.inlineAgent.showAgentSelector = true;
              storage.inlineAgent.query = mentionMatch[1];
              const coords = editor.view.coordsAtPos(selection.from);
              storage.inlineAgent.position = coords;
            } else if (!mentionMatch) {
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

export async function createInlineAgentTask(
  editor: Editor,
  agent: Agent,
  prompt: string,
  documentId: string,
  documentTitle: string,
  workspaceId: string,
  userId?: string,
): Promise<void> {
  const { from } = editor.state.selection;
  const textBefore = editor.state.doc.textBetween(
    Math.max(0, from - 20),
    from,
    ""
  );
  const mentionMatch = textBefore.match(/@([a-zA-Z0-9_-]*)$/);

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

  // 1. Create mention + task in Supabase
  let supabaseTaskId: string;
  try {
    const { task } = await handleMention({
      documentId,
      workspaceId,
      prompt,
      contextBefore,
      contextAfter,
      createdBy: userId ?? getCurrentUserId() ?? "anonymous",
      agentId: agent.id,
      agentName: agent.name,
    });
    supabaseTaskId = task.id;
  } catch (err) {
    console.error("[InlineAgent] Supabase handleMention failed, using local ID:", err);
    // Fallback: use a local UUID so the editor flow still works
    supabaseTaskId = crypto.randomUUID();
  }

  // 1b. Also notify any registered external agent (OpenClaw) via the mention handler.
  //     This is fire-and-forget — we don't block the editor on it.
  import("@/lib/agents/mention-handler").then(({ handleAgentMention }) => {
    handleAgentMention({
      documentId,
      workspaceId,
      mentionedAgent: `@${agent.name}`,
      message: prompt,
      context: `${contextBefore}\n---\n${contextAfter}`,
      userId: userId ?? getCurrentUserId() ?? "anonymous",
    }).catch(() => {});
  }).catch(() => {});

  // 2. Insert inline agent node into the editor
  if (mentionMatch) {
    const mentionPos = from - mentionMatch[0].length;
    editor
      .chain()
      .focus()
      .deleteRange({ from: mentionPos, to: from })
      .insertInlineAgent(supabaseTaskId)
      .run();
  }

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
      insertPos: from - (mentionMatch ? mentionMatch[0].length : 0),
      openclawEndpoint: openclawConfig.endpoint ?? undefined,
      openclawApiKey: openclawConfig.apiKey ?? undefined,
      workspaceId,
    },
    onSuggestionCallback ?? undefined,
  );

  activeStreams.set(supabaseTaskId, streamHandler);

  streamHandler.start().catch((err) => {
    console.error("[InlineAgent] Stream error:", err);
  }).finally(() => {
    activeStreams.delete(supabaseTaskId);
  });
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
  workspaceId: string
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
