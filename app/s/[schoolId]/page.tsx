"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  setActiveWorkspaceId,
  getWorkspace,
} from "@/lib/schools/store";
import { listDocuments, createDocument } from "@/lib/documents/store";

export default function WorkspaceHomePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.schoolId as string;

  useEffect(() => {
    const ws = getWorkspace(workspaceId);
    if (!ws) {
      router.replace("/s/default");
      return;
    }

    setActiveWorkspaceId(workspaceId);

    const docs = listDocuments();
    if (docs.length > 0) {
      router.replace(`/s/${workspaceId}/d/${docs[0].id}`);
    } else {
      const doc = createDocument("Untitled");
      router.replace(`/s/${workspaceId}/d/${doc.id}`);
    }
  }, [workspaceId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
    </div>
  );
}
