interface ExportableDocument {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export function documentToNotionMarkdown(doc: ExportableDocument): string {
  const lines: string[] = [];

  lines.push(`# ${doc.title}`);
  lines.push("");

  if (doc.tags?.length) {
    lines.push(`Tags: ${doc.tags.join(", ")}`);
    lines.push("");
  }

  lines.push(doc.content);
  lines.push("");
  lines.push("---");
  lines.push(`*Exported from Knobase on ${new Date().toLocaleDateString()}*`);

  return lines.join("\n");
}

export function documentsToExportBundle(docs: ExportableDocument[]): {
  files: { name: string; content: string }[];
  manifest: string;
} {
  const files = docs.map((doc) => ({
    name: `${slugify(doc.title)}.md`,
    content: documentToNotionMarkdown(doc),
  }));

  const manifest = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      source: "knobase",
      version: "1.0",
      document_count: docs.length,
      documents: docs.map((d) => ({
        id: d.id,
        title: d.title,
        file: `${slugify(d.title)}.md`,
        tags: d.tags,
        created: d.createdAt,
        updated: d.updatedAt,
      })),
    },
    null,
    2
  );

  files.push({ name: "manifest.json", content: manifest });

  return { files, manifest };
}

export async function downloadExportBundle(docs: ExportableDocument[]): Promise<void> {
  const { files } = documentsToExportBundle(docs);

  // Create a simple combined markdown for download (ZIP creation would need a library)
  const combined = files
    .filter((f) => f.name.endsWith(".md"))
    .map((f) => `<!-- File: ${f.name} -->\n${f.content}`)
    .join("\n\n---\n\n");

  const blob = new Blob([combined], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `knobase-export-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "untitled";
}
