import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathBlock: {
      insertMathBlock: (latex?: string) => ReturnType;
    };
    mathInline: {
      insertInlineMath: (latex?: string) => ReturnType;
    };
  }
}

export const MathExtension = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      latex: { default: "" },
      displayMode: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          return {
            latex: el.getAttribute("data-latex") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math-block",
        "data-latex": node.attrs.latex,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      require("@/components/editor/blocks/MathBlock/MathBlockView").MathBlockView,
    );
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex?: string) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { latex: latex ?? "", displayMode: true },
            })
            .run();
        },
    };
  },
});

export const InlineMathExtension = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          return {
            latex: el.getAttribute("data-latex") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math-inline",
        "data-latex": node.attrs.latex,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      require("@/components/editor/blocks/MathBlock/MathInlineView").MathInlineView,
    );
  },

  addCommands() {
    return {
      insertInlineMath:
        (latex?: string) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { latex: latex ?? "" },
            })
            .run();
        },
    };
  },
});
