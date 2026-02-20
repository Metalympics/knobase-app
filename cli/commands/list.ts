import { requireConfig, listDocuments } from "../lib/client";

export async function list(options?: { limit?: string; search?: string }) {
  const config = requireConfig();
  const limit = options?.limit ? parseInt(options.limit, 10) : 20;

  const result = (await listDocuments(config, { limit, search: options?.search })) as {
    data?: { id: string; title: string; updatedAt: string; contentLength: number }[];
    pagination?: { total: number };
  };

  if (!result.data?.length) {
    console.log("No documents found.");
    return;
  }

  console.log(`\n  Documents (${result.pagination?.total ?? result.data.length} total)\n`);
  console.log("  " + "ID".padEnd(38) + "Title".padEnd(40) + "Updated");
  console.log("  " + "─".repeat(38) + "─".repeat(40) + "─".repeat(20));

  for (const doc of result.data) {
    const id = doc.id.slice(0, 36);
    const title = doc.title.length > 37 ? doc.title.slice(0, 34) + "..." : doc.title;
    const updated = new Date(doc.updatedAt).toLocaleDateString();
    console.log(`  ${id.padEnd(38)}${title.padEnd(40)}${updated}`);
  }
  console.log();
}
