"use client";

import { useState, useCallback, useEffect } from "react";
import {
  FileText,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface AgentFile {
  filename: string;
  page_id: string;
  page_title: string;
  updated_at: string;
}

interface AgentFilesProps {
  agentId: string;
  workspaceId: string;
  apiKey?: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AgentFiles({ agentId, workspaceId, apiKey }: AgentFilesProps) {
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (apiKey) {
        const res = await fetch(`/api/agents/${agentId}/files`, {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Failed to load files (${res.status})`);
        }
        const data = await res.json();
        setFiles(data.files ?? []);
      } else {
        const supabase = createClient();
        const { data, error: fetchErr } = await supabase
          .from("agent_files")
          .select("filename, page_id, updated_at, pages!inner(id, title)")
          .eq("agent_id", agentId)
          .order("filename");

        if (fetchErr) throw new Error(fetchErr.message);

        const mapped = (data ?? []).map((row: any) => {
          const page = row.pages as unknown as { id: string; title: string };
          return {
            filename: row.filename,
            page_id: row.page_id,
            page_title: page?.title ?? "Untitled",
            updated_at: row.updated_at,
          };
        });
        setFiles(mapped);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [agentId, apiKey]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <FileText className="h-4 w-4" />
            Linked Pages
          </h3>
          <p className="text-xs text-neutral-500">Knobase pages linked to this agent</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          <span className="ml-2 text-sm text-neutral-400">Loading files...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-red-300" />
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchFiles}>Retry</Button>
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-neutral-400">
          <FileText className="h-8 w-8 opacity-40" />
          <p className="text-sm">No linked pages yet</p>
          <p className="text-xs">Pages will appear here once the agent creates them.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {files.map((file) => (
            <li key={file.page_id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3 min-w-0">
                <FileText className="h-4 w-4 mt-0.5 shrink-0 text-neutral-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-neutral-900">{file.page_title}</p>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                      {file.filename}
                    </Badge>
                    <span>&middot;</span>
                    <span>{formatTimestamp(file.updated_at)}</span>
                  </div>
                </div>
              </div>
              <a
                href={`/s/${workspaceId}/d/${file.page_id}`}
                className="shrink-0"
              >
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Button>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
