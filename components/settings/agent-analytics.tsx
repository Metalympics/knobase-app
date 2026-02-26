"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  getWorkspaceAgentAnalytics,
  type WorkspaceAgentAnalytics,
  type AgentMetrics,
} from "@/lib/agents/analytics";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)}m`;
  return `${(m / 60).toFixed(1)}h`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-xs text-neutral-400">{label}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

function MiniBar({
  data,
  label,
  color = "bg-purple-400",
}: {
  data: { date: string; count: number }[];
  label: string;
  color?: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  // Show last 14 days for readability
  const recent = data.slice(-14);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-neutral-400" />
        <h3 className="text-sm font-medium text-neutral-800">{label}</h3>
      </div>
      <div className="flex items-end gap-1">
        {recent.map((day) => (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-medium text-neutral-500">
              {day.count || ""}
            </span>
            <div
              className={`w-full rounded-t ${color} transition-all`}
              style={{
                height: `${Math.max((day.count / maxCount) * 60, 2)}px`,
              }}
            />
            <span className="text-[8px] text-neutral-400">
              {new Date(day.date).toLocaleDateString(undefined, { day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AcceptanceRing({ rate }: { rate: number }) {
  const circumference = 2 * Math.PI * 36;
  const filled = circumference * rate;
  const color =
    rate >= 0.7 ? "text-emerald-500" : rate >= 0.4 ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e5e5" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className="absolute text-lg font-bold text-neutral-900">{pct(rate)}</span>
    </div>
  );
}

function AgentCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: AgentMetrics;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
        isSelected
          ? "border-purple-300 bg-purple-50"
          : "border-neutral-200 bg-white hover:border-neutral-300"
      }`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm">
        <Bot className="h-4 w-4 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-neutral-900">{agent.agentName}</p>
        <p className="text-[11px] text-neutral-400">
          {agent.completedTasks}/{agent.totalTasks} tasks · {pct(agent.acceptanceRate)} accepted
        </p>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs font-medium text-neutral-600">
          {formatMs(agent.averageCompletionMs)}
        </span>
        <span className="text-[10px] text-neutral-400">avg</span>
      </div>
    </button>
  );
}

function TaskTypeBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return null;

  const colors = [
    "bg-purple-400",
    "bg-blue-400",
    "bg-emerald-400",
    "bg-amber-400",
    "bg-rose-400",
    "bg-indigo-400",
  ];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-neutral-800">Task Types</h3>
      <div className="space-y-2">
        {entries.map(([type, count], i) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`} />
            <span className="flex-1 text-xs text-neutral-600 capitalize">{type}</span>
            <span className="text-xs font-medium text-neutral-800">{count}</span>
            <div className="h-1.5 w-16 rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full ${colors[i % colors.length]}`}
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

interface AgentAnalyticsDashboardProps {
  workspaceId: string;
}

export function AgentAnalyticsDashboard({ workspaceId }: AgentAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<WorkspaceAgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkspaceAgentAnalytics(workspaceId, days);
      setAnalytics(data);
      if (!selectedAgent && data.agents.length > 0) {
        setSelectedAgent(data.agents[0].agentId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, days]);

  const currentAgent = useMemo(
    () => analytics?.agents.find((a) => a.agentId === selectedAgent) ?? null,
    [analytics, selectedAgent],
  );

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        <span className="ml-2 text-sm text-neutral-400">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <XCircle className="mx-auto h-6 w-6 text-red-400" />
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button
          onClick={load}
          className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const { totals } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-neutral-900">Agent Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={load}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Workspace-level stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Tasks"
          value={totals.totalTasks}
          sub={`${totals.completedTasks} completed`}
          icon={<Zap className="h-4 w-4" />}
          color="text-purple-500 bg-purple-50"
        />
        <StatCard
          label="Success Rate"
          value={
            totals.totalTasks > 0
              ? pct(totals.completedTasks / totals.totalTasks)
              : "—"
          }
          sub={`${totals.failedTasks} failed`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-emerald-500 bg-emerald-50"
        />
        <StatCard
          label="Proposals"
          value={totals.totalProposals}
          sub={`${totals.acceptedProposals} accepted`}
          icon={<Activity className="h-4 w-4" />}
          color="text-blue-500 bg-blue-50"
        />
        <StatCard
          label="Avg Response"
          value={formatMs(totals.averageCompletionMs)}
          sub="completion time"
          icon={<Clock className="h-4 w-4" />}
          color="text-amber-500 bg-amber-50"
        />
      </div>

      {/* Agent list + detail */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Agent list */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-neutral-600">Agents</h3>
          {analytics.agents.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-400">
              No agent activity yet
            </p>
          ) : (
            analytics.agents.map((agent) => (
              <AgentCard
                key={agent.agentId}
                agent={agent}
                isSelected={selectedAgent === agent.agentId}
                onClick={() => setSelectedAgent(agent.agentId)}
              />
            ))
          )}
        </div>

        {/* Agent detail */}
        <div className="space-y-4 lg:col-span-2">
          {currentAgent ? (
            <>
              {/* Acceptance rate + summary */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center rounded-lg border border-neutral-200 bg-white p-4">
                  <AcceptanceRing rate={currentAgent.acceptanceRate} />
                  <p className="mt-2 text-xs text-neutral-500">Acceptance Rate</p>
                  <p className="text-[10px] text-neutral-400">
                    {currentAgent.acceptedProposals + currentAgent.modifiedProposals}/
                    {currentAgent.totalProposals} proposals
                  </p>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                      <p className="text-lg font-bold text-neutral-900">
                        {currentAgent.completedTasks}
                      </p>
                      <p className="text-[10px] text-neutral-400">Completed</p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                      <p className="text-lg font-bold text-neutral-900">
                        {currentAgent.pendingTasks}
                      </p>
                      <p className="text-[10px] text-neutral-400">In Queue</p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                      <p className="text-lg font-bold text-neutral-900">
                        {currentAgent.totalSessions}
                      </p>
                      <p className="text-[10px] text-neutral-400">Sessions</p>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                      <p className="text-lg font-bold text-neutral-900">
                        {currentAgent.totalSessionMinutes}m
                      </p>
                      <p className="text-[10px] text-neutral-400">Total Time</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <MiniBar
                data={currentAgent.dailyTasks}
                label="Tasks per Day"
                color="bg-purple-400"
              />
              <MiniBar
                data={currentAgent.dailyProposals}
                label="Proposals per Day"
                color="bg-blue-400"
              />

              {/* Task type breakdown */}
              <TaskTypeBreakdown breakdown={currentAgent.taskTypeBreakdown} />

              {/* Response time by type */}
              {Object.keys(currentAgent.responseTimeByType).length > 0 && (
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-medium text-neutral-800">
                    Avg Response Time by Task Type
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(currentAgent.responseTimeByType)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, ms]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-xs text-neutral-600 capitalize">{type}</span>
                          <span className="text-xs font-medium text-neutral-800">
                            {formatMs(ms)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Bot className="h-8 w-8" />
              <p className="mt-2 text-sm">Select an agent to view detailed analytics</p>
            </div>
          )}
        </div>
      </div>

      {/* Top documents */}
      {analytics.topDocuments.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h3 className="text-sm font-medium text-neutral-800">
              Most Active Documents
            </h3>
          </div>
          <div className="divide-y divide-neutral-50">
            {analytics.topDocuments.map((doc, i) => (
              <div key={doc.documentId} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 text-center text-xs font-medium text-neutral-300">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-mono text-xs text-neutral-500">
                  {doc.documentId.slice(0, 8)}...
                </span>
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                  {doc.taskCount} tasks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
