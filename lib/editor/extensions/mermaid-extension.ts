import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaid: (code?: string) => ReturnType;
    };
  }
}

export const MermaidExtension = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      code: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          return {
            code: el.getAttribute("data-code") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "mermaid-block",
        "data-code": node.attrs.code,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      require("@/components/editor/blocks/MermaidBlock/MermaidBlockView").MermaidBlockView,
    );
  },

  addCommands() {
    return {
      insertMermaid:
        (code?: string) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                code:
                  code ??
                  `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
              },
            })
            .run();
        },
    };
  },
});
