"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { BookOpen, ArrowRight, Loader2, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { getDocument as getLocalDocument } from "@/lib/documents/store";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspaceId } from "@/lib/schools/store";
import { checkDocumentAccess, acceptInvite } from "@/lib/documents/shared";
import type { Document } from "@/lib/documents/types";
import Link from "next/link";

type DocStatus = "loading" | "found" | "not-found" | "unauthorized" | "checking-access";

export default function UniversalDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      }
    >
      <UniversalDocumentContent />
    </Suspense>
  );
}

function UniversalDocumentContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = params.id as string;
  const inviteToken = searchParams.get("invite");
  
  const [status, setStatus] = useState<DocStatus>("loading");
  const [doc, setDoc] = useState<Document | null>(null);
  const [workspaceLink, setWorkspaceLink] = useState<string | null>(null);
  const [userWorkspaceId, setUserWorkspaceId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Check authentication and handle invites
  useEffect(() => {
    async function checkAuthAndAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      setIsAuthenticated(!!user);
      
      // If there's an invite token, try to accept it
      if (inviteToken && user) {
        setStatus("checking-access");
        const result = await acceptInvite(inviteToken);
        
        if (result.success) {
          // Remove invite param from URL after successful acceptance
          const newUrl = `/d/${docId}`;
          router.replace(newUrl);
        } else {
          setInviteError(result.error || "Failed to accept invite");
        }
      }
    }
    
    checkAuthAndAccess();
  }, [inviteToken, docId, router]);

  // Load document and check access
  useEffect(() => {
    async function resolveDocument() {
      try {
        const supabase = createClient();
        
        // Check document access first
        const access = await checkDocumentAccess(docId);
        
        if (!access.hasAccess) {
          setStatus("unauthorized");
          return;
        }
        
        // Store user's workspace for the "Open in workspace" link
        if (access.workspaceId) {
          setUserWorkspaceId(access.workspaceId);
        }
        
        // Fetch document data
        const { data, error } = await supabase
          .from("pages")
          .select("id, title, content_md, created_at, updated_at, visibility, school_id")
          .eq("id", docId)
          .maybeSingle();

        if (error || !data) {
          console.error("Error loading document:", error);
          setStatus("not-found");
          return;
        }

        setDoc({
          id: data.id,
          title: data.title ?? "Untitled",
          content: data.content_md ?? "",
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
        
        // Determine workspace link
        // If user is member of this doc's workspace, link there
        // Otherwise link to their current active workspace
        const activeWsId = getActiveWorkspaceId();
        if (activeWsId) {
          setWorkspaceLink(`/s/${activeWsId}/d/${docId}`);
        } else if (data.school_id === userWorkspaceId) {
          setWorkspaceLink(`/s/${data.school_id}/d/${docId}`);
        }
        
        setStatus("found");
      } catch (error) {
        console.error("Error resolving document:", error);
        
        // Fallback to local storage for demo/offline mode
        const localDoc = getLocalDocument(docId);
        if (localDoc) {
          setDoc(localDoc);
          setStatus("found");
          const wsId = getActiveWorkspaceId();
          if (wsId) setWorkspaceLink(`/s/${wsId}/d/${docId}`);
        } else {
          setStatus("not-found");
        }
      }
    }

    resolveDocument();
  }, [docId, userWorkspaceId]);

  // Loading state
  if (status === "loading" || status === "checking-access") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Unauthorized state
  if (status === "unauthorized") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
          <Lock className="h-6 w-6 text-neutral-400" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Access required
        </h1>
        <p className="max-w-sm text-center text-sm text-neutral-500">
          {inviteError || "You don't have access to this document. Ask the owner to share it with you or check your invite link."}
        </p>
        <div className="flex gap-2">
          {!isAuthenticated && (
            <Link href={`/auth/login?redirect=/d/${docId}`}>
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          )}
          <Link href="/workspaces">
            <Button
              size="sm"
              className="bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Go to workspaces
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not found state
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
          <Link href="/workspaces">
            <Button
              size="sm"
              className="bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Go to workspaces
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Simplified header for shared document view */}
      <header className="document-header sticky top-0 z-50 flex h-12 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-sm">
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
        
        <div className="flex items-center gap-2">
          {!isAuthenticated && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertCircle className="h-3.5 w-3.5" />
              View-only mode
            </span>
          )}
          {workspaceLink ? (
            <Link href={workspaceLink}>
              <Button variant="ghost" size="sm" className="text-neutral-600">
                Open in workspace
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <Link href="/workspaces">
              <Button variant="ghost" size="sm" className="text-neutral-600">
                Go to workspaces
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Document content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {doc && (
          <TiptapEditor
            initialContent={doc.content}
            documentId={doc.id}
            documentTitle={doc.title}
            readOnly={!isAuthenticated}
          />
        )}
      </main>
    </div>
  );
}
