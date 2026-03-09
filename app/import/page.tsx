"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OpenclawManifest } from "@/lib/marketplace/types";
import { quickScan } from "@/lib/marketplace/sanitizer";
import type { SanitizeIssue } from "@/lib/marketplace/types";

type Step = "upload" | "preview" | "importing" | "done";

interface ImportResult {
  success: boolean;
  workspaceId: string;
  importJobId: string;
  agentsCreated: number;
  documentsCreated: number;
  workflowsCreated: number;
  errors: string[];
}

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [manifest, setManifest] = useState<OpenclawManifest | null>(null);
  const [filename, setFilename] = useState("");
  const [issues, setIssues] = useState<SanitizeIssue[]>([]);
  const [error, setError] = useState("");

  // Selection state
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState<"existing" | "new">("new");
  const [workspaceId, setWorkspaceId] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [sanitize, setSanitize] = useState(true);

  // Import result
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  /* ---------------------------------------------------------------- */
  /* File reading                                                      */
  /* ---------------------------------------------------------------- */

  const handleFile = useCallback(async (file: File) => {
    setError("");
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large (max 50 MB)");
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as OpenclawManifest;

      if (!parsed.name) {
        setError("Invalid .openclaw file: missing 'name' field");
        return;
      }

      setManifest(parsed);
      setFilename(file.name);
      setNewWorkspaceName(parsed.name);

      // Select all items by default
      setSelectedAgents(new Set((parsed.agents ?? []).map((a) => a.id)));
      setSelectedDocs(new Set((parsed.documents ?? []).map((d) => d.id)));

      // Quick scan for issues
      const scanIssues = quickScan(parsed);
      setIssues(scanIssues);

      setStep("preview");
    } catch {
      setError("Failed to parse file. Ensure it is valid JSON.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  /* ---------------------------------------------------------------- */
  /* Import                                                            */
  /* ---------------------------------------------------------------- */

  const handleImport = async () => {
    if (!manifest) return;
    setImporting(true);
    setStep("importing");
    setError("");

    try {
      const res = await fetch("/api/marketplace/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifest,
          workspaceId: destination === "existing" ? workspaceId : undefined,
          newWorkspaceName: destination === "new" ? newWorkspaceName : undefined,
          selectedAgentIds: Array.from(selectedAgents),
          selectedDocumentIds: Array.from(selectedDocs),
          sanitize,
          originalFilename: filename,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        setStep("preview");
      } else {
        setResult(data);
        setStep("done");
      }
    } catch {
      setError("Network error during import");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Toggle helpers                                                    */
  /* ---------------------------------------------------------------- */

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Import .openclaw File</h1>
      <p className="mb-8 text-neutral-500">
        Upload a knowledge pack to add agents, documents, and workflows to your workspace.
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Step 1: Upload ── */}
      {step === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600"
        >
          <div className="mb-4 text-5xl">📦</div>
          <p className="mb-1 text-lg font-medium">Drop .openclaw file here</p>
          <p className="mb-4 text-sm text-neutral-500">or click to browse</p>
          <label>
            <Button variant="outline" asChild>
              <span>Select File</span>
            </Button>
            <input
              type="file"
              accept=".openclaw,.json"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
          <p className="mt-3 text-xs text-neutral-400">Max file size: 50 MB</p>
        </div>
      )}

      {/* ── Step 2: Preview & Customize ── */}
      {step === "preview" && manifest && (
        <div className="space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h2 className="mb-1 text-xl font-semibold">📦 {manifest.name}</h2>
            {manifest.description && (
              <p className="text-sm text-neutral-500">{manifest.description}</p>
            )}
            {manifest.author && (
              <p className="mt-1 text-xs text-neutral-400">by {manifest.author}</p>
            )}
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
              <h3 className="mb-2 font-medium text-yellow-800 dark:text-yellow-300">
                ⚠️ {issues.length} issue{issues.length > 1 ? "s" : ""} found
              </h3>
              <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
                {issues.slice(0, 5).map((issue, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs">{issue.location}</span>: {issue.description}
                  </li>
                ))}
                {issues.length > 5 && (
                  <li className="text-xs">...and {issues.length - 5} more</li>
                )}
              </ul>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sanitize}
                  onChange={(e) => setSanitize(e.target.checked)}
                  className="rounded"
                />
                Auto-redact issues on import
              </label>
            </div>
          )}

          {/* Agents */}
          {manifest.agents.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium">🎭 Agents to Import</h3>
              <div className="space-y-2">
                {manifest.agents.map((agent) => (
                  <label
                    key={agent.id}
                    className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.has(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                      className="rounded"
                    />
                    <span className="text-lg">{agent.avatar ?? "🤖"}</span>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-neutral-500">{agent.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {manifest.documents.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium">📚 Knowledge Documents</h3>
              <div className="space-y-2">
                {manifest.documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.has(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="rounded"
                    />
                    <p className="font-medium">{doc.title}</p>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Destination */}
          <div>
            <h3 className="mb-2 font-medium">Destination</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dest"
                  checked={destination === "new"}
                  onChange={() => setDestination("new")}
                />
                New workspace
              </label>
              {destination === "new" && (
                <Input
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  className="ml-6 max-w-xs"
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dest"
                  checked={destination === "existing"}
                  onChange={() => setDestination("existing")}
                />
                Existing workspace
              </label>
              {destination === "existing" && (
                <Input
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  placeholder="Workspace ID"
                  className="ml-6 max-w-xs"
                />
              )}
            </div>
          </div>

          <Button
            onClick={handleImport}
            disabled={
              importing ||
              (selectedAgents.size === 0 && selectedDocs.size === 0) ||
              (destination === "new" && !newWorkspaceName) ||
              (destination === "existing" && !workspaceId)
            }
            className="w-full"
            size="lg"
          >
            Import Knowledge
          </Button>
        </div>
      )}

      {/* ── Step 3: Importing ── */}
      {step === "importing" && (
        <div className="flex flex-col items-center py-16">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
          <p className="text-lg font-medium">Importing...</p>
          <p className="text-sm text-neutral-500">Setting up agents and documents</p>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === "done" && result && (
        <div className="space-y-6">
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
            <div className="mb-2 text-4xl">✅</div>
            <h2 className="mb-1 text-xl font-semibold">Import successful!</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Added {result.agentsCreated} agent{result.agentsCreated !== 1 ? "s" : ""},
              {" "}{result.documentsCreated} document{result.documentsCreated !== 1 ? "s" : ""}
            </p>
            {result.errors.length > 0 && (
              <p className="mt-2 text-xs text-yellow-600">
                {result.errors.length} warning{result.errors.length > 1 ? "s" : ""} during import
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => router.push(`/s/default`)}
              className="flex-1"
            >
              Open Workspace
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/sell/new")}
              className="flex-1"
            >
              Register for Sale
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
