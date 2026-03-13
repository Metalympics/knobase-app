"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plug } from "lucide-react";
import { OpenClawIntegration } from "@/components/settings/openclaw-integration";
import {
  getActiveWorkspaceId,
  getOrCreateDefaultWorkspace,
} from "@/lib/schools/store";

export default function OpenClawIntegrationPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const wsId = getActiveWorkspaceId();
    setWorkspaceId(wsId ?? getOrCreateDefaultWorkspace().id);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <Link
            href="/settings"
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
            <Plug className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              OpenClaw Integration
            </h1>
            <p className="text-xs text-neutral-500">
              Connect the OpenClaw CLI and manage agent API keys for your workspace
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <OpenClawIntegration workspaceId={workspaceId} />
      </div>
    </div>
  );
}
