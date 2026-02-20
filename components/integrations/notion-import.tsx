"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { parseNotionExport, type NotionPage, type ParseResult } from "@/lib/integrations/notion/parser";

interface NotionImportProps {
  onImport?: (pages: NotionPage[]) => void;
}

export default function NotionImport({ onImport }: NotionImportProps) {
  const [stage, setStage] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      alert("Please upload a Notion export ZIP file");
      return;
    }

    const parsed = await parseNotionExport(file);
    setResult(parsed);
    setPages(parsed.pages);
    setStage("preview");
  }

  function togglePage(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  }

  function selectAll(selected: boolean) {
    setPages((prev) => prev.map((p) => ({ ...p, selected })));
  }

  async function handleImport() {
    const selected = pages.filter((p) => p.selected);
    if (selected.length === 0) return;

    setStage("importing");
    setProgress(0);

    for (let i = 0; i < selected.length; i++) {
      setProgress(Math.round(((i + 1) / selected.length) * 100));
      setImportedCount(i + 1);
      // Small delay to show progress
      await new Promise((r) => setTimeout(r, 100));
    }

    onImport?.(selected);
    setStage("done");
  }

  if (stage === "upload") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Import from Notion</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your Notion export to bring your pages into Knobase
          </p>
        </div>

        <div
          className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-3xl mb-3">📦</div>
          <p className="text-sm font-medium">Drop your Notion export here</p>
          <p className="text-xs text-muted-foreground mt-1">
            Export from Notion: Settings → Export all workspace content → Markdown & CSV
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Choose File
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="text-sm font-medium mb-2">How to export from Notion</h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open Notion and go to Settings & Members</li>
            <li>Scroll down to Export all workspace content</li>
            <li>Choose Markdown & CSV format</li>
            <li>Download the ZIP file</li>
            <li>Upload it here</li>
          </ol>
        </div>
      </div>
    );
  }

  if (stage === "preview" && result) {
    const selectedCount = pages.filter((p) => p.selected).length;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Preview Import</h3>
            <p className="text-sm text-muted-foreground">
              {result.totalFiles} files found, {pages.length} pages parsed
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setStage("upload"); setResult(null); }}>
            Back
          </Button>
        </div>

        {result.errors.length > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
            <p className="text-xs font-medium text-yellow-600">{result.errors.length} warnings</p>
            <div className="mt-1 max-h-20 overflow-y-auto">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-muted-foreground">{err}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => selectAll(true)} className="text-primary hover:underline">Select all</button>
          <span className="text-muted-foreground">|</span>
          <button onClick={() => selectAll(false)} className="text-primary hover:underline">Deselect all</button>
          <span className="text-muted-foreground ml-auto">{selectedCount} selected</span>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {pages.map((page) => (
            <label
              key={page.id}
              className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                page.selected ? "border-primary/30 bg-primary/5" : "border-transparent hover:bg-muted/50"
              }`}
            >
              <input
                type="checkbox"
                checked={page.selected}
                onChange={() => togglePage(page.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{page.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {page.content.slice(0, 100)}...
                </p>
                <div className="flex gap-1 mt-1">
                  {page.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-muted">
                      {tag}
                    </span>
                  ))}
                  {page.images.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-600">
                      {page.images.length} images
                    </span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>

        <Button className="w-full" onClick={handleImport} disabled={selectedCount === 0}>
          Import {selectedCount} {selectedCount === 1 ? "page" : "pages"}
        </Button>
      </div>
    );
  }

  if (stage === "importing") {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Importing...</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Importing pages</span>
            <span className="text-muted-foreground">{importedCount} / {pages.filter((p) => p.selected).length}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center py-8">
      <div className="text-4xl">✅</div>
      <h3 className="text-lg font-semibold">Import Complete</h3>
      <p className="text-sm text-muted-foreground">
        Successfully imported {importedCount} pages from Notion
      </p>
      <Button
        variant="outline"
        onClick={() => {
          setStage("upload");
          setResult(null);
          setPages([]);
          setProgress(0);
          setImportedCount(0);
        }}
      >
        Import More
      </Button>
    </div>
  );
}
