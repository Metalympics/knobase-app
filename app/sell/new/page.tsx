"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  OpenclawManifest,
  OpenclawAgent,
  OpenclawDocument,
  SanitizeIssue,
} from "@/lib/marketplace/types";
import { quickScan } from "@/lib/marketplace/sanitizer";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "Research",
  "Writing",
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Support",
  "Legal",
  "Finance",
  "Education",
  "Productivity",
  "Other",
];

const STEPS = ["Select Content", "Privacy Check", "Details", "Review"] as const;
type StepName = (typeof STEPS)[number];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CreateListingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 – content source
  const [workspaceId, setWorkspaceId] = useState("");
  const [manifest, setManifest] = useState<OpenclawManifest | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState("");

  // Step 2 – privacy
  const [issues, setIssues] = useState<SanitizeIssue[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  // Step 3 – metadata
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Step 4 – submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* ---------------------------------------------------------------- */
  /* Step 1: Load content from workspace                               */
  /* ---------------------------------------------------------------- */

  const loadWorkspace = useCallback(async (wsId: string) => {
    if (!wsId) return;
    setLoadingContent(true);
    setContentError("");
    try {
      const res = await fetch(`/api/marketplace/export?workspaceId=${wsId}`);
      if (!res.ok) throw new Error("Failed to load workspace content");
      const data: OpenclawManifest = await res.json();
      setManifest(data);
      // Select all by default
      setSelectedAgentIds(new Set(data.agents.map((a) => a.id)));
      setSelectedDocIds(new Set(data.documents.map((d) => d.id)));
      setName(data.name);
      setDescription(data.description);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingContent(false);
    }
  }, []);

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDoc(id: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /* Step 2: Privacy scan                                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (step === 1 && manifest) {
      // Build a filtered manifest for scanning
      const filtered: OpenclawManifest = {
        ...manifest,
        agents: manifest.agents.filter((a) => selectedAgentIds.has(a.id)),
        documents: manifest.documents.filter((d) => selectedDocIds.has(d.id)),
      };
      const found = quickScan(filtered);
      setIssues(found);
      setAcknowledged(found.length === 0);
    }
  }, [step, manifest, selectedAgentIds, selectedDocIds]);

  /* ---------------------------------------------------------------- */
  /* Step 3: Tags helper                                               */
  /* ---------------------------------------------------------------- */

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  }

  function removeTag(t: string) {
    setTags(tags.filter((tag) => tag !== t));
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /* Step 4: Submit                                                    */
  /* ---------------------------------------------------------------- */

  async function handleSubmit() {
    if (!manifest) return;
    setSubmitting(true);
    setSubmitError("");

    const filteredManifest: OpenclawManifest = {
      ...manifest,
      agents: manifest.agents.filter((a) => selectedAgentIds.has(a.id)),
      documents: manifest.documents.filter((d) => selectedDocIds.has(d.id)),
    };

    try {
      const res = await fetch("/api/marketplace/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          priceCents,
          categories: Array.from(selectedCategories),
          tags,
          manifest: filteredManifest,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create pack");
      }

      const pack = await res.json();

      // Auto-submit for review if not draft
      await fetch(`/api/marketplace/packs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_for_review" }),
      });

      router.push("/sell");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Navigation                                                        */
  /* ---------------------------------------------------------------- */

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return !!manifest && (selectedAgentIds.size > 0 || selectedDocIds.size > 0);
      case 1:
        return acknowledged;
      case 2:
        return name.length > 0 && description.length > 0 && selectedCategories.size > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Create Knowledge Pack</h1>
      <p className="mb-8 text-neutral-500">
        Package your workspace content and share it on the marketplace
      </p>

      {/* Progress bar */}
      <div className="mb-10 flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                i <= step
                  ? "bg-violet-600"
                  : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            />
            <p
              className={`mt-1 text-xs ${
                i === step ? "font-medium text-violet-600" : "text-neutral-400"
              }`}
            >
              {s}
            </p>
          </div>
        ))}
      </div>

      {/* ── Step 0: Select Content ── */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Workspace ID
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter workspace ID to export from..."
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
              />
              <Button
                onClick={() => loadWorkspace(workspaceId)}
                disabled={!workspaceId || loadingContent}
              >
                {loadingContent ? "Loading..." : "Load"}
              </Button>
            </div>
            {contentError && (
              <p className="mt-1 text-sm text-red-500">{contentError}</p>
            )}
          </div>

          {manifest && (
            <>
              {/* Agents */}
              {manifest.agents.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">
                    Agents ({selectedAgentIds.size}/{manifest.agents.length})
                  </h3>
                  <div className="space-y-2">
                    {manifest.agents.map((agent) => (
                      <AgentCheckbox
                        key={agent.id}
                        agent={agent}
                        checked={selectedAgentIds.has(agent.id)}
                        onToggle={() => toggleAgent(agent.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {manifest.documents.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">
                    Documents ({selectedDocIds.size}/{manifest.documents.length})
                  </h3>
                  <div className="space-y-2">
                    {manifest.documents.map((doc) => (
                      <DocCheckbox
                        key={doc.id}
                        doc={doc}
                        checked={selectedDocIds.has(doc.id)}
                        onToggle={() => toggleDoc(doc.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Step 1: Privacy Check ── */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Privacy & Sanitization Check</h2>
          <p className="text-sm text-neutral-500">
            We automatically scan your content for sensitive information before
            publishing.
          </p>

          {issues.length === 0 ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950">
              <div className="mb-2 text-3xl">✅</div>
              <p className="font-medium text-green-700 dark:text-green-400">
                No issues found! Your content is clean.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  {issues.length} potential issue{issues.length !== 1 ? "s" : ""}{" "}
                  found
                </p>
              </div>

              {issues.map((issue, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
                        issue.severity === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {issue.type.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{issue.description}</p>
                      <p className="text-xs text-neutral-500">
                        Location: {issue.location}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="rounded"
                />
                I acknowledge these issues and want to proceed. Sensitive content
                will be redacted automatically.
              </label>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Details ── */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Pack Details</h2>

          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Knowledge Pack"
              maxLength={120}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description *
            </label>
            <textarea
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this pack contains and who it's for..."
              maxLength={2000}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Price (USD)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={priceCents / 100}
                onChange={(e) =>
                  setPriceCents(Math.round(parseFloat(e.target.value || "0") * 100))
                }
                placeholder="0.00"
                className="w-32"
              />
              <span className="text-sm text-neutral-500">
                {priceCents === 0 ? "Free" : `$${(priceCents / 100).toFixed(2)}`}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Set to 0 for a free pack. Platform takes 20% of paid packs.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Categories * (select at least one)
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    selectedCategories.has(cat)
                      ? "bg-violet-600 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button variant="outline" onClick={addTag} disabled={!tagInput.trim()}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs dark:bg-neutral-800"
                  >
                    {t}
                    <button
                      onClick={() => removeTag(t)}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ── */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Review & Submit</h2>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h3 className="text-lg font-semibold">{name}</h3>
            <p className="mt-1 text-sm text-neutral-500">{description}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-neutral-400">Price</p>
                <p className="font-medium">
                  {priceCents === 0 ? "Free" : `$${(priceCents / 100).toFixed(2)}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Categories</p>
                <p className="font-medium">
                  {Array.from(selectedCategories).join(", ") || "None"}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Agents included</p>
                <p className="font-medium">{selectedAgentIds.size}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Documents included</p>
                <p className="font-medium">{selectedDocIds.size}</p>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-neutral-400">Tags</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {issues.length > 0 && (
              <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
                {issues.length} sanitization issue{issues.length !== 1 ? "s" : ""}{" "}
                will be auto-redacted before publishing.
              </div>
            )}
          </div>

          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}

          <p className="text-xs text-neutral-400">
            Your pack will be submitted for review. Once approved, it will appear
            on the marketplace.
          </p>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.push("/sell") : setStep(step - 1))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canAdvance()}>
            {submitting ? "Submitting..." : "Submit for Review"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function AgentCheckbox({
  agent,
  checked,
  onToggle,
}: {
  agent: OpenclawAgent;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded"
      />
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: agent.color ?? "#6d28d9" }}
      >
        {agent.name.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-medium">{agent.name}</p>
        <p className="text-xs text-neutral-500">{agent.role}</p>
      </div>
    </label>
  );
}

function DocCheckbox({
  doc,
  checked,
  onToggle,
}: {
  doc: OpenclawDocument;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded"
      />
      <span className="text-lg">📄</span>
      <div>
        <p className="text-sm font-medium">{doc.title}</p>
        <p className="text-xs text-neutral-500">
          {doc.content.length} characters
        </p>
      </div>
    </label>
  );
}
