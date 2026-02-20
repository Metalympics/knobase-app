import { requireConfig, searchDocuments } from "../lib/client";

export async function search(query: string, options?: { tags?: string }) {
  if (!query) {
    console.error("Usage: knobase search <query> [--tags tag1,tag2]");
    process.exit(1);
  }

  const config = requireConfig();
  const tags = options?.tags?.split(",").map((t) => t.trim());

  console.log(`\n  Searching for "${query}"...\n`);

  const result = (await searchDocuments(config, query, tags ? { tags } : undefined)) as {
    data?: { id: string; title: string; snippet: string; score: number }[];
    pagination?: { total: number };
  };

  if (!result.data?.length) {
    console.log("  No results found.");
    return;
  }

  console.log(`  ${result.pagination?.total ?? result.data.length} results\n`);

  for (const item of result.data) {
    console.log(`  [${item.score}] ${item.title}`);
    console.log(`      ID: ${item.id}`);
    console.log(`      ${item.snippet.replace(/\n/g, " ").slice(0, 100)}`);
    console.log();
  }
}
