import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ChildPageView } from "@/components/editor/extensions/child-page-view";

export interface ChildPageAttributes {
  pageId: string;
  title: string;
  icon: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    childPage: {
      insertChildPage: (attrs: ChildPageAttributes) => ReturnType;
    };
  }
}

export const ChildPage = Node.create({
  name: "childPage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: "Untitled" },
      icon: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="child-page"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "child-page" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChildPageView);
  },

  addCommands() {
    return {
      insertChildPage:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run();
        },
    };
  },
});
