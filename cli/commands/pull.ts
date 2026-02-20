import { writeFileSync } from "fs";
import { requireConfig, getDocument } from "../lib/client";

export async function pull(docId: string, outputPath?: string) {
  if (!docId) {
    console.error("Usage: knobase pull <doc-id> [output-path]");
    process.exit(1);
  }

  const config = requireConfig();
  console.log(`Pulling document ${docId}...`);

  const result = (await getDocument(config, docId)) as { data?: { title: string; content: string; tags?: string[] } };
  const doc = result.data;

  if (!doc) {
    console.error("Document not found");
    process.exit(1);
  }

  const lines: string[] = [];
  if (doc.tags?.length) {
    lines.push("---");
    lines.push(`tags: [${doc.tags.map((t) => `"${t}"`).join(", ")}]`);
    lines.push("---");
    lines.push("");
  }
  lines.push(`# ${doc.title}`);
  lines.push("");
  lines.push(doc.content);

  const markdown = lines.join("\n");
  const fileName = outputPath ?? `${slugify(doc.title)}.md`;

  writeFileSync(fileName, markdown);
  console.log(`Saved to ${fileName}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "untitled";
}
