import { Node, mergeAttributes, ReactNodeViewRenderer, textblockTypeInputRule } from "@tiptap/react";

export const CodeBlockEnhanced = Node.create({
  name: "codeBlock",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,

  addAttributes() {
    return {
      language: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("code")?.getAttribute("class")?.replace("language-", "") || null,
      },
      showLineNumbers: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: "pre",
        preserveWhitespace: "full",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, { class: "tiptap-code-block" }),
      [
        "code",
        node.attrs.language
          ? { class: `language-${node.attrs.language}` }
          : {},
        0,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      require("@/components/editor/blocks/CodeBlock/EnhancedCodeBlock").EnhancedCodeBlockView,
    );
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^```([a-z]*)[\s\n]$/,
        type: this.type,
        getAttributes: (match) => ({ language: match[1] || null }),
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-c": () => this.editor.commands.toggleNode("codeBlock", "paragraph"),
      Tab: () => {
        if (this.editor.isActive("codeBlock")) {
          return this.editor.commands.command(({ tr }) => {
            tr.insertText("  ");
            return true;
          });
        }
        return false;
      },
      "Shift-Tab": () => {
        return false;
      },
    };
  },
});
