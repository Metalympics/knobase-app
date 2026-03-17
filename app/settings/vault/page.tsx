"use client";

import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { VaultManager } from "@/components/settings/vault-manager";
import { SettingsSubNav } from "@/components/settings/settings-sub-nav";
import {
  getActiveWorkspaceId,
  getOrCreateDefaultWorkspace,
} from "@/lib/schools/store";

export default function VaultPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const wsId = getActiveWorkspaceId();
    setWorkspaceId(wsId ?? getOrCreateDefaultWorkspace().id);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <SettingsSubNav />

      <div className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              API Key Vault
            </h1>
            <p className="text-xs text-neutral-500">
              Securely store third-party API keys for agents to retrieve on demand
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {workspaceId ? (
          <VaultManager workspaceId={workspaceId} />
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-purple-500" />
          </div>
        )}

        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-medium text-neutral-700">
            How It Works
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            The vault encrypts API keys with AES-256-GCM using a workspace-specific
            derived key. Agents access keys via MCP tools without ever seeing
            the raw vault.
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-600">
                Agent Lists Available APIs
              </p>
              <pre className="overflow-x-auto rounded bg-neutral-900 px-3 py-2 text-[11px] text-green-400">
                {`MCP tool: knobase_list_apis\n→ Returns env_name + description (no secrets)`}
              </pre>
            </div>

            <div className="rounded-md bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-600">
                Agent Retrieves a Key
              </p>
              <pre className="overflow-x-auto rounded bg-neutral-900 px-3 py-2 text-[11px] text-green-400">
                {`MCP tool: knobase_get_api_key\nParameter: env_name="OPENAI_API_KEY"\n→ Returns decrypted value (logged for audit)`}
              </pre>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">
              Security
            </p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-amber-700">
              <li>
                • Keys are encrypted at rest with AES-256-GCM
              </li>
              <li>
                • Each workspace has a unique derived encryption key
              </li>
              <li>
                • Every key access is logged with agent ID, timestamp, and IP
              </li>
              <li>
                • Raw values are never stored — only encrypted blobs
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
