"use client";

// ── Contextual Document Route ──
// /w/[workspaceId]/d/[id] — Opens document within workspace context (full sidebar).
// Sets active workspace and loads the knowledge editor for the document.

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocument } from "@/lib/documents/store";
import {
  setActiveWorkspaceId,
  getWorkspace,
} from "@/lib/workspaces/store";
import { transferDemoToLocalAccount, hasDemoState } from "@/lib/demo/state";
import Link from "next/link";

type PageStatus = "loading" | "ready" | "not-found" | "wrong-workspace";

export default function ContextualDocumentPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" /></div>}>
      <ContextualDocumentContent />
    </Suspense>
  );
}

function ContextualDocumentContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceId as string;
  const docId = params.id as string;
  const fromDemo = searchParams.get("from_demo") === "1";

  const [status, setStatus] = useState<PageStatus>("loading");

  useEffect(() => {
    // Handle demo-to-account transfer
    if (fromDemo && hasDemoState()) {
      const transferredId = transferDemoToLocalAccount();
      if (transferredId) {
        router.replace(`/w/${workspaceId}/d/${transferredId}`);
        return;
      }
    }

    // Validate workspace exists
    const ws = getWorkspace(workspaceId);
    if (!ws) {
      // Try universal URL instead
      router.replace(`/d/${docId}`);
      return;
    }

    // Validate document exists
    const doc = getDocument(docId);
    if (!doc) {
      setStatus("not-found");
      return;
    }

    // Set the active workspace and redirect to knowledge page with doc selected
    setActiveWorkspaceId(workspaceId);

    // Store selected doc ID so the knowledge page opens it
    if (typeof window !== "undefined") {
      localStorage.setItem("knobase-app:selected-doc", docId);
    }
    router.replace("/knowledge");
  }, [workspaceId, docId, fromDemo, router]);

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
          This document doesn&apos;t exist in this workspace. It may have been
          moved or deleted.
        </p>
        <div className="flex gap-2">
          <Link href={`/w/${workspaceId}`}>
            <Button variant="outline" size="sm">
              Go to workspace
            </Button>
          </Link>
          <Link href="/knowledge">
            <Button
              size="sm"
              className="bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Dashboard
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
