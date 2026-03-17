/**
 * Content Transformer
 *
 * Converts common markdown/HTML patterns produced by AI agents into
 * the Tiptap-compatible node format our editor expects. This acts as a
 * safety net: even if the agent doesn't use the exact HTML format, known
 * patterns are automatically upgraded to interactive nodes.
 *
 * Patterns handled:
 *   $$...$$                → <div data-type="math-block" data-latex="...">
 *   $...$   (inline)       → <span data-type="math-inline" data-latex="...">
 *   ```mermaid ... ```     → <div data-type="mermaid-block" data-code="...">
 *   ```chart { json } ```  → <div data-type="chart-block" data-*="...">
 */

/**
 * Transform content from agent output into Tiptap-compatible HTML.
 * Idempotent — already-transformed content passes through unchanged.
 */
export function transformAgentContent(html: string): string {
  if (!html) return html;

  let result = html;

  result = transformMermaidCodeBlocks(result);
  result = transformChartCodeBlocks(result);
  result = transformBlockMath(result);
  result = transformInlineMath(result);

  return result;
}

/**
 * ```mermaid ... ``` → <div data-type="mermaid-block">
 *
 * Matches both raw markdown fences and HTML pre/code blocks with
 * language="mermaid" or class="language-mermaid".
 */
function transformMermaidCodeBlocks(html: string): string {
  // HTML pre>code with mermaid language
  html = html.replace(
    /<pre[^>]*>\s*<code[^>]*(?:class="language-mermaid"|language="mermaid")[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_match, code: string) => {
      const decoded = decodeHtmlEntities(code.trim());
      return `<div data-type="mermaid-block" data-code="${escapeAttr(decoded)}"></div>`;
    },
  );

  // Raw markdown fences (in case content_md is markdown, not HTML)
  html = html.replace(
    /```mermaid\s*\n([\s\S]*?)```/g,
    (_match, code: string) => {
      return `<div data-type="mermaid-block" data-code="${escapeAttr(code.trim())}"></div>`;
    },
  );

  return html;
}

/**
 * ```chart { JSON } ``` → <div data-type="chart-block">
 *
 * Expects JSON with { type, data, config } structure.
 */
function transformChartCodeBlocks(html: string): string {
  // HTML pre>code with chart language
  html = html.replace(
    /<pre[^>]*>\s*<code[^>]*(?:class="language-chart"|language="chart")[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_match, code: string) => {
      return tryParseChartJson(decodeHtmlEntities(code.trim()));
    },
  );

  // Raw markdown fences
  html = html.replace(
    /```chart\s*\n([\s\S]*?)```/g,
    (_match, code: string) => {
      return tryParseChartJson(code.trim());
    },
  );

  return html;
}

function tryParseChartJson(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const id = `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = parsed.type || "bar";
    const data = JSON.stringify(parsed.data || []);
    const config = JSON.stringify(parsed.config || {
      series: [{ dataKey: "value", color: "#4f46e5", label: "Value" }],
      showLegend: true,
      showGrid: true,
    });
    return `<div data-type="chart-block" data-id="${id}" data-chart-type="${escapeAttr(type)}" data-data="${escapeAttr(data)}" data-config="${escapeAttr(config)}"></div>`;
  } catch {
    // Not valid JSON — leave as a code block
    return `<pre><code class="language-json">${escapeHtml(raw)}</code></pre>`;
  }
}

/**
 * $$...$$ → <div data-type="math-block">
 *
 * Handles multi-line display math.
 * Skips already-transformed content.
 */
function transformBlockMath(html: string): string {
  if (html.includes('data-type="math-block"')) return html;

  // Match $$ ... $$ (possibly multi-line, not inside a tag attribute)
  return html.replace(
    /\$\$([\s\S]+?)\$\$/g,
    (_match, latex: string) => {
      const trimmed = latex.trim();
      if (!trimmed) return _match;
      return `<div data-type="math-block" data-latex="${escapeAttr(trimmed)}"></div>`;
    },
  );
}

/**
 * $...$ → <span data-type="math-inline">
 *
 * Matches single-dollar inline math. Careful not to match $$
 * or dollar amounts like $100.
 */
function transformInlineMath(html: string): string {
  if (html.includes('data-type="math-inline"')) return html;

  // Inline $...$ — single dollar, not preceded/followed by another $,
  // not matching currency like $100
  return html.replace(
    /(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g,
    (_match, latex: string) => {
      const trimmed = latex.trim();
      if (!trimmed) return _match;
      // Skip currency patterns like $100, $3.50
      if (/^\d/.test(trimmed)) return _match;
      return `<span data-type="math-inline" data-latex="${escapeAttr(trimmed)}"></span>`;
    },
  );
}

/* ── Utilities ── */

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}
