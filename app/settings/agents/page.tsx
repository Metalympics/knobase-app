"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { ConnectedAgents } from "@/components/settings/connected-agents";
import { AgentPersonaSettings } from "@/components/settings/agent-persona";
import { SettingsSubNav } from "@/components/settings/settings-sub-nav";
import { getActiveWorkspaceId, getOrCreateDefaultWorkspace } from "@/lib/schools/store";

export default function AgentsPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const wsId = getActiveWorkspaceId();
    if (wsId) {
      setWorkspaceId(wsId);
    } else {
      setWorkspaceId(getOrCreateDefaultWorkspace().id);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Sub-navigation */}
      <SettingsSubNav />

      {/* Header */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
            <Bot className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Connected Agents</h1>
            <p className="text-xs text-neutral-500">
              View, manage, and configure agents registered with your workspace
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {workspaceId ? (
          <>
            <ConnectedAgents workspaceId={workspaceId} />

            <div className="mt-8 border-t border-neutral-200 pt-8">
              <h2 className="mb-1 text-sm font-semibold text-neutral-700">AI Persona Settings</h2>
              <p className="mb-4 text-xs text-neutral-500">
                Configure custom personalities, expertise, and instructions for AI agents.
              </p>
              <AgentPersonaSettings />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-purple-500" />
          </div>
        )}

        {/* Quick-start guide */}
        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-medium text-neutral-700">Connect an Agent</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Register an OpenClaw or custom agent with your workspace using the REST API.
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-md bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-600">1. Generate an API key</p>
              <p className="text-[11px] text-neutral-500">
                Go to{" "}
                <button
                  onClick={() => router.push("/settings/api-keys")}
                  className="text-purple-600 hover:underline"
                >
                  Settings → API Keys
                </button>{" "}
                and create a new key.
              </p>
            </div>

            <div className="rounded-md bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-600">2. Register via API</p>
              <pre className="overflow-x-auto rounded bg-neutral-900 px-3 py-2 text-[11px] text-green-400">
{`curl -X POST https://your-app.com/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "knobase_agent_my-agent",
    "name": "claw",
    "type": "openclaw",
    "capabilities": ["mention_response"]
  }'`}
              </pre>
            </div>

            <div className="rounded-md bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-600">3. Send heartbeats</p>
              <p className="mb-2 text-[11px] text-neutral-500">
                Keep your agent online by sending periodic heartbeats.
              </p>
              <pre className="overflow-x-auto rounded bg-neutral-900 px-3 py-2 text-[11px] text-green-400">
{`curl -X POST https://your-app.com/api/v1/agents/heartbeat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "agent_id": "knobase_agent_my-agent" }'`}
              </pre>
            </div>

            <div className="rounded-md bg-neutral-50 p-3">
              <p className="mb-2 text-xs font-medium text-neutral-600">4. Configure webhooks</p>
              <p className="text-[11px] text-neutral-500">
                Set up{" "}
                <button
                  onClick={() => router.push("/settings/webhooks")}
                  className="text-purple-600 hover:underline"
                >
                  webhook endpoints
                </button>{" "}
                to receive notifications when your agent is @mentioned in documents.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
