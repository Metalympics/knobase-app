"use client";

// ── Workspace Home ──
// /w/[workspaceId] — Shows workspace document list.
// Redirects to /knowledge with the workspace set as active.

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setActiveWorkspaceId, getWorkspace } from "@/lib/workspaces/store";

export default function WorkspaceHomePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  useEffect(() => {
    // Set the active workspace and redirect to the main knowledge page
    const ws = getWorkspace(workspaceId);
    if (ws) {
      setActiveWorkspaceId(workspaceId);
      router.replace("/knowledge");
    } else {
      // Unknown workspace — go to workspace list
      router.replace("/workspaces");
    }
  }, [workspaceId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
    </div>
  );
}
