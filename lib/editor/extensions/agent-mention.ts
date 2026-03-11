import { Mention, type MentionOptions, type MentionNodeAttrs } from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { type SuggestionOptions, type SuggestionProps, type SuggestionKeyDownProps } from "@tiptap/suggestion";
import { createClient, type Database } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type AgentUserRow = Database["public"]["Tables"]["users"]["Row"];

export type AgentType = "openclaw" | "knobase_ai" | "custom";

export interface AgentMentionAttrs extends MentionNodeAttrs {
  id: string | null;
  label?: string | null;
  userId: string | null;
  agentType: AgentType | null;
}

export interface AgentSuggestionItem {
  id: string;
  userId: string;
  label: string;
  agentType: AgentType | null;
  description: string | null;
  avatarUrl: string | null;
}

export interface AgentMentionOptions
  extends MentionOptions<AgentSuggestionItem, AgentMentionAttrs> {}

export interface AgentMentionStorage {
  cachedAgents: AgentSuggestionItem[];
  lastFetchedAt: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const AGENT_MENTION_PLUGIN_KEY = new PluginKey("agentMention");

const CACHE_TTL_MS = 30_000;

async function fetchAgentUsers(query: string): Promise<AgentSuggestionItem[]> {
  const supabase = createClient();
  let q = supabase
    .from("users")
    .select("id, name, display_name, avatar_url, agent_type, description")
    .eq("type", "agent")
    .eq("is_deleted", false)
    .eq("is_suspended", false)
    .order("name", { ascending: true })
    .limit(10);

  if (query) {
    q = q.or(`name.ilike.%${query}%,display_name.ilike.%${query}%`);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  return (data as AgentUserRow[]).map((row) => ({
    id: row.id,
    userId: row.id,
    label: row.display_name || row.name || row.email,
    agentType: (row.agent_type as AgentType) ?? null,
    description: row.description,
    avatarUrl: row.avatar_url,
  }));
}

/* ------------------------------------------------------------------ */
/* Suggestion popup renderer (vanilla DOM)                             */
/* ------------------------------------------------------------------ */

function createSuggestionRenderer(): NonNullable<
  SuggestionOptions<AgentSuggestionItem, AgentMentionAttrs>["render"]
> {
  return () => {
    let popup: HTMLDivElement | null = null;
    let selectedIndex = 0;
    let currentItems: AgentSuggestionItem[] = [];
    let commandFn: ((props: AgentMentionAttrs) => void) | null = null;

    function applyStyles(el: HTMLDivElement) {
      Object.assign(el.style, {
        position: "fixed",
        zIndex: "9999",
        background: "#1e1b2e",
        border: "1px solid rgba(139, 92, 246, 0.3)",
        borderRadius: "8px",
        padding: "4px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        maxHeight: "260px",
        overflowY: "auto",
        minWidth: "220px",
      });
    }

    function renderItems() {
      if (!popup) return;
      popup.innerHTML = "";

      if (currentItems.length === 0) {
        const empty = document.createElement("div");
        Object.assign(empty.style, {
          padding: "8px 12px",
          color: "#a78bfa",
          fontSize: "13px",
        });
        empty.textContent = "No agents found";
        popup.appendChild(empty);
        return;
      }

      currentItems.forEach((item, index) => {
        const row = document.createElement("button");
        row.type = "button";
        Object.assign(row.style, {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "6px 10px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "13px",
          background: index === selectedIndex ? "rgba(139, 92, 246, 0.2)" : "transparent",
          color: "#e2e0f0",
          transition: "background 0.1s",
        });

        const icon = document.createElement("span");
        Object.assign(icon.style, {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "6px",
          background: "rgba(139, 92, 246, 0.25)",
          fontSize: "14px",
          flexShrink: "0",
        });
        icon.textContent = "\u{1F916}";

        const text = document.createElement("div");
        text.style.minWidth = "0";

        const nameEl = document.createElement("div");
        nameEl.style.fontWeight = "500";
        nameEl.style.whiteSpace = "nowrap";
        nameEl.style.overflow = "hidden";
        nameEl.style.textOverflow = "ellipsis";
        nameEl.textContent = item.label;

        text.appendChild(nameEl);

        if (item.description) {
          const desc = document.createElement("div");
          Object.assign(desc.style, {
            fontSize: "11px",
            color: "#8b7fad",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          });
          desc.textContent = item.description;
          text.appendChild(desc);
        }

        row.appendChild(icon);
        row.appendChild(text);

        row.addEventListener("mouseenter", () => {
          selectedIndex = index;
          renderItems();
        });

        row.addEventListener("mousedown", (e) => {
          e.preventDefault();
          selectItem(index);
        });

        popup?.appendChild(row);
      });
    }

    function selectItem(index: number) {
      const item = currentItems[index];
      if (!item || !commandFn) return;
      commandFn({
        id: item.id,
        label: item.label,
        userId: item.userId,
        agentType: item.agentType,
      });
    }

    return {
      onStart(props: SuggestionProps<AgentSuggestionItem, AgentMentionAttrs>) {
        popup = document.createElement("div");
        applyStyles(popup);
        document.body.appendChild(popup);

        currentItems = props.items;
        commandFn = props.command;
        selectedIndex = 0;

        const rect = props.clientRect?.();
        if (rect && popup) {
          popup.style.top = `${rect.bottom + 4}px`;
          popup.style.left = `${rect.left}px`;
        }

        renderItems();
      },

      onUpdate(props: SuggestionProps<AgentSuggestionItem, AgentMentionAttrs>) {
        currentItems = props.items;
        commandFn = props.command;
        selectedIndex = 0;

        const rect = props.clientRect?.();
        if (rect && popup) {
          popup.style.top = `${rect.bottom + 4}px`;
          popup.style.left = `${rect.left}px`;
        }

        renderItems();
      },

      onKeyDown({ event }: SuggestionKeyDownProps) {
        if (event.key === "ArrowUp") {
          selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
          renderItems();
          return true;
        }
        if (event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % currentItems.length;
          renderItems();
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        if (event.key === "Escape") {
          return true;
        }
        return false;
      },

      onExit() {
        if (popup) {
          popup.remove();
          popup = null;
        }
        currentItems = [];
        commandFn = null;
        selectedIndex = 0;
      },
    };
  };
}

/* ------------------------------------------------------------------ */
/* Agent mention suggestion config                                     */
/* ------------------------------------------------------------------ */

export const agentMentionSuggestion: Omit<
  SuggestionOptions<AgentSuggestionItem, AgentMentionAttrs>,
  "editor"
> = {
  char: "@",
  pluginKey: AGENT_MENTION_PLUGIN_KEY,
  allowSpaces: false,

  items: async ({ query }) => fetchAgentUsers(query),

  command: ({ editor, range, props }) => {
    const nodeAfter = editor.view.state.selection.$to.nodeAfter;
    const overrideSpace = nodeAfter?.text?.startsWith(" ");

    if (overrideSpace) {
      range.to += 1;
    }

    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        {
          type: "agentMention",
          attrs: props,
        },
        { type: "text", text: " " },
      ])
      .run();

    window.getSelection()?.collapseToEnd();
  },

  render: createSuggestionRenderer(),
};

/* ------------------------------------------------------------------ */
/* TipTap extension                                                    */
/* ------------------------------------------------------------------ */

export const AgentMention = Mention.extend<AgentMentionOptions, AgentMentionStorage>({
  name: "agentMention",

  addOptions() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      HTMLAttributes: {
        class: "agent-mention",
      },
      suggestion: agentMentionSuggestion,
      renderText: (parent as AgentMentionOptions).renderText ??
        (({ node }: { options: AgentMentionOptions; node: import("@tiptap/pm/model").Node; suggestion: SuggestionOptions<AgentSuggestionItem, AgentMentionAttrs> | null }) =>
          `@${node.attrs.label ?? node.attrs.id ?? ""}`),
    } as unknown as AgentMentionOptions;
  },

  addStorage() {
    return {
      cachedAgents: [],
      lastFetchedAt: 0,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      userId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-user-id"),
        renderHTML: (attributes) => {
          if (!attributes.userId) return {};
          return { "data-user-id": attributes.userId };
        },
      },
      agentType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-agent-type"),
        renderHTML: (attributes) => {
          if (!attributes.agentType) return {};
          return { "data-agent-type": attributes.agentType };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = node.attrs.label ?? node.attrs.id ?? "agent";
    return [
      "span",
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        "data-type": "agent-mention",
        "data-user-id": node.attrs.userId,
        "data-agent-type": node.attrs.agentType,
        style:
          "background: rgba(139, 92, 246, 0.15); color: #a78bfa; border-radius: 4px; padding: 1px 4px; font-weight: 500; white-space: nowrap;",
      },
      `\u{1F916} @${label}`,
    ];
  },

  renderText({ node }) {
    return `\u{1F916} @${node.attrs.label ?? node.attrs.id ?? "agent"}`;
  },

  parseHTML() {
    return [{ tag: 'span[data-type="agent-mention"]' }];
  },
});

export default AgentMention;
