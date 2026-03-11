"use client";

import { useState, useEffect } from "react";
import { Key } from "lucide-react";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { SettingsSubNav } from "@/components/settings/settings-sub-nav";
import {
  getActiveWorkspaceId,
  getOrCreateDefaultWorkspace,
} from "@/lib/schools/store";

export default function ApiKeysPage() {
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <Key className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              API Keys
            </h1>
            <p className="text-xs text-neutral-500">
              Generate and manage API keys for agent and programmatic access
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {workspaceId ? (
          <ApiKeysManager workspaceId={workspaceId} />
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-purple-500" />
          </div>
        )}

        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-medium text-neutral-700">
            Using API Keys
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Include your API key in the{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-purple-600">
              Authorization
            </code>{" "}
            header.
          </p>

          <div className="mt-4 rounded-md bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">
              Authentication Header
            </p>
            <pre className="overflow-x-auto rounded bg-neutral-900 px-3 py-2 text-[11px] text-green-400">
              {`Authorization: Bearer knb_live_your_api_key_here`}
            </pre>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-neutral-600">
              Available Endpoints
            </p>
            <div className="space-y-1.5 text-xs">
              {[
                { method: "GET", path: "/api/v1/health", desc: "Health check" },
                { method: "POST", path: "/api/v1/agents/register", desc: "Register agent" },
                { method: "POST", path: "/api/v1/agents/heartbeat", desc: "Agent heartbeat" },
                { method: "POST", path: "/api/v1/agents/webhook", desc: "Agent communication" },
                { method: "GET", path: "/api/files", desc: "List workspace files" },
                { method: "POST", path: "/api/files", desc: "Upload file (multipart)" },
                { method: "GET", path: "/api/files/:id", desc: "Get file details" },
                { method: "PATCH", path: "/api/files/:id", desc: "Update file metadata" },
                { method: "DELETE", path: "/api/files/:id", desc: "Delete file" },
                { method: "DELETE", path: "/api/files", desc: "Bulk delete files" },
                { method: "GET", path: "/api/v1/documents", desc: "List documents" },
                { method: "GET", path: "/api/v1/search", desc: "Search workspace" },
                { method: "GET", path: "/api/v1/webhooks", desc: "List webhooks" },
                { method: "POST", path: "/api/v1/webhooks", desc: "Create webhook" },
              ].map((ep) => (
                <div
                  key={`${ep.method}-${ep.path}`}
                  className="flex items-center gap-3 rounded-md bg-neutral-50 px-3 py-1.5"
                >
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      ep.method === "GET"
                        ? "bg-emerald-100 text-emerald-700"
                        : ep.method === "POST"
                          ? "bg-blue-100 text-blue-700"
                          : ep.method === "PATCH"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <code className="text-neutral-700">{ep.path}</code>
                  <span className="ml-auto text-neutral-400">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">
              Security Notes
            </p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-amber-700">
              <li>
                • API keys are hashed with SHA-256 — the full key is shown only
                once on creation
              </li>
              <li>• Keys can be revoked instantly from this page</li>
              <li>
                • Rate limits: Free (100/min), Pro (1,000/min), Enterprise
                (10,000/min)
              </li>
              <li>• Set expiration dates for time-limited access</li>
              <li>• All requests are logged with key ID and timestamp</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
