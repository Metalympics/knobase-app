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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgentFile {
  filename: string;
  page_id: string;
  page_title: string;
  updated_at: string;
}

interface AgentFilesProps {
  agentId: string;
  apiKey: string;
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

export function AgentFiles({ agentId, apiKey }: AgentFilesProps) {
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const authHeaders = useCallback(
    (): Record<string, string> => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    [apiKey],
  );

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/files`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed to load files (${res.status})`);
      }

      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [agentId, authHeaders]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/sync`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ files }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Sync failed (${res.status})`);
      }

      const result = await res.json();
      const parts: string[] = [];
      if (result.uploaded?.length) parts.push(`${result.uploaded.length} uploaded`);
      if (result.downloaded?.length) parts.push(`${result.downloaded.length} downloaded`);
      if (result.conflicts?.length) parts.push(`${result.conflicts.length} conflicts`);
      setSyncResult(parts.length > 0 ? parts.join(", ") : "Everything up to date");

      await fetchFiles();
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 4000);
    }
  }, [agentId, apiKey, files, authHeaders, fetchFiles]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              Agent Files
            </CardTitle>
            <CardDescription>
              Knobase pages linked to this agent
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {syncResult && (
              <Badge variant="secondary" className="text-xs">
                {syncResult}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || loading}
            >
              {syncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sync
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading files...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <AlertCircle className="size-8 text-destructive/60" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchFiles}>
              Retry
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <FileText className="size-8 opacity-40" />
            <p className="text-sm">No files yet</p>
            <p className="text-xs">Files will appear here once the agent creates them.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {files.map((file) => (
              <li key={file.page_id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.page_title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                        {file.filename}
                      </Badge>
                      <span>&middot;</span>
                      <span>{formatTimestamp(file.updated_at)}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={`/d/${file.page_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="size-3.5" />
                    Open
                  </Button>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
