import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";
import type { AgentTask } from "@/lib/agents/task-types";
import { useTaskStore } from "@/lib/agents/task-store";
import { InlineAgentNodeView } from "./inline-agent-view";

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
    const unsubscribe = useTaskStore.subscribe((state) => {
      const storage = this.editor.storage as unknown as { inlineAgent: InlineAgentStorage };
      state.tasks.forEach((task) => {
        if (storage.inlineAgent.onTaskUpdate) {
          storage.inlineAgent.onTaskUpdate(task.id, task);
        }
      });
    });

    this.editor.on("destroy", () => {
      unsubscribe();
    });
  },
});

export function createInlineAgentTask(
  editor: Editor,
  agentModel: string,
  prompt: string,
  documentId: string,
  documentTitle: string
): void {
  const taskStore = useTaskStore.getState();
  
  const task: AgentTask = {
    id: crypto.randomUUID(),
    type: "inline",
    status: "queued",
    prompt,
    documentId,
    documentTitle,
    agent: {
      model: agentModel,
      provider: "demo",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  taskStore.addTask(task);

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
      .insertInlineAgent(task.id)
      .run();
  }

  const storage = editor.storage as unknown as { inlineAgent: InlineAgentStorage };
  if (storage.inlineAgent.onTaskCreate) {
    storage.inlineAgent.onTaskCreate(task);
  }

  simulateTaskExecution(task.id, taskStore, prompt);
}

async function simulateTaskExecution(
  taskId: string,
  taskStore: ReturnType<typeof useTaskStore.getState>,
  prompt: string
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  taskStore.updateTask(taskId, { status: "running" });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  taskStore.updateTask(taskId, {
    status: "completed",
    result: `Demo result for: ${prompt}`,
    completedAt: new Date(),
  });
}
