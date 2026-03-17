"use client";

import { useState, useCallback, useRef } from "react";
import {
  Download,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileUp,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type ExportFormat = "openclaw" | "claude" | "markdown";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  openclaw: "OpenClaw (.json)",
  claude: "Claude Project (.md)",
  markdown: "Markdown (.md)",
};

interface ImportResult {
  imported: Array<{ filename: string; size: number }>;
  skipped: Array<{ filename: string; reason: string }>;
  errors: Array<{ filename: string; error: string }>;
}

interface AgentImportExportProps {
  agentId: string;
  apiKey: string;
}

export function AgentImportExport({
  agentId,
  apiKey,
}: AgentImportExportProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("openclaw");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = useCallback(
    (): Record<string, string> => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    [apiKey],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const res = await fetch(`/api/agents/${agentId}/export`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ format: exportFormat }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Export failed (${res.status})`);
      }

      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? `agent-export.${exportFormat === "openclaw" ? "json" : "md"}`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [agentId, exportFormat, authHeaders]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setImporting(true);
      setImportResult(null);
      setImportError(null);

      try {
        const formData = new FormData();
        formData.append("overwrite", String(overwrite));
        for (const file of Array.from(files)) {
          formData.append("files", file);
        }

        const res = await fetch(`/api/agents/${agentId}/import`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Import failed (${res.status})`);
        }

        const result: ImportResult = await res.json();
        setImportResult(result);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Import failed");
      } finally {
        setImporting(false);
      }
    },
    [agentId, apiKey, overwrite],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
      }
      e.target.value = "";
    },
    [uploadFiles],
  );

  const importedCount = importResult?.imported.length ?? 0;
  const skippedCount = importResult?.skipped.length ?? 0;
  const errorCount = importResult?.errors.length ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-4" />
            Export Files
          </CardTitle>
          <CardDescription>
            Download agent files in your preferred format
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select
              value={exportFormat}
              onValueChange={(v) => setExportFormat(v as ExportFormat)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(FORMAT_LABELS) as [ExportFormat, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {exporting ? "Exporting..." : "Export"}
          </Button>

          {exportSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              Download started
            </div>
          )}

          {exportError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {exportError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-4" />
            Import Files
          </CardTitle>
          <CardDescription>
            Upload .zip or .md files to import into this agent
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragActive
                ? "border-ring bg-accent/50"
                : "border-muted-foreground/25 hover:border-muted-foreground/40"
            }`}
          >
            {importing ? (
              <>
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Importing...</p>
              </>
            ) : (
              <>
                <FileUp className="size-6 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  Drag &amp; drop files here
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose files
                </Button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.md,.json"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="overwrite"
              checked={overwrite}
              onCheckedChange={(checked) => setOverwrite(checked === true)}
            />
            <Label htmlFor="overwrite" className="text-sm font-normal">
              Overwrite existing files
            </Label>
          </div>

          {importError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {importError}
            </div>
          )}

          {importResult && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {importedCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {importedCount} imported
                  </Badge>
                )}
                {skippedCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {skippedCount} skipped
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} {errorCount === 1 ? "error" : "errors"}
                  </Badge>
                )}
                {importedCount === 0 && skippedCount === 0 && errorCount === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No files were processed
                  </p>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <ul className="space-y-1 text-xs text-destructive">
                  {importResult.errors.map((e) => (
                    <li key={e.filename}>
                      <span className="font-medium">{e.filename}:</span>{" "}
                      {e.error}
                    </li>
                  ))}
                </ul>
              )}

              {importResult.skipped.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {importResult.skipped.map((s) => (
                    <li key={s.filename}>
                      <span className="font-medium">{s.filename}:</span>{" "}
                      {s.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
