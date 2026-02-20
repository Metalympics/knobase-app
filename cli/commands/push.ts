import { readFileSync, existsSync } from "fs";
import { basename } from "path";
import { requireConfig, createDocument } from "../lib/client";

export async function push(filePath: string) {
  if (!filePath) {
    console.error("Usage: knobase push <file.md>");
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const config = requireConfig();
  const content = readFileSync(filePath, "utf-8");
  const title = basename(filePath, ".md");

  // Extract tags from frontmatter if present
  let tags: string[] = [];
  let body = content;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    body = fmMatch[2];
    const tagMatch = fmMatch[1].match(/tags:\s*\[(.+?)\]/);
    if (tagMatch) {
      tags = tagMatch[1].split(",").map((t) => t.trim().replace(/^"|"$/g, ""));
    }
  }

  console.log(`Pushing ${filePath}...`);
  const result = await createDocument(config, { title, content: body.trim(), tags });
  console.log("Document created:", JSON.stringify(result, null, 2));
}
