"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  X,
  Sparkles,
  Shield,
  Brain,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ImportTier = "essential" | "full" | "complete";

interface UploadedFile {
  name: string;
  size: number;
  content: string;
  tier: ImportTier;
}

const TIER_FILES: Record<ImportTier, string[]> = {
  essential: ["SOUL.md", "IDENTITY.md", "USER.md", "AGENTS.md"],
  full: [
    "SOUL.md",
    "IDENTITY.md",
    "USER.md",
    "AGENTS.md",
    "TOOLS.md",
    "MEMORY.md",
    "HEARTBEAT.md",
  ],
  complete: [
    "SOUL.md",
    "IDENTITY.md",
    "USER.md",
    "AGENTS.md",
    "TOOLS.md",
    "MEMORY.md",
    "HEARTBEAT.md",
  ],
};

const BLOCKED_FILES = [
  "auth-profiles.json",
  "exec-approvals.json",
  "openclaw.json",
];

const FILE_DESCRIPTIONS: Record<string, string> = {
  "SOUL.md": "Personality, tone, values, ethical boundaries",
  "IDENTITY.md": "Name, role, emoji, visual description",
  "USER.md": "Owner profile, timezone, preferences",
  "AGENTS.md": "Operating rules, memory workflows, delegation",
  "TOOLS.md": "Tool usage preferences, CLI patterns, APIs",
  "MEMORY.md": "Curated long-term memory, decisions",
  "HEARTBEAT.md": "Periodic task checklist, proactive behavior",
};

const TIERS = [
  {
    id: "essential" as ImportTier,
    label: "Essential",
    description: "Core personality & identity",
    fileCount: 4,
    icon: Shield,
    coverage: "90% of agent uniqueness",
    color: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  {
    id: "full" as ImportTier,
    label: "Full",
    description: "Complete personality + tools",
    fileCount: 7,
    icon: Brain,
    coverage: "Full operational knowledge",
    color:
      "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800",
    iconColor: "text-purple-600 dark:text-purple-400",
    badgeClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  {
    id: "complete" as ImportTier,
    label: "Complete",
    description: "Everything + memory & skills",
    fileCount: null,
    icon: Layers,
    coverage: "Full historical context",
    color:
      "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
];

export default function OpenClawImportPage() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<ImportTier>("essential");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const tierFiles = TIER_FILES[selectedTier];
  const matchedFiles = files.filter((f) => tierFiles.includes(f.name));
  const extraFiles = files.filter(
    (f) =>
      !TIER_FILES.essential.includes(f.name) &&
      !TIER_FILES.full.includes(f.name)
  );

  const processFiles = useCallback(
    (fileList: FileList) => {
      setError("");
      const newFiles: UploadedFile[] = [];

      Array.from(fileList).forEach(async (file) => {
        if (BLOCKED_FILES.some((b) => file.name.includes(b))) {
          setError(
            `Skipped ${file.name} — contains sensitive data that should not be imported.`
          );
          return;
        }

        if (!file.name.endsWith(".md")) {
          setError(`Skipped ${file.name} — only .md files are accepted.`);
          return;
        }

        const content = await file.text();
        const tier: ImportTier = TIER_FILES.essential.includes(file.name)
          ? "essential"
          : TIER_FILES.full.includes(file.name)
            ? "full"
            : "complete";

        const uploaded: UploadedFile = {
          name: file.name,
          size: file.size,
          content,
          tier,
        };

        setFiles((prev) => {
          const without = prev.filter((f) => f.name !== uploaded.name);
          return [...without, uploaded];
        });
      });

      return newFiles;
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setImporting(true);
    setError("");

    try {
      const payload = {
        tier: selectedTier,
        files: files.map((f) => ({
          name: f.name,
          content: f.content,
        })),
      };

      const res = await fetch("/api/import/openclaw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
      } else {
        router.push(data.redirectUrl ?? "/s/default");
      }
    } catch {
      setError("Network error during import. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-5">
          <Link
            href="/import"
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Import Your OpenClaw Agent
            </h1>
            <p className="text-xs text-neutral-500">
              Bring your agent&apos;s personality, knowledge, and workflows into
              Knobase
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* What gets imported */}
        <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            What gets imported
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(FILE_DESCRIPTIONS).map(([file, desc]) => (
              <div key={file} className="flex items-start gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <div>
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {file}
                  </span>
                  <p className="text-xs text-neutral-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-neutral-400">
            API keys, auth profiles, and session logs are never imported.
          </p>
        </div>

        {/* Drag & drop upload */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`mb-8 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
            isDragging
              ? "border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-950"
              : "border-neutral-300 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600"
          }`}
        >
          <Upload
            className={`mb-3 h-8 w-8 ${isDragging ? "text-purple-500" : "text-neutral-300 dark:text-neutral-600"}`}
          />
          <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Drop your .md files here
          </p>
          <p className="mb-3 text-xs text-neutral-500">
            SOUL.md, IDENTITY.md, USER.md, and more
          </p>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>Browse Files</span>
            </Button>
            <input
              type="file"
              accept=".md"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Tier selector */}
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Choose import tier
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                    isSelected
                      ? `${tier.color} ring-1 ring-neutral-900 dark:ring-neutral-100`
                      : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className={`h-5 w-5 ${tier.iconColor}`} />
                    {isSelected && (
                      <Check className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {tier.label}
                      </p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${tier.badgeClass}`}
                      >
                        {tier.fileCount
                          ? `${tier.fileCount} files`
                          : "All files"}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {tier.description}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      {tier.coverage}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Uploaded files list */}
        {files.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Uploaded files
              <span className="ml-2 text-xs font-normal text-neutral-400">
                {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
            </h2>
            <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {files.map((file) => {
                const inTier = tierFiles.includes(file.name);
                return (
                  <div
                    key={file.name}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <FileText
                      className={`h-4 w-4 shrink-0 ${inTier ? "text-green-500" : "text-neutral-400"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {file.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatSize(file.size)}
                        {FILE_DESCRIPTIONS[file.name] &&
                          ` · ${FILE_DESCRIPTIONS[file.name]}`}
                      </p>
                    </div>
                    {inTier ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        <Check className="h-3 w-3" />
                        Included
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-neutral-500">
                        Extra
                      </Badge>
                    )}
                    <button
                      onClick={() => removeFile(file.name)}
                      className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Tier coverage summary */}
            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span>
                {matchedFiles.length} of {tierFiles.length} {selectedTier} tier
                files uploaded
                {selectedTier === "complete" && extraFiles.length > 0
                  ? ` + ${extraFiles.length} additional`
                  : ""}
              </span>
            </div>
          </div>
        )}

        {/* Import button */}
        <Button
          onClick={handleImport}
          disabled={importing || files.length === 0}
          size="lg"
          className="w-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {importing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-neutral-900/30 dark:border-t-neutral-900" />
              Importing...
            </span>
          ) : (
            <>
              Import Agent
              {files.length > 0 && (
                <span className="ml-1 text-xs opacity-70">
                  ({files.length} file{files.length !== 1 ? "s" : ""})
                </span>
              )}
            </>
          )}
        </Button>

        {/* Helper tip */}
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Quick export from terminal
          </p>
          <code className="block rounded-md bg-neutral-900 px-3 py-2 text-xs text-neutral-300 dark:bg-neutral-800">
            zip -j openclaw-export.zip
            ~/.openclaw/workspace/&#123;SOUL,IDENTITY,USER,AGENTS,TOOLS,MEMORY,HEARTBEAT&#125;.md
          </code>
        </div>
      </div>
    </div>
  );
}
