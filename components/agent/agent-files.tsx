"use client";

import { useState, useCallback, useEffect } from "react";
import {
  FileText,
  RefreshCw,
  Loader2,
  AlertCircle,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AgentFile {
  filename: string;
  content: string;
  updated_at: string;
}

interface AgentFilesProps {
  agentId: string;
  apiKey: string;
}

function formatFileSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const [selectedFile, setSelectedFile] = useState<AgentFile | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const openFile = useCallback((file: AgentFile) => {
    setSelectedFile(file);
    setEditContent(file.content);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/files`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          filename: selectedFile.filename,
          content: editContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Save failed (${res.status})`);
      }

      setSelectedFile(null);
      await fetchFiles();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [agentId, selectedFile, editContent, authHeaders, fetchFiles]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Agent Files
              </CardTitle>
              <CardDescription>
                Files stored in this agent&apos;s cloud workspace
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow
                    key={file.filename}
                    className="cursor-pointer"
                    onClick={() => openFile(file)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        {file.filename}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(file.content)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimestamp(file.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedFile}
        onOpenChange={(open) => {
          if (!open) setSelectedFile(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              {selectedFile?.filename}
            </DialogTitle>
            <DialogDescription>
              Last updated {selectedFile ? formatTimestamp(selectedFile.updated_at) : ""}
              {" \u00b7 "}
              {selectedFile ? formatFileSize(selectedFile.content) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-[400px] w-full resize-none rounded-md border bg-muted/30 px-4 py-3 font-mono text-sm leading-relaxed outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              spellCheck={false}
            />
          </div>

          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedFile(null)}
              disabled={saving}
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || editContent === selectedFile?.content}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
