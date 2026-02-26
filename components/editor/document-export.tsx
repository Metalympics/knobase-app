"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X,
  Download,
  FileText,
  FileCode,
  FileJson,
  AlignLeft,
  Copy,
  Check,
  Settings2,
} from "lucide-react";
import {
  exportDocument,
  downloadExport,
  copyExportToClipboard,
  type ExportFormat,
  type ExportResult,
} from "@/lib/documents/export";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DocumentExportDialogProps {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Format cards                                                        */
/* ------------------------------------------------------------------ */

const FORMATS: {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "markdown",
    label: "Markdown",
    description: "Standard .md with headings, links, code blocks",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "html",
    label: "HTML",
    description: "Self-contained HTML page with styling",
    icon: <FileCode className="h-5 w-5" />,
  },
  {
    id: "json",
    label: "JSON",
    description: "Structured data with metadata",
    icon: <FileJson className="h-5 w-5" />,
  },
  {
    id: "txt",
    label: "Plain Text",
    description: "Clean text without formatting",
    icon: <AlignLeft className="h-5 w-5" />,
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function DocumentExportDialog({
  documentId,
  documentTitle,
  onClose,
}: DocumentExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeFrontmatter, setIncludeFrontmatter] = useState(false);
  const [includeComments, setIncludeComments] = useState(false);
  const [preview, setPreview] = useState<ExportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = useCallback(() => {
    try {
      const result = exportDocument({
        documentId,
        format,
        includeMetadata,
        includeFrontmatter,
        includeComments,
      });
      setPreview(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
      setPreview(null);
    }
  }, [documentId, format, includeMetadata, includeFrontmatter, includeComments]);

  const handleDownload = useCallback(() => {
    try {
      const result = exportDocument({
        documentId,
        format,
        includeMetadata,
        includeFrontmatter,
        includeComments,
      });
      downloadExport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }, [documentId, format, includeMetadata, includeFrontmatter, includeComments]);

  const handleCopy = useCallback(async () => {
    try {
      const result = exportDocument({
        documentId,
        format,
        includeMetadata,
        includeFrontmatter,
        includeComments,
      });
      await copyExportToClipboard(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy failed");
    }
  }, [documentId, format, includeMetadata, includeFrontmatter, includeComments]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="mx-4 w-full max-w-lg rounded-xl border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Export Document</h2>
            <p className="mt-0.5 text-xs text-neutral-400 truncate max-w-[320px]">
              {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* Format selection */}
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-600">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFormat(f.id);
                    setPreview(null);
                  }}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    format === f.id
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div
                    className={`${
                      format === f.id ? "text-neutral-900" : "text-neutral-400"
                    }`}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{f.label}</p>
                    <p className="text-[10px] text-neutral-400">{f.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-neutral-400" />
              <label className="text-xs font-medium text-neutral-600">Options</label>
            </div>
            <div className="space-y-2">
              {(format === "json" || format === "markdown") && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-neutral-300"
                  />
                  <span className="text-xs text-neutral-600">Include metadata</span>
                </label>
              )}
              {format === "markdown" && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeFrontmatter}
                    onChange={(e) => setIncludeFrontmatter(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-neutral-300"
                  />
                  <span className="text-xs text-neutral-600">Include YAML frontmatter</span>
                </label>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-neutral-300"
                />
                <span className="text-xs text-neutral-600">Include comments</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-600">Preview</label>
                <span className="text-[10px] text-neutral-400">{preview.filename}</span>
              </div>
              <pre className="max-h-40 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-600">
                {preview.content.slice(0, 2000)}
                {preview.content.length > 2000 && "\n\n... (truncated)"}
              </pre>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
          <button
            onClick={generatePreview}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Preview
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
