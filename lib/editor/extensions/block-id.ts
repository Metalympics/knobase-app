import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Block node types that receive a `blockId` attribute.
 * Kept as a typed constant so consumers can reference the list.
 */
export const BLOCK_ID_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "codeBlock",
  "blockquote",
] as const;

export type BlockIdNodeType = (typeof BLOCK_ID_TYPES)[number];

export interface BlockIdOptions {
  /**
   * Node types to stamp with a block ID.
   * Defaults to {@link BLOCK_ID_TYPES}.
   */
  types: string[];
  /**
   * Custom ID generator. Must return a unique string.
   * Defaults to an 8-character alphanumeric ID.
   */
  generateId: () => string;
}

export interface BlockIdStorage {
  /** Tracks whether the initial pass has run. */
  initialized: boolean;
}

function defaultGenerateId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockId: {
      /**
       * Regenerate all block IDs in the document.
       */
      regenerateBlockIds: () => ReturnType;
    };
  }
}

export const BlockId = Extension.create<BlockIdOptions, BlockIdStorage>({
  name: "blockId",

  addOptions() {
    return {
      types: [...BLOCK_ID_TYPES],
      generateId: defaultGenerateId,
    };
  },

  addStorage() {
    return {
      initialized: false,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) => {
              if (!attributes.blockId) return {};
              return { "data-block-id": attributes.blockId };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      regenerateBlockIds:
        () =>
        ({ tr, dispatch }) => {
          if (!dispatch) return true;

          const { types, generateId } = this.options;

          tr.doc.descendants((node, pos) => {
            if (types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: generateId(),
              });
            }
          });

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { types, generateId } = this.options;
    const pluginKey = new PluginKey("blockId");

    return [
      new Plugin({
        key: pluginKey,
        appendTransaction(_transactions, _oldState, newState) {
          const { tr } = newState;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (types.includes(node.type.name) && !node.attrs.blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: generateId(),
              });
              modified = true;
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
