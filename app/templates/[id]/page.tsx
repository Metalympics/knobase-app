"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { KnowledgePack } from "@/lib/supabase/types";
import type { OpenclawManifest } from "@/lib/marketplace/types";

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [pack, setPack] = useState<KnowledgePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/marketplace/packs/${id}`);
        const data = await res.json();
        setPack(data.pack ?? null);
      } catch {
        console.error("Failed to fetch pack");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleBuy = async () => {
    if (!pack) return;
    setBuying(true);
    try {
      const res = await fetch(`/api/marketplace/packs/${pack.id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/templates/${pack.id}`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Purchase failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setBuying(false);
    }
  };

  const handleFreeImport = () => {
    if (!pack) return;
    router.push(`/import/${pack.id}`);
  };

  function formatPrice(cents: number, currency: string) {
    if (cents === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-4 h-4 w-96 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mb-4 text-5xl">😕</div>
        <h2 className="text-xl font-semibold">Pack not found</h2>
        <p className="mt-1 text-neutral-500">
          This listing may have been removed or is not yet published.
        </p>
        <Button className="mt-6" onClick={() => router.push("/templates")}>
          Browse Marketplace
        </Button>
      </div>
    );
  }

  const manifest = pack.manifest as unknown as OpenclawManifest | null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Back */}
      <button
        onClick={() => router.push("/templates")}
        className="mb-6 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        ← Back to Marketplace
      </button>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{pack.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-neutral-500">
            {pack.rating_count > 0 && (
              <span>⭐ {Number(pack.rating_average).toFixed(1)} ({pack.rating_count})</span>
            )}
            {pack.sales_count > 0 && <span>{pack.sales_count} sales</span>}
          </div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">
            {pack.description}
          </p>
        </div>

        {/* Price card */}
        <div className="w-full rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:w-72 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="mb-1 text-3xl font-bold">
            {formatPrice(pack.price_cents, pack.currency)}
          </p>
          {pack.price_cents > 0 && (
            <p className="mb-4 text-xs text-neutral-500">One-time purchase</p>
          )}

          <ul className="mb-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            {pack.agent_count > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {pack.agent_count} specialized agent{pack.agent_count > 1 ? "s" : ""}
              </li>
            )}
            {pack.document_count > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {pack.document_count} knowledge document{pack.document_count > 1 ? "s" : ""}
              </li>
            )}
            {pack.workflow_count > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {pack.workflow_count} workflow{pack.workflow_count > 1 ? "s" : ""}
              </li>
            )}
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Lifetime updates included
            </li>
          </ul>

          {pack.price_cents > 0 ? (
            <Button onClick={handleBuy} disabled={buying} className="w-full" size="lg">
              {buying ? "Redirecting..." : `Buy Now ${formatPrice(pack.price_cents, pack.currency)}`}
            </Button>
          ) : (
            <Button onClick={handleFreeImport} className="w-full" size="lg">
              Import for Free
            </Button>
          )}
        </div>
      </div>

      {/* Content preview */}
      {manifest && (
        <div className="space-y-8">
          {/* Agents */}
          {manifest.agents && manifest.agents.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Included Agents</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {manifest.agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-start gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                  >
                    <span className="mt-0.5 text-2xl">{agent.avatar ?? "🤖"}</span>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-neutral-500">{agent.role}</p>
                      {agent.expertise && agent.expertise.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {agent.expertise.slice(0, 3).map((e) => (
                            <span
                              key={e}
                              className="rounded bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documents */}
          {manifest.documents && manifest.documents.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Knowledge Documents</h2>
              <ul className="space-y-2">
                {manifest.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <span className="text-neutral-400">📄</span>
                    <span className="font-medium">{doc.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* README */}
          {pack.readme && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">About</h2>
              <div className="prose prose-neutral max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{pack.readme}</p>
              </div>
            </section>
          )}

          {/* Categories & Tags */}
          {(pack.categories.length > 0 || pack.tags.length > 0) && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Categories & Tags</h2>
              <div className="flex flex-wrap gap-2">
                {pack.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                  >
                    {c}
                  </span>
                ))}
                {pack.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
