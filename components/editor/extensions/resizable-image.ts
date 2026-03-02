import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImageView } from "./resizable-image-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create({
  name: "image",

  group: "block",
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      align: { default: "center" },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { width, align, ...rest } = HTMLAttributes;
    const style = [
      width ? `width: ${width}px` : "",
      align === "left"
        ? "margin-right: auto"
        : align === "right"
          ? "margin-left: auto"
          : "margin-left: auto; margin-right: auto",
    ]
      .filter(Boolean)
      .join("; ");

    return ["img", mergeAttributes(rest, { style, class: "tiptap-image" })];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
