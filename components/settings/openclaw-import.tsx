"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileJson, AlertCircle, Check, User, Zap } from "lucide-react";
import { parseOpenClawConfig, openClawAgentToKnobase, type ParseResult } from "@/lib/openclaw/parser";
import { createAgent } from "@/lib/agents/store";

interface OpenClawImportProps {
  onImportComplete?: (agentCount: number) => void;
}

export function OpenClawImport({ onImportComplete }: OpenClawImportProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setImported(false);
    const text = await file.text();
    const result = parseOpenClawConfig(text);
    setParseResult(result);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = useCallback(() => {
    if (!parseResult?.config) return;
    setImporting(true);

    const agents = parseResult.config.agents ?? [];
    let created = 0;

    for (const ac of agents) {
      const data = openClawAgentToKnobase(ac);
      createAgent(data);
      created++;
    }

    if (parseResult.config.mcp?.endpoint) {
      localStorage.setItem("knobase-app:openclaw-endpoint", parseResult.config.mcp.endpoint);
    }

    setImporting(false);
    setImported(true);
    onImportComplete?.(created);
  }, [parseResult, onImportComplete]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-8 transition-colors hover:border-purple-300 hover:bg-purple-50/30"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
          <Upload className="h-5 w-5 text-purple-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-700">
            Drop .openclaw file here or click to browse
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Supports .json and .openclaw config files
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.openclaw"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {parseResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg border border-neutral-200 bg-white"
          >
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
              <FileJson className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-neutral-800">
                {fileName}
              </span>
              {parseResult.success ? (
                <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  Valid
                </span>
              ) : (
                <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                  Invalid
                </span>
              )}
            </div>

            {parseResult.errors.length > 0 && (
              <div className="border-b border-neutral-100 px-4 py-2">
                {parseResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <span className="text-xs text-red-600">{err}</span>
                  </div>
                ))}
              </div>
            )}

            {parseResult.success && parseResult.config && (
              <>
                <div className="space-y-3 px-4 py-3">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                      Config
                    </span>
                    <p className="mt-1 text-sm text-neutral-700">
                      {parseResult.config.displayName ?? parseResult.config.name}
                      {parseResult.config.version && (
                        <span className="ml-1 text-xs text-neutral-400">
                          v{parseResult.config.version}
                        </span>
                      )}
                    </p>
                    {parseResult.config.description && (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {parseResult.config.description}
                      </p>
                    )}
                  </div>

                  {parseResult.config.agents && parseResult.config.agents.length > 0 && (
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        Agents ({parseResult.config.agents.length})
                      </span>
                      <div className="mt-2 space-y-2">
                        {parseResult.config.agents.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2"
                          >
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                              style={{ backgroundColor: a.color ?? "#8B5CF6" }}
                            >
                              {a.avatar ?? "🤖"}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-neutral-800">
                                {a.name}
                              </p>
                              <p className="text-[11px] text-neutral-400">
                                {(a.capabilities ?? []).join(", ")}
                              </p>
                            </div>
                            <User className="h-3.5 w-3.5 text-neutral-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parseResult.config.tools && parseResult.config.tools.length > 0 && (
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        Tools ({parseResult.config.tools.length})
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {parseResult.config.tools.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-600"
                          >
                            <Zap className="h-2.5 w-2.5" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-100 px-4 py-3">
                  <button
                    onClick={handleImport}
                    disabled={importing || imported}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
                  >
                    {imported ? (
                      <>
                        <Check className="h-4 w-4" />
                        Imported Successfully
                      </>
                    ) : importing ? (
                      "Importing..."
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import to Knobase
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
