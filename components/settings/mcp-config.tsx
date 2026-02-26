"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Server,
  RefreshCw,
  Copy,
  Check,
  Wrench,
  Shield,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface MCPTool {
  name: string;
  description: string;
  enabled: boolean;
}

interface MCPServerStatus {
  running: boolean;
  endpoint: string;
  tools: MCPTool[];
  version: string;
}

const LS_KEY = "knobase-app:mcp-tool-settings";

function readToolSettings(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeToolSettings(settings: Record<string, boolean>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  }
}

const DEFAULT_TOOLS: MCPTool[] = [
  { name: "list_documents", description: "List all documents in the workspace", enabled: true },
  { name: "read_document", description: "Read a document's content by ID", enabled: true },
  { name: "write_document", description: "Create or update a document", enabled: true },
  { name: "search_documents", description: "Full-text search across documents", enabled: true },
  { name: "delete_document", description: "Delete a document by ID", enabled: true },
  { name: "list_collections", description: "List all collections", enabled: true },
  { name: "get_workspace_info", description: "Get workspace metadata", enabled: true },
];

export function MCPConfig() {
  const [status, setStatus] = useState<MCPServerStatus>({
    running: true,
    endpoint: "/api/mcp",
    tools: DEFAULT_TOOLS,
    version: "1.0.0",
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedTools, setExpandedTools] = useState(false);
  const [toolSettings, setToolSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = readToolSettings();
    setToolSettings(saved);
    setStatus((prev) => ({
      ...prev,
      tools: prev.tools.map((t) => ({
        ...t,
        enabled: saved[t.name] !== undefined ? saved[t.name] : t.enabled,
      })),
    }));
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "ping",
          method: "ping",
        }),
      });
      setStatus((prev) => ({ ...prev, running: res.ok }));
    } catch {
      setStatus((prev) => ({ ...prev, running: false }));
    }
    setLoading(false);
  }, []);

  const handleToggleTool = useCallback(
    (toolName: string) => {
      const newSettings = { ...toolSettings, [toolName]: !toolSettings[toolName] };
      // If tool was not in settings, default was enabled, so toggle to disabled
      if (toolSettings[toolName] === undefined) {
        newSettings[toolName] = false;
      }
      setToolSettings(newSettings);
      writeToolSettings(newSettings);
      setStatus((prev) => ({
        ...prev,
        tools: prev.tools.map((t) =>
          t.name === toolName ? { ...t, enabled: newSettings[toolName] ?? true } : t,
        ),
      }));
    },
    [toolSettings],
  );

  const handleCopyEndpoint = useCallback(() => {
    const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${status.endpoint}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [status.endpoint]);

  const handleExportConfig = useCallback(() => {
    const config = {
      mcpServers: {
        knobase: {
          command: "npx",
          args: ["-y", "knobase-mcp-server"],
          env: {
            KNOBASE_URL:
              typeof window !== "undefined"
                ? window.location.origin
                : "http://localhost:3000",
            KNOBASE_API_KEY: "<your-api-key>",
          },
        },
      },
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mcp-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const enabledCount = status.tools.filter((t) => t.enabled).length;

  return (
    <div className="space-y-4">
      {/* Server Status */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-neutral-800">
              MCP Server
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                status.running ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span className="text-xs font-medium text-neutral-600">
              {status.running ? "Running" : "Offline"}
            </span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          {/* Endpoint */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-600">
              Server Endpoint
            </label>
            <div className="flex items-center gap-2">
              <div className="flex h-9 flex-1 items-center rounded-md border border-neutral-200 bg-neutral-50 px-3">
                <span className="font-mono text-sm text-neutral-600">
                  {typeof window !== "undefined"
                    ? window.location.origin
                    : ""}
                  {status.endpoint}
                </span>
              </div>
              <button
                onClick={handleCopyEndpoint}
                className="flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Version */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">Protocol Version</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-neutral-600">
              MCP v{status.version}
            </span>
          </div>
        </div>
      </div>

      {/* Available Tools */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <button
          onClick={() => setExpandedTools(!expandedTools)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-neutral-800">
              Available Tools
            </span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600">
              {enabledCount}/{status.tools.length} enabled
            </span>
          </div>
          {expandedTools ? (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          )}
        </button>

        {expandedTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="border-t border-neutral-100"
          >
            <div className="divide-y divide-neutral-50">
              {status.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium text-neutral-700">
                      {tool.name}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {tool.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleTool(tool.name)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      tool.enabled ? "bg-purple-500" : "bg-neutral-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                        tool.enabled ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Permissions */}
      <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-neutral-800">
            Tool Permissions
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Connected agents can only access enabled tools. Disable tools to
          restrict agent capabilities for this workspace.
        </p>
      </div>

      {/* Export config */}
      <div className="flex gap-2">
        <button
          onClick={handleExportConfig}
          className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Export MCP Config
        </button>
      </div>
    </div>
  );
}
