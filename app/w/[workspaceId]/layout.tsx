"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/editor/sidebar";
import { useDocuments } from "@/lib/documents/use-documents";
import {
  getWorkspace,
  setActiveWorkspaceId,
  getOrCreateDefaultWorkspace,
} from "@/lib/workspaces/store";
import { canCreateDocument } from "@/lib/subscription/store";
import { TemplatePicker } from "@/components/templates/template-picker";
import type { Template } from "@/lib/templates/defaults";
import type { Workspace } from "@/lib/workspaces/types";
import { Crown } from "lucide-react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const {
    documents,
    activeId,
    addDocument,
    saveContent,
    removeDocument,
  } = useDocuments();

  useEffect(() => {
    const ws = getWorkspace(workspaceId);
    if (ws) {
      setActiveWorkspaceId(workspaceId);
      setWorkspace(ws);
      setMounted(true);
    } else {
      const defaultWs = getOrCreateDefaultWorkspace();
      router.replace(`/w/${defaultWs.id}`);
    }
  }, [workspaceId, router]);

  const handleSelect = useCallback(
    (docId: string) => {
      router.push(`/w/${workspaceId}/d/${docId}`);
    },
    [router, workspaceId],
  );

  const handleAddDocument = useCallback(() => {
    if (workspace && !canCreateDocument(workspace.id)) {
      setShowUpgradePrompt(true);
      return;
    }
    setShowTemplatePicker(true);
  }, [workspace]);

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      const doc = addDocument(template.name);
      if (doc) {
        saveContent(doc.id, template.defaultContent);
        router.push(`/w/${workspaceId}/d/${doc.id}`);
      }
      setShowTemplatePicker(false);
    },
    [addDocument, saveContent, router, workspaceId],
  );

  const handleBlankDocument = useCallback(() => {
    const doc = addDocument();
    if (doc) {
      router.push(`/w/${workspaceId}/d/${doc.id}`);
    }
    setShowTemplatePicker(false);
  }, [addDocument, router, workspaceId]);

  const handleDelete = useCallback(
    (id: string) => {
      removeDocument(id);
      const remaining = documents.filter((d) => d.id !== id);
      if (remaining.length > 0) {
        router.replace(`/w/${workspaceId}/d/${remaining[0].id}`);
      }
    },
    [removeDocument, documents, router, workspaceId],
  );

  const handleNavigateToTask = useCallback(
    (documentId: string) => {
      router.push(`/w/${workspaceId}/d/${documentId}`);
    },
    [router, workspaceId],
  );

  if (!mounted || !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  const docIdFromUrl = (params as Record<string, string>).id ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        workspaceName={workspace.name}
        documents={documents}
        activeId={docIdFromUrl ?? activeId}
        onSelect={handleSelect}
        onAdd={handleAddDocument}
        onDelete={handleDelete}
        workspace={workspace}
        onWorkspaceSwitch={(ws) => {
          setWorkspace(ws);
          setActiveWorkspaceId(ws.id);
          router.push(`/w/${ws.id}`);
        }}
      />

      {children}

      {showTemplatePicker && (
        <TemplatePicker
          onSelect={handleTemplateSelect}
          onBlank={handleBlankDocument}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {showUpgradePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Crown className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                50 document limit reached
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                The Free plan allows up to 50 documents. Upgrade to Pro for
                $12/mo to get unlimited documents and up to 5 AI agents.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUpgradePrompt(false);
                  router.push("/pricing");
                }}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
