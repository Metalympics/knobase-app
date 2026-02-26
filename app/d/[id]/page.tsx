"use client";

// ── Universal Document Route ──
// /d/[id] — Shareable link that resolves to the document regardless of workspace.
// Resolves from Supabase first, falls back to localStorage for offline/demo docs.

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { getDocument as getLocalDocument } from "@/lib/documents/store";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId } from "@/lib/workspaces/store";
import { transferDemoToLocalAccount, hasDemoState } from "@/lib/demo/state";
import type { Document } from "@/lib/documents/types";
import Link from "next/link";

type DocStatus = "loading" | "found" | "not-found" | "no-access";

export default function UniversalDocumentPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" /></div>}>
      <UniversalDocumentContent />
    </Suspense>
  );
}

function UniversalDocumentContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = params.id as string;
  const fromDemo = searchParams.get("from_demo") === "1";

  const [status, setStatus] = useState<DocStatus>("loading");
  const [doc, setDoc] = useState<Document | null>(null);

  useEffect(() => {
    // Handle demo-to-account transfer on first auth redirect
    if (fromDemo && hasDemoState()) {
      const transferredId = transferDemoToLocalAccount();
      if (transferredId) {
        router.replace(`/d/${transferredId}`);
        return;
      }
    }

    // Resolve the document — Supabase first, then localStorage fallback
    async function resolveDocument() {
      // 1. Try Supabase
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("documents")
          .select("id, title, content, created_at, updated_at, visibility")
          .eq("id", docId)
          .single();

        if (!error && data) {
          const resolved: Document = {
            id: data.id,
            title: data.title ?? "Untitled",
            content: data.content ?? "",
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          setDoc(resolved);
          setStatus("found");

          // If user has a workspace, redirect to contextual URL
          const wsId = getActiveWorkspaceId();
          if (wsId) {
            router.replace(`/w/${wsId}/d/${docId}`);
          }
          return;
        }
      } catch {
        // Supabase unavailable — fall through to localStorage
      }

      // 2. Try localStorage
      const localDoc = getLocalDocument(docId);
      if (localDoc) {
        setDoc(localDoc);
        setStatus("found");
        const wsId = getActiveWorkspaceId();
        if (wsId) {
          router.replace(`/w/${wsId}/d/${docId}`);
        }
      } else {
        setStatus("not-found");
      }
    }

    resolveDocument();
  }, [docId, fromDemo, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
          <BookOpen className="h-6 w-6 text-neutral-400" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Document not found
        </h1>
        <p className="max-w-sm text-center text-sm text-neutral-500">
          This document may have been deleted or you may not have access. Check
          the URL or ask the owner to share it with you.
        </p>
        <div className="flex gap-2">
          <Link href="/demo">
            <Button variant="outline" size="sm">
              Try the demo
            </Button>
          </Link>
          <Link href="/knowledge">
            <Button size="sm" className="bg-neutral-900 text-white hover:bg-neutral-800">
              Go to dashboard
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Minimal render for universal URL (without workspace sidebar)
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white">
            <BookOpen className="h-4 w-4 text-neutral-700" />
          </div>
          <span className="text-sm font-medium text-neutral-900">
            {doc?.title || "Untitled"}
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            Shared
          </span>
        </div>
        <Link href="/knowledge">
          <Button variant="ghost" size="sm" className="text-neutral-600">
            Open in workspace
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {doc && (
          <TiptapEditor
            initialContent={doc.content}
            documentId={doc.id}
            documentTitle={doc.title}
          />
        )}
      </main>
    </div>
  );
}
