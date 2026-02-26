import { getDocument } from "@/lib/documents/store";
import type { Document } from "@/lib/documents/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ExportFormat = "markdown" | "html" | "json" | "txt";

export interface ExportOptions {
  documentId: string;
  format: ExportFormat;
  includeMetadata?: boolean;
  includeFrontmatter?: boolean;
  includeComments?: boolean;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

/* ------------------------------------------------------------------ */
/* Converters                                                          */
/* ------------------------------------------------------------------ */

function generateFrontmatter(doc: Document): string {
  const lines = ["---"];
  lines.push(`title: "${doc.title.replace(/"/g, '\\"')}"`);
  lines.push(`created: ${doc.createdAt}`);
  lines.push(`updated: ${doc.updatedAt}`);
  if (doc.tags?.length) {
    lines.push(`tags: [${doc.tags.map((t) => `"${t}"`).join(", ")}]`);
  }
  if (doc.wordCount !== undefined) {
    lines.push(`wordCount: ${doc.wordCount}`);
  }
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function toMarkdown(doc: Document, options: ExportOptions): string {
  const parts: string[] = [];

  if (options.includeFrontmatter) {
    parts.push(generateFrontmatter(doc));
  }

  // Title as H1 if not already in content
  if (!doc.content.trimStart().startsWith("# ")) {
    parts.push(`# ${doc.title}\n`);
  }

  parts.push(doc.content);

  if (options.includeComments && doc.comments?.length) {
    parts.push("\n---\n");
    parts.push("## Comments\n");
    for (const comment of doc.comments) {
      parts.push(`- **${comment.author}** (${new Date(comment.timestamp).toLocaleDateString()}): ${comment.text}`);
      if (comment.replies?.length) {
        for (const reply of comment.replies) {
          parts.push(`  - **${reply.author}**: ${reply.text}`);
        }
      }
    }
  }

  return parts.join("\n");
}

function contentToHtml(content: string, title: string): string {
  // Simple markdown → HTML conversion (basic)
  let html = content
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold / Italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code class=\"language-$1\">$2</code></pre>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1a1a; }
    h1, h2, h3 { margin-top: 1.5em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre code { background: none; padding: 0; }
    a { color: #3b82f6; }
    blockquote { border-left: 3px solid #e5e5e5; padding-left: 16px; color: #666; margin: 1em 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${html}</p>
</body>
</html>`;
}

function toHtml(doc: Document, options: ExportOptions): string {
  return contentToHtml(doc.content, doc.title);
}

function toJson(doc: Document, options: ExportOptions): string {
  const payload: Record<string, unknown> = {
    title: doc.title,
    content: doc.content,
  };

  if (options.includeMetadata) {
    payload.id = doc.id;
    payload.createdAt = doc.createdAt;
    payload.updatedAt = doc.updatedAt;
    payload.tags = doc.tags ?? [];
    payload.wordCount = doc.wordCount;
    payload.parentId = doc.parentId;
  }

  if (options.includeComments && doc.comments?.length) {
    payload.comments = doc.comments;
  }

  return JSON.stringify(payload, null, 2);
}

function toPlainText(doc: Document): string {
  return doc.content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```\w*\n?/, "").replace(/```$/, ""),
    )
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, (m) => m);
}

/* ------------------------------------------------------------------ */
/* MIME types                                                          */
/* ------------------------------------------------------------------ */

const FORMAT_CONFIG: Record<
  ExportFormat,
  { ext: string; mimeType: string }
> = {
  markdown: { ext: "md", mimeType: "text/markdown" },
  html: { ext: "html", mimeType: "text/html" },
  json: { ext: "json", mimeType: "application/json" },
  txt: { ext: "txt", mimeType: "text/plain" },
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Export a document to the specified format */
export function exportDocument(options: ExportOptions): ExportResult {
  const doc = getDocument(options.documentId);
  if (!doc) throw new Error(`Document not found: ${options.documentId}`);

  const slug = doc.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "untitled";
  const config = FORMAT_CONFIG[options.format];

  let content: string;
  switch (options.format) {
    case "markdown":
      content = toMarkdown(doc, options);
      break;
    case "html":
      content = toHtml(doc, options);
      break;
    case "json":
      content = toJson(doc, options);
      break;
    case "txt":
      content = toPlainText(doc);
      break;
  }

  return {
    content,
    filename: `${slug}.${config.ext}`,
    mimeType: config.mimeType,
  };
}

/** Export multiple documents as a combined markdown document */
export function exportMultipleDocuments(
  documentIds: string[],
  options?: { includeFrontmatter?: boolean },
): ExportResult {
  const parts: string[] = [];

  for (const id of documentIds) {
    const doc = getDocument(id);
    if (!doc) continue;

    parts.push(`# ${doc.title}\n`);
    if (options?.includeFrontmatter) {
      parts.push(`> Created: ${doc.createdAt} | Updated: ${doc.updatedAt}\n`);
    }
    parts.push(doc.content);
    parts.push("\n---\n");
  }

  return {
    content: parts.join("\n"),
    filename: `knobase-export-${new Date().toISOString().split("T")[0]}.md`,
    mimeType: "text/markdown",
  };
}

/** Trigger a browser download of an export result */
export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Copy export content to clipboard */
export async function copyExportToClipboard(result: ExportResult): Promise<void> {
  await navigator.clipboard.writeText(result.content);
}
