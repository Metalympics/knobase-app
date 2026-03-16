"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/editor/sidebar";
import { useDocuments } from "@/lib/documents/use-documents";
import {
  getWorkspace,
  setActiveWorkspaceId,
  getLastActiveSchoolId,
  getFirstUserWorkspace,
  cacheSchool,
  loadSchool,
} from "@/lib/schools/store";
import { canCreateDocument } from "@/lib/subscription/store";
import { TemplatePicker } from "@/components/templates/template-picker";
import type { Template } from "@/lib/templates/defaults";
import type { Workspace } from "@/lib/schools/types";
import { Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspacePageSync } from "@/lib/sync/remote-page-sync";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.schoolId as string;

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
    addSubPage,
    moveDoc,
    refresh: refreshDocuments,
  } = useDocuments();

  // Sync pages created/deleted by MCP agents on other devices
  useWorkspacePageSync(workspaceId, {
    onPageCreated: useCallback(() => {
      refreshDocuments();
    }, [refreshDocuments]),
    onPageDeleted: useCallback(() => {
      refreshDocuments();
    }, [refreshDocuments]),
  });

  useEffect(() => {
    async function initWorkspace() {
      // "default" is a placeholder — resolve to the user's real workspace
      if (workspaceId === "default") {
        const lastActive = await getLastActiveSchoolId();
        const target = lastActive ?? (await getFirstUserWorkspace());
        if (target) {
          router.replace(`/s/${target}`);
        } else {
          router.replace("/onboarding");
        }
        return;
      }

      // Try localStorage cache first, then fall back to Supabase
      let ws = getWorkspace(workspaceId);
      if (!ws) {
        const school = await loadSchool(workspaceId);
        if (!school) {
          const target = await getFirstUserWorkspace();
          if (target) {
            router.replace(`/s/${target}`);
          } else {
            router.replace("/onboarding");
          }
          return;
        }
        cacheSchool(school);
        ws = school;
      }

      setActiveWorkspaceId(workspaceId);
      setWorkspace(ws);
      setMounted(true);
    }
    initWorkspace();
  }, [workspaceId, router]);

  const handleSelect = useCallback(
    (docId: string) => {
      router.push(`/s/${workspaceId}/d/${docId}`);
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
        router.push(`/s/${workspaceId}/d/${doc.id}`);
      }
      setShowTemplatePicker(false);
    },
    [addDocument, saveContent, router, workspaceId],
  );

  const handleBlankDocument = useCallback(() => {
    const doc = addDocument();
    if (doc) {
      router.push(`/s/${workspaceId}/d/${doc.id}`);
    }
    setShowTemplatePicker(false);
  }, [addDocument, router, workspaceId]);

  const handleDelete = useCallback(
    (id: string) => {
      removeDocument(id);
      const remaining = documents.filter((d) => d.id !== id);
      if (remaining.length > 0) {
        router.replace(`/s/${workspaceId}/d/${remaining[0].id}`);
      }
    },
    [removeDocument, documents, router, workspaceId],
  );

  const handleAddSubPage = useCallback(
    (parentId: string) => {
      if (workspace && !canCreateDocument(workspace.id)) {
        setShowUpgradePrompt(true);
        return;
      }
      const doc = addSubPage(parentId);
      if (doc) {
        router.push(`/s/${workspaceId}/d/${doc.id}`);
      }
    },
    [addSubPage, workspace, router, workspaceId],
  );

  const handleMoveDocument = useCallback(
    (id: string, newParentId: string | null) => {
      moveDoc(id, newParentId);
    },
    [moveDoc],
  );

  const handleNavigateToTask = useCallback(
    (documentId: string) => {
      router.push(`/s/${workspaceId}/d/${documentId}`);
    },
    [router, workspaceId],
  );

  // Track online users via Supabase Realtime presence channel
  const [presenceUsers, setPresenceUsers] = useState<{ id: string; name: string; color: string; isAgent?: boolean }[]>([]);
  useEffect(() => {
    if (!workspace) return;
    const supabase = createClient();
    const channel = supabase.channel(`workspace:${workspace.id}`, {
      config: { presence: { key: "user" } },
    });

    const COLORS = ["#7C3AED", "#2563EB", "#10B981", "#F59E0B", "#EF4444", "#3B82F6"];

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({
          id: authUser.id,
          name: authUser.user_metadata?.full_name ?? authUser.email?.split("@")[0] ?? "User",
          color: COLORS[Math.abs(authUser.id.charCodeAt(0)) % COLORS.length],
          online_at: new Date().toISOString(),
        });
      });
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const users = Object.values(state).flat().map((p: any) => ({
        id: p.id,
        name: p.name ?? "User",
        color: p.color ?? "#7C3AED",
        isAgent: p.isAgent ?? false,
      }));
      const unique = Array.from(new Map(users.map(u => [u.id, u])).values());
      setPresenceUsers(unique);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id]);

  // Fetch workspace agents from public.users so they always show in the sidebar
  const AGENT_COLORS = ["#E94560", "#8B5CF6", "#2563EB", "#10B981", "#F59E0B", "#3B82F6"];
  const [workspaceAgents, setWorkspaceAgents] = useState<{ id: string; name: string; color: string; isAgent: boolean }[]>([]);
  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("users")
      .select("id, name, display_name, avatar_url")
      .eq("type", "agent")
      .eq("school_id", workspace.id)
      .eq("is_deleted", false)
      .eq("is_suspended", false)
      .order("name", { ascending: true })
      .limit(30)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setWorkspaceAgents(
          data.map((a, i) => ({
            id: a.id,
            name: a.display_name ?? a.name ?? "Agent",
            color: AGENT_COLORS[i % AGENT_COLORS.length],
            isAgent: true,
          })),
        );
      });

    return () => { cancelled = true; };
  }, [workspace?.id]);

  // Merge real-time presence with workspace agents (deduplicate by id)
  const onlineUsers = (() => {
    const map = new Map<string, { id: string; name: string; color: string; isAgent?: boolean }>();
    for (const u of presenceUsers) map.set(u.id, u);
    for (const a of workspaceAgents) if (!map.has(a.id)) map.set(a.id, a);
    return Array.from(map.values());
  })();

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
        onAddSubPage={handleAddSubPage}
        onMoveDocument={handleMoveDocument}
        workspace={workspace}
        onWorkspaceSwitch={(ws) => {
          setWorkspace(ws);
          setActiveWorkspaceId(ws.id);
          router.push(`/s/${ws.id}`);
        }}
        onlineUsers={onlineUsers}
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
