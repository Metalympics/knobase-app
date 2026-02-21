import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export const searchPluginKey = new PluginKey("search");

function findMatches(
  doc: ProseMirrorNode,
  term: string
): { from: number; to: number }[] {
  if (!term) return [];
  const results: { from: number; to: number }[] = [];
  const lowerTerm = term.toLowerCase();

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const lowerText = node.text.toLowerCase();
      let idx = 0;
      while ((idx = lowerText.indexOf(lowerTerm, idx)) !== -1) {
        results.push({ from: pos + idx, to: pos + idx + term.length });
        idx += 1;
      }
    }
  });

  return results;
}

function buildDecorations(
  doc: ProseMirrorNode,
  results: { from: number; to: number }[],
  currentIndex: number
): DecorationSet {
  if (results.length === 0) return DecorationSet.empty;

  const decorations = results.map((r, i) =>
    Decoration.inline(r.from, r.to, {
      class:
        i === currentIndex
          ? "search-highlight-active"
          : "search-highlight",
    })
  );

  return DecorationSet.create(doc, decorations);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    search: {
      setSearchTerm: (term: string) => ReturnType;
      nextSearchResult: () => ReturnType;
      previousSearchResult: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export const SearchExtension = Extension.create({
  name: "search",

  addStorage() {
    return {
      searchTerm: "" as string,
      results: [] as { from: number; to: number }[],
      currentIndex: -1,
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(searchPluginKey, { type: "setTerm", term }));
          }
          return true;
        },

      nextSearchResult:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(searchPluginKey, { type: "next" }));
          }
          return true;
        },

      previousSearchResult:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(searchPluginKey, { type: "prev" }));
          }
          return true;
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(searchPluginKey, { type: "clear" }));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionStorage = this.storage;

    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet, _oldState, newState) {
            const meta = tr.getMeta(searchPluginKey);

            if (meta) {
              switch (meta.type) {
                case "setTerm": {
                  extensionStorage.searchTerm = meta.term;
                  extensionStorage.results = findMatches(
                    newState.doc,
                    meta.term
                  );
                  extensionStorage.currentIndex =
                    extensionStorage.results.length > 0 ? 0 : -1;
                  break;
                }
                case "next": {
                  if (extensionStorage.results.length > 0) {
                    extensionStorage.currentIndex =
                      (extensionStorage.currentIndex + 1) %
                      extensionStorage.results.length;
                  }
                  break;
                }
                case "prev": {
                  if (extensionStorage.results.length > 0) {
                    extensionStorage.currentIndex =
                      (extensionStorage.currentIndex -
                        1 +
                        extensionStorage.results.length) %
                      extensionStorage.results.length;
                  }
                  break;
                }
                case "clear": {
                  extensionStorage.searchTerm = "";
                  extensionStorage.results = [];
                  extensionStorage.currentIndex = -1;
                  return DecorationSet.empty;
                }
              }

              return buildDecorations(
                newState.doc,
                extensionStorage.results,
                extensionStorage.currentIndex
              );
            }

            if (tr.docChanged && extensionStorage.searchTerm) {
              extensionStorage.results = findMatches(
                newState.doc,
                extensionStorage.searchTerm
              );
              if (
                extensionStorage.currentIndex >=
                extensionStorage.results.length
              ) {
                extensionStorage.currentIndex =
                  extensionStorage.results.length > 0 ? 0 : -1;
              }
              return buildDecorations(
                newState.doc,
                extensionStorage.results,
                extensionStorage.currentIndex
              );
            }

            return oldSet;
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
});
