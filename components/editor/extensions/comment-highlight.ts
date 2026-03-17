import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Comment } from "@/lib/documents/types";

/**
 * ProseMirror plugin that renders yellow highlight decorations
 * over text ranges that have comments anchored to them.
 * Also supports an "active" state for the comment currently
 * being viewed/focused.
 */

export const commentHighlightPluginKey = new PluginKey("commentHighlight");

interface CommentHighlightState {
  comments: Comment[];
  activeCommentId: string | null;
}

export function createCommentHighlightPlugin() {
  return new Plugin<CommentHighlightState>({
    key: commentHighlightPluginKey,
    state: {
      init(): CommentHighlightState {
        return { comments: [], activeCommentId: null };
      },
      apply(tr, value): CommentHighlightState {
        const meta = tr.getMeta(commentHighlightPluginKey) as
          | Partial<CommentHighlightState>
          | undefined;
        if (meta) {
          return { ...value, ...meta };
        }
        return value;
      },
    },
    props: {
      decorations(state) {
        const pluginState = commentHighlightPluginKey.getState(state) as
          | CommentHighlightState
          | undefined;
        if (!pluginState?.comments.length) return DecorationSet.empty;

        const decos: Decoration[] = [];
        const docSize = state.doc.content.size;

        for (const comment of pluginState.comments) {
          if (
            comment.resolved ||
            comment.selectionFrom == null ||
            comment.selectionTo == null
          ) {
            continue;
          }

          const from = Math.max(0, Math.min(comment.selectionFrom, docSize));
          const to = Math.max(from, Math.min(comment.selectionTo, docSize));
          if (from >= to) continue;

          const isActive = comment.id === pluginState.activeCommentId;
          const className = isActive
            ? "comment-highlight comment-highlight-active"
            : "comment-highlight";

          decos.push(
            Decoration.inline(from, to, {
              class: className,
              "data-comment-id": comment.id,
            }),
          );
        }

        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}

export function updateCommentHighlights(
  view: { state: any; dispatch: (tr: any) => void },
  comments: Comment[],
  activeCommentId?: string | null,
) {
  const tr = view.state.tr.setMeta(commentHighlightPluginKey, {
    comments,
    activeCommentId: activeCommentId ?? null,
  });
  view.dispatch(tr);
}
