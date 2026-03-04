"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces/store";
import { listDocuments, createDocument } from "@/lib/documents/store";

export default function KnowledgePage() {
  const router = useRouter();

  useEffect(() => {
    const workspaceName =
      typeof window !== "undefined"
        ? localStorage.getItem("knobase-app:workspace")
        : null;

    if (!workspaceName) {
      router.replace("/onboarding");
      return;
    }

    const ws = getOrCreateDefaultWorkspace();
    const docs = listDocuments();

    if (docs.length > 0) {
      router.replace(`/w/${ws.id}/d/${docs[0].id}`);
    } else {
      const doc = createDocument("Untitled");
      router.replace(`/w/${ws.id}/d/${doc.id}`);
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
    </div>
  );
}
