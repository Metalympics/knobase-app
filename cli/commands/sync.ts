import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { requireConfig, createDocument } from "../lib/client";

export async function sync(dir?: string) {
  const targetDir = dir ?? process.cwd();
  const config = requireConfig();

  console.log(`\n  Syncing ${targetDir}...\n`);

  const files = collectMarkdownFiles(targetDir);

  if (files.length === 0) {
    console.log("  No .md files found.");
    return;
  }

  console.log(`  Found ${files.length} markdown files\n`);

  let success = 0;
  let errors = 0;

  for (const file of files) {
    const relPath = relative(targetDir, file);
    const content = readFileSync(file, "utf-8");
    const title = relPath.replace(/\.md$/, "").replace(/\//g, " / ");

    let body = content;
    let tags: string[] = [];
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (fmMatch) {
      body = fmMatch[2];
      const tagMatch = fmMatch[1].match(/tags:\s*\[(.+?)\]/);
      if (tagMatch) {
        tags = tagMatch[1].split(",").map((t) => t.trim().replace(/^"|"$/g, ""));
      }
    }

    try {
      await createDocument(config, { title, content: body.trim(), tags });
      console.log(`  ✓ ${relPath}`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${relPath}: ${err instanceof Error ? err.message : "failed"}`);
      errors++;
    }
  }

  console.log(`\n  Done: ${success} synced, ${errors} failed\n`);
}

function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules") continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...collectMarkdownFiles(fullPath));
      } else if (entry.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return results;
}
