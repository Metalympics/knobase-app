/**
 * Document Format Guide for AI Agents
 *
 * Injected into agent instructions so OpenClaw (and any other agent)
 * produces content that our Tiptap editor renders correctly as
 * interactive blocks rather than raw text.
 */

export const DOCUMENT_FORMAT_GUIDE = `
DOCUMENT FORMAT GUIDE — Rich Content Blocks:
The Knobase editor supports special rich content blocks beyond plain HTML.
When writing or editing documents, use these formats for the best user experience:

1. MATH EQUATIONS (KaTeX):
   • Block math (display mode): wrap LaTeX in double dollar signs:
     $$E = mc^2$$
     $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
   • Inline math: wrap in single dollar signs within text:
     The formula $x^2 + y^2 = r^2$ describes a circle.
   • These are automatically rendered as interactive KaTeX blocks.

2. MERMAID DIAGRAMS:
   Use a fenced code block with language "mermaid":
   \`\`\`mermaid
   graph TD
       A[Start] --> B{Decision}
       B -->|Yes| C[Action]
       B -->|No| D[Other]
   \`\`\`
   Supported: flowcharts, sequence diagrams, Gantt charts, class diagrams, ER diagrams, state diagrams.

3. CHARTS (Recharts):
   Use a fenced code block with language "chart" containing JSON:
   \`\`\`chart
   {
     "type": "bar",
     "data": [
       { "name": "Q1", "revenue": 12000, "expenses": 8000 },
       { "name": "Q2", "revenue": 19000, "expenses": 12000 }
     ],
     "config": {
       "title": "Quarterly Report",
       "xAxis": { "dataKey": "name", "label": "Quarter" },
       "yAxis": { "label": "Amount ($)" },
       "series": [
         { "dataKey": "revenue", "color": "#4f46e5", "label": "Revenue" },
         { "dataKey": "expenses", "color": "#ef4444", "label": "Expenses" }
       ],
       "showLegend": true,
       "showGrid": true
     }
   }
   \`\`\`
   Supported chart types: "bar", "line", "area", "pie", "radar".
   • data: array of objects with a label key and numeric keys
   • config.series: array mapping dataKey → color + label
   • config.xAxis.dataKey: which key is the x-axis label

4. CODE BLOCKS:
   Use standard fenced code blocks with a language tag:
   \`\`\`typescript
   const hello = "world";
   \`\`\`
   The editor auto-detects language for syntax highlighting, copy button, and line numbers.

5. STANDARD BLOCKS (always supported):
   • Headings: # H1, ## H2, ### H3
   • Lists: - bullet, 1. numbered
   • Task lists: - [ ] todo, - [x] done
   • Tables: standard markdown tables
   • Blockquotes: > quote text
   • Horizontal rules: ---
   • Links: [text](url)
   • Images: ![alt](url)
   • Inline code: \`code\`

IMPORTANT: When using stream_edit or write_document, the content field accepts
both HTML and these markdown patterns. The editor auto-converts them to
interactive blocks. Prefer markdown patterns — they are simpler and always work.
`.trim();
