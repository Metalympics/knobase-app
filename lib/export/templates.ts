// HTML templates for document export

import type { ExportTemplateData } from "./types";

/**
 * Base CSS styles for exported documents
 */
export const getBaseStyles = (): string => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #171717;
    background: white;
    padding: 48px;
    max-width: 800px;
    margin: 0 auto;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }

  h1 { font-size: 2em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.25em; }

  p {
    margin-bottom: 1em;
  }

  ul, ol {
    margin-left: 1.5em;
    margin-bottom: 1em;
  }

  li {
    margin-bottom: 0.25em;
  }

  blockquote {
    border-left: 4px solid #e5e5e5;
    padding-left: 1em;
    margin: 1em 0;
    color: #737373;
    font-style: italic;
  }

  code {
    background: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
  }

  pre {
    background: #f5f5f5;
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1em 0;
  }

  pre code {
    background: none;
    padding: 0;
  }

  a {
    color: #2563eb;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
  }

  th, td {
    border: 1px solid #e5e5e5;
    padding: 0.75em;
    text-align: left;
  }

  th {
    background: #f5f5f5;
    font-weight: 600;
  }

  hr {
    border: none;
    border-top: 2px solid #e5e5e5;
    margin: 2em 0;
  }

  .export-header {
    border-bottom: 2px solid #e5e5e5;
    padding-bottom: 24px;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .export-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .export-logo {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
  }

  .export-school {
    font-size: 0.875em;
    color: #737373;
    font-weight: 500;
  }

  .export-footer {
    border-top: 2px solid #e5e5e5;
    padding-top: 24px;
    margin-top: 48px;
    font-size: 0.875em;
    color: #737373;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .export-author {
    font-weight: 500;
  }

  .export-timestamp {
    font-style: italic;
  }
`;

/**
 * Generate complete HTML document for export
 */
export const generateExportHTML = (data: ExportTemplateData): string => {
  const { content, metadata, styles } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.documentTitle)}</title>
  <style>${styles}</style>
</head>
<body>
  ${metadata.schoolLogo ? `
  <div class="export-header">
    <div class="export-header-left">
      <img src="${escapeHtml(metadata.schoolLogo)}" alt="${escapeHtml(metadata.schoolName)}" class="export-logo" />
      <div>
        <h1 style="margin: 0;">${escapeHtml(metadata.documentTitle)}</h1>
        <div class="export-school">${escapeHtml(metadata.schoolName)}</div>
      </div>
    </div>
  </div>
  ` : `
  <div class="export-header">
    <div>
      <h1 style="margin: 0;">${escapeHtml(metadata.documentTitle)}</h1>
      <div class="export-school">${escapeHtml(metadata.schoolName)}</div>
    </div>
  </div>
  `}
  
  <div class="export-content">
    ${content}
  </div>
  
  <div class="export-footer">
    <div class="export-author">
      ${metadata.authorName ? `By ${escapeHtml(metadata.authorName)}` : ''}
    </div>
    <div class="export-timestamp">
      Exported ${formatTimestamp(metadata.exportedAt)}
    </div>
  </div>
</body>
</html>`;
};

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
