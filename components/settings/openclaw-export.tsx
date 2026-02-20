"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, FileJson, Check, Eye, EyeOff } from "lucide-react";
import { listAgents } from "@/lib/agents/store";
import { listDocuments } from "@/lib/documents/store";
import { generateOpenClawExport } from "@/lib/openclaw/parser";

export function OpenClawExport() {
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exported, setExported] = useState(false);

  const generateExport = useCallback(() => {
    const agents = listAgents();
    const workspaceName =
      (typeof window !== "undefined"
        ? localStorage.getItem("knobase-app:workspace")
        : null) ?? "Knobase";

    const config = generateOpenClawExport(agents, workspaceName);
    return JSON.stringify(config, null, 2);
  }, []);

  const handlePreview = useCallback(() => {
    if (showPreview) {
      setShowPreview(false);
      setPreview(null);
      return;
    }
    setPreview(generateExport());
    setShowPreview(true);
  }, [showPreview, generateExport]);

  const handleExport = useCallback(() => {
    const json = generateExport();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knobase.openclaw.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }, [generateExport]);

  const agents = typeof window !== "undefined" ? listAgents() : [];
  const docs = typeof window !== "undefined" ? listDocuments() : [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-800">
            Export Summary
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-4 px-4 py-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-900">
              {agents.length}
            </div>
            <div className="text-[11px] text-neutral-400">Agents</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-900">
              {docs.length}
            </div>
            <div className="text-[11px] text-neutral-400">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-900">6</div>
            <div className="text-[11px] text-neutral-400">Tools</div>
          </div>
        </div>

        <div className="space-y-2 border-t border-neutral-100 px-4 py-3">
          <p className="text-xs text-neutral-500">
            The export includes agent configurations, workspace structure, MCP
            endpoint settings, and tool definitions. Document content is not
            included.
          </p>
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-4 py-3">
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            {showPreview ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showPreview ? "Hide" : "Preview"}
          </button>
          <button
            onClick={handleExport}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-purple-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-purple-600"
          >
            {exported ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Downloaded
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Download .openclaw File
              </>
            )}
          </button>
        </div>
      </div>

      {showPreview && preview && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-lg border border-neutral-200"
        >
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-2">
            <FileJson className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs font-medium text-neutral-600">
              knobase.openclaw.json
            </span>
          </div>
          <pre className="max-h-80 overflow-auto bg-neutral-900 p-4 text-xs leading-relaxed text-neutral-300">
            {preview}
          </pre>
        </motion.div>
      )}
    </div>
  );
}
