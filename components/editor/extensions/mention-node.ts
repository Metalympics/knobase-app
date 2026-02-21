import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MentionNodeView } from "./mention-view";
import type { Mention } from "@/lib/mentions/types";

export interface MentionOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (mention: Mention) => ReturnType;
    };
  }
}

export const MentionNode = Node.create<MentionOptions>({
  name: "mention",

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
        tag: 'span[data-type="mention"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        { "data-type": "mention" }
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionNodeView);
  },

  addCommands() {
    return {
      insertMention:
        (mention: Mention) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { mention },
          });
        },
    };
  },
});
