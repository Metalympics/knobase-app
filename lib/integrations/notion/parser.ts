export interface NotionPage {
  id: string;
  title: string;
  content: string;
  tags: string[];
  children: NotionPage[];
  images: string[];
  selected: boolean;
}

export interface ParseResult {
  pages: NotionPage[];
  totalFiles: number;
  errors: string[];
}

/**
 * Parse a Notion export ZIP file. Notion exports consist of markdown/HTML files
 * with CSV databases. This parser handles the markdown export format.
 */
export async function parseNotionExport(file: File): Promise<ParseResult> {
  const pages: NotionPage[] = [];
  const errors: string[] = [];
  let totalFiles = 0;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const entries = await extractZipEntries(arrayBuffer);
    totalFiles = entries.length;

    for (const entry of entries) {
      if (!entry.name.endsWith(".md") && !entry.name.endsWith(".html")) continue;

      try {
        const content = new TextDecoder().decode(entry.data);
        const page = parseNotionPage(entry.name, content);
        pages.push(page);
      } catch (err) {
        errors.push(`Failed to parse ${entry.name}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to read ZIP: ${err instanceof Error ? err.message : "unknown"}`);
  }

  return { pages, totalFiles, errors };
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

async function extractZipEntries(buffer: ArrayBuffer): Promise<ZipEntry[]> {
  const view = new DataView(buffer);
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset < buffer.byteLength - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break; // Local file header signature

    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameBytes = new Uint8Array(buffer, offset + 30, nameLen);
    const name = new TextDecoder().decode(nameBytes);

    const dataStart = offset + 30 + nameLen + extraLen;
    const isCompressed = view.getUint16(offset + 8, true) !== 0;

    if (!isCompressed && uncompressedSize > 0) {
      const data = new Uint8Array(buffer, dataStart, uncompressedSize);
      entries.push({ name, data });
    } else if (isCompressed && compressedSize > 0) {
      try {
        const compressed = new Uint8Array(buffer, dataStart, compressedSize);
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();

        writer.write(compressed);
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const result = await reader.read();
          if (result.done) { done = true; break; }
          chunks.push(result.value);
        }

        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const data = new Uint8Array(totalLength);
        let pos = 0;
        for (const chunk of chunks) {
          data.set(chunk, pos);
          pos += chunk.length;
        }

        entries.push({ name, data });
      } catch {
        // Skip files that can't be decompressed
      }
    }

    offset = dataStart + (compressedSize || uncompressedSize);
  }

  return entries;
}

function parseNotionPage(filename: string, content: string): NotionPage {
  const images: string[] = [];
  let title = filename
    .split("/").pop()!
    .replace(/\.md$|\.html$/, "")
    .replace(/\s+[a-f0-9]{32}$/, ""); // Remove Notion ID suffix

  let parsed = content;

  // Handle HTML content - basic conversion
  if (filename.endsWith(".html")) {
    parsed = htmlToMarkdown(content);
  }

  // Extract title from first heading
  const headingMatch = parsed.match(/^#\s+(.+)/m);
  if (headingMatch) {
    title = headingMatch[1].trim();
    parsed = parsed.replace(/^#\s+.+\n*/, "");
  }

  // Convert Notion-specific blocks
  parsed = convertNotionBlocks(parsed);

  // Extract image references
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(parsed)) !== null) {
    images.push(imgMatch[2]);
  }

  // Extract tags from Notion properties
  const tags: string[] = [];
  const tagMatch = parsed.match(/^Tags?:\s*(.+)$/im);
  if (tagMatch) {
    tags.push(...tagMatch[1].split(",").map((t) => t.trim()).filter(Boolean));
    parsed = parsed.replace(/^Tags?:\s*.+$/im, "").trim();
  }

  return {
    id: crypto.randomUUID(),
    title,
    content: parsed.trim(),
    tags,
    children: [],
    images,
    selected: true,
  };
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "---\n")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n")
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function convertNotionBlocks(content: string): string {
  return content
    // Notion callout blocks → blockquote
    .replace(/^[ℹ️💡⚠️❗🔥📌]\s*(.+)$/gm, "> $1")
    // Notion toggle → details summary
    .replace(/^▶\s*(.+)$/gm, "**$1**")
    // Clean up Notion database properties
    .replace(/^(Created|Last edited|Created by|Last edited by):\s*.+$/gm, "")
    // Notion dividers
    .replace(/^---+$/gm, "---")
    .trim();
}
