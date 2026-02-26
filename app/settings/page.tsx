"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plug,
  Key,
  Upload,
  Download,
  Store,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  CreditCard,
  Crown,
  Zap,
  Building2,
  ExternalLink,
  Bot,
  Webhook,
  Server,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { OpenClawImport } from "@/components/settings/openclaw-import";
import { OpenClawExport } from "@/components/settings/openclaw-export";
import { AgentList } from "@/components/marketplace/agent-list";
import { AgentPersonaSettings } from "@/components/settings/agent-persona";
import WebhooksSettings from "@/components/settings/webhooks";
import { MCPConfig } from "@/components/settings/mcp-config";
import { CredentialsManager } from "@/components/settings/credentials-manager";
import { AgentAnalyticsDashboard } from "@/components/settings/agent-analytics";
import { ConnectedAgents } from "@/components/settings/connected-agents";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { openClawBridge, type OpenClawConnectionStatus } from "@/lib/sync/openclaw-bridge";
import { getSubscription, getUsage, refreshUsage, updateSubscriptionTier, cancelSubscription } from "@/lib/subscription/store";
import { PLANS } from "@/lib/subscription/plans";
import { getActiveWorkspaceId, getOrCreateDefaultWorkspace } from "@/lib/workspaces/store";
import type { PlanTier, Subscription, UsageRecord } from "@/lib/subscription/types";

type Tab = "integration" | "import" | "export" | "marketplace" | "apikeys" | "subscription" | "agents" | "analytics" | "webhooks" | "mcp" | "credentials";

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white" />
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-2xl">
          <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
          <div className="mt-4 h-4 w-96 animate-pulse rounded bg-neutral-200" />
        </div>
      </main>
    </div>
  );
}

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "integration";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [endpoint, setEndpoint] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("knobase-app:openclaw-endpoint") : null) ?? "http://localhost:3000/api/mcp"
  );
  const [apiKey, setApiKey] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("knobase-app:openclaw-apikey") : null) ?? ""
  );
  const [mcpApiKey, setMcpApiKey] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("knobase-app:mcp-api-key") : null) ?? ""
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [showMcpKey, setShowMcpKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<OpenClawConnectionStatus>(
    () => openClawBridge.connectionStatus
  );
  const [testing, setTesting] = useState(false);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const wsId = getActiveWorkspaceId();
    if (wsId) {
      setWorkspaceId(wsId);
      setSubscription(getSubscription(wsId));
      setUsage(refreshUsage(wsId));
    } else {
      const ws = getOrCreateDefaultWorkspace();
      setWorkspaceId(ws.id);
      setSubscription(getSubscription(ws.id));
      setUsage(refreshUsage(ws.id));
    }
  }, []);

  useEffect(() => {
    const unsub = openClawBridge.onStatusChange(setConnectionStatus);
    return unsub;
  }, []);

  const handleSaveConnection = useCallback(() => {
    localStorage.setItem("knobase-app:openclaw-endpoint", endpoint);
    localStorage.setItem("knobase-app:openclaw-apikey", apiKey);
    openClawBridge.configure(endpoint, apiKey);
  }, [endpoint, apiKey]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    handleSaveConnection();
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "test",
          method: "ping",
        }),
      });
      if (res.ok) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
    setTesting(false);
  }, [endpoint, apiKey, handleSaveConnection]);

  const handleConnect = useCallback(() => {
    handleSaveConnection();
    openClawBridge.connect();
  }, [handleSaveConnection]);

  const handleDisconnect = useCallback(() => {
    openClawBridge.disconnect();
  }, []);

  const handleSaveMcpKey = useCallback(() => {
    localStorage.setItem("knobase-app:mcp-api-key", mcpApiKey);
  }, [mcpApiKey]);

  const handleGenerateKey = useCallback(() => {
    const key = `kb_${crypto.randomUUID().replace(/-/g, "")}`;
    setMcpApiKey(key);
    localStorage.setItem("knobase-app:mcp-api-key", key);
  }, []);

  const handleCopyKey = useCallback(() => {
    navigator.clipboard.writeText(mcpApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }, [mcpApiKey]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "subscription", label: "Subscription", icon: <CreditCard className="h-4 w-4" /> },
    { id: "agents", label: "Agents", icon: <Bot className="h-4 w-4" /> },
    { id: "analytics", label: "Agent Analytics", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "integration", label: "Integration", icon: <Plug className="h-4 w-4" /> },
    { id: "webhooks", label: "Webhooks", icon: <Webhook className="h-4 w-4" /> },
    { id: "mcp", label: "MCP Server", icon: <Server className="h-4 w-4" /> },
    { id: "import", label: "Import", icon: <Upload className="h-4 w-4" /> },
    { id: "export", label: "Export", icon: <Download className="h-4 w-4" /> },
    { id: "marketplace", label: "Marketplace", icon: <Store className="h-4 w-4" /> },
    { id: "apikeys", label: "API Keys", icon: <Key className="h-4 w-4" /> },
    { id: "credentials", label: "Credentials", icon: <Shield className="h-4 w-4" /> },
  ];

  const statusColor = {
    connected: "bg-emerald-400",
    connecting: "bg-amber-400",
    disconnected: "bg-neutral-300",
  }[connectionStatus];

  const statusLabel = {
    connected: "Connected",
    connecting: "Connecting...",
    disconnected: "Disconnected",
  }[connectionStatus];

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-4">
          <button
            onClick={() => router.push("/knowledge")}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold text-neutral-900">Settings</h1>
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-purple-50 font-medium text-purple-700"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span className="text-xs text-neutral-500">
              OpenClaw: {statusLabel}
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-8">
          <AnimatePresence mode="wait">
            {activeTab === "subscription" && subscription && (
              <motion.div
                key="subscription"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Subscription & Billing
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Manage your plan, view usage, and update billing details.
                  </p>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white">
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      {subscription.tier === "free" && <Zap className="h-4 w-4 text-neutral-500" />}
                      {subscription.tier === "pro" && <Crown className="h-4 w-4 text-purple-500" />}
                      {subscription.tier === "enterprise" && <Building2 className="h-4 w-4 text-amber-500" />}
                      <span className="text-sm font-medium text-neutral-800">
                        {PLANS[subscription.tier].name} Plan
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      subscription.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : subscription.status === "past_due"
                          ? "bg-red-100 text-red-700"
                          : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {subscription.status === "active" ? "Active" : subscription.status === "past_due" ? "Past Due" : subscription.status}
                    </span>
                  </div>

                  <div className="space-y-4 px-4 py-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-neutral-900">
                        {PLANS[subscription.tier].priceMonthly === 0
                          ? "Free"
                          : `$${PLANS[subscription.tier].priceMonthly}`}
                      </span>
                      {PLANS[subscription.tier].priceMonthly > 0 && (
                        <span className="text-sm text-neutral-500">/month</span>
                      )}
                    </div>

                    {subscription.cancelAtPeriodEnd && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-700">
                          Your plan will be downgraded to Free at the end of your billing period on{" "}
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                        </p>
                      </div>
                    )}

                    {usage && (
                      <div className="space-y-3 rounded-md bg-neutral-50 p-3">
                        <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Usage</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-lg font-semibold text-neutral-900">{usage.documentCount}</p>
                            <p className="text-[11px] text-neutral-500">
                              Documents
                              {PLANS[subscription.tier].limits.maxDocuments !== Infinity
                                ? ` / ${PLANS[subscription.tier].limits.maxDocuments}`
                                : ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-neutral-900">{usage.agentCount}</p>
                            <p className="text-[11px] text-neutral-500">
                              Agents
                              {PLANS[subscription.tier].limits.maxAgents !== Infinity
                                ? ` / ${PLANS[subscription.tier].limits.maxAgents}`
                                : ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-neutral-900">{usage.aiRequestsThisMonth}</p>
                            <p className="text-[11px] text-neutral-500">
                              AI Requests
                              {PLANS[subscription.tier].limits.aiRequestsPerMonth !== Infinity
                                ? ` / ${PLANS[subscription.tier].limits.aiRequestsPerMonth.toLocaleString()}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 border-t border-neutral-100 px-4 py-3">
                    <button
                      onClick={() => router.push("/pricing")}
                      className="flex items-center gap-1.5 rounded-md bg-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {subscription.tier === "free" ? "Upgrade Plan" : "Change Plan"}
                    </button>
                    {subscription.tier !== "free" && !subscription.cancelAtPeriodEnd && (
                      <button
                        onClick={() => {
                          if (workspaceId) {
                            cancelSubscription(workspaceId);
                            setSubscription(getSubscription(workspaceId));
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        Cancel Subscription
                      </button>
                    )}
                    {subscription.stripeCustomerId && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/stripe/portal", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                customerId: subscription.stripeCustomerId,
                                returnUrl: window.location.href,
                              }),
                            });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                          } catch {
                            // Portal not available
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Manage Billing
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
                  <h3 className="text-sm font-medium text-neutral-800">Plan Features</h3>
                  <ul className="mt-3 space-y-2">
                    {PLANS[subscription.tier].features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-neutral-600">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === "integration" && (
              <motion.div
                key="integration"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    OpenClaw Integration
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Connect your Knobase workspace to OpenClaw for bidirectional sync.
                  </p>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white">
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-neutral-800">
                        Connection Status
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                      <span className="text-xs font-medium text-neutral-600">
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 px-4 py-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        MCP Endpoint
                      </label>
                      <input
                        type="url"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        placeholder="http://localhost:3000/api/mcp"
                        className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                        API Key (Optional)
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Bearer token for authentication"
                          className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 pr-9 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-600"
                        >
                          {showApiKey ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-neutral-100 px-4 py-3">
                    <button
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
                      Test
                    </button>
                    {connectionStatus === "connected" ? (
                      <button
                        onClick={handleDisconnect}
                        className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <WifiOff className="h-3.5 w-3.5" />
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={handleConnect}
                        className="flex items-center gap-1.5 rounded-md bg-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600"
                      >
                        <Wifi className="h-3.5 w-3.5" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "import" && (
              <motion.div
                key="import"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Import OpenClaw Config
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Import agents and settings from an .openclaw configuration file.
                  </p>
                </div>
                <OpenClawImport />
              </motion.div>
            )}

            {activeTab === "export" && (
              <motion.div
                key="export"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Export to OpenClaw
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Export your agents and workspace configuration as an .openclaw file.
                  </p>
                </div>
                <OpenClawExport />
              </motion.div>
            )}

            {activeTab === "marketplace" && (
              <motion.div
                key="marketplace"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Agent Marketplace
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Browse and install community agents to enhance your workspace.
                  </p>
                </div>
                <AgentList />
              </motion.div>
            )}

            {activeTab === "apikeys" && (
              <motion.div
                key="apikeys"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div />
                  <Link
                    href="/settings/api-keys"
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                  >
                    Open full page <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <ApiKeysManager workspaceId={workspaceId} />

                <hr className="border-neutral-200" />

                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    MCP Server Key (Local)
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Legacy local key for MCP server authentication.
                  </p>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <h3 className="text-sm font-medium text-neutral-800">
                      MCP Server API Key
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      Used by OpenClaw and other MCP clients to access your workspace
                    </p>
                  </div>

                  <div className="px-4 py-4">
                    <div className="relative">
                      <input
                        type={showMcpKey ? "text" : "password"}
                        value={mcpApiKey}
                        onChange={(e) => setMcpApiKey(e.target.value)}
                        placeholder="Generate or paste an API key"
                        className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 pr-20 font-mono text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                      />
                      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1">
                        <button
                          onClick={() => setShowMcpKey(!showMcpKey)}
                          className="rounded p-1 text-neutral-400 hover:text-neutral-600"
                        >
                          {showMcpKey ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {mcpApiKey && (
                          <button
                            onClick={handleCopyKey}
                            className="rounded p-1 text-neutral-400 hover:text-neutral-600"
                          >
                            {copiedKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-neutral-100 px-4 py-3">
                    <button
                      onClick={handleGenerateKey}
                      className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Generate New Key
                    </button>
                    <button
                      onClick={handleSaveMcpKey}
                      className="flex items-center gap-1.5 rounded-md bg-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600"
                    >
                      <Key className="h-3.5 w-3.5" />
                      Save Key
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
                  <h3 className="text-sm font-medium text-neutral-800">
                    MCP Server Configuration
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Use this key to authenticate external agents (OpenClaw, etc.):
                  </p>
                  <pre className="mt-2 rounded-md bg-neutral-900 p-3 text-xs leading-relaxed text-neutral-300">
{`MCP_API_KEY=${mcpApiKey || "your-api-key-here"}

# Knobase does NOT require AI API keys
# Connect external agents via MCP instead`}
                  </pre>
                  <div className="mt-3 rounded-md bg-purple-50 px-3 py-2">
                    <p className="text-xs text-purple-700">
                      <strong>Note:</strong> Knobase is an agent-friendly workspace, not an AI service.
                      Bring your own AI via OpenClaw MCP integration.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "agents" && (
              <motion.div
                key="agents"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div />
                  <Link
                    href="/settings/agents"
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                  >
                    Open full page <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <ConnectedAgents workspaceId={workspaceId} />
                <hr className="border-neutral-200" />
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Agent Personas
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Configure AI agent personas with custom personalities, expertise, and instructions.
                  </p>
                </div>
                <AgentPersonaSettings />
              </motion.div>
            )}

            {activeTab === "analytics" && workspaceId && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Agent Analytics
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Track agent performance, acceptance rates, response times, and usage patterns.
                  </p>
                </div>
                <AgentAnalyticsDashboard workspaceId={workspaceId} />
              </motion.div>
            )}

            {activeTab === "webhooks" && (
              <motion.div
                key="webhooks"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div />
                  <Link
                    href="/settings/webhooks"
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                  >
                    Open full page <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <WebhooksSettings />
              </motion.div>
            )}

            {activeTab === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Secure Credentials
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Encrypted vault for API keys and secrets. Protected with AES-256-GCM encryption.
                  </p>
                </div>
                <CredentialsManager />
              </motion.div>
            )}

            {activeTab === "mcp" && (
              <motion.div
                key="mcp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    MCP Server Configuration
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Configure the Model Context Protocol server for external agent access.
                  </p>
                </div>
                <MCPConfig />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
