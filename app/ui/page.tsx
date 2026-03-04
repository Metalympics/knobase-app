"use client";

import Image from "next/image";
import { Brain, Cpu, Clock, Bot, MessageSquare, UserPlus, Edit3, Bell, Check, CheckCheck, Archive, X } from "lucide-react";
import { InlineAgentPromptCard } from "@/components/ui-showcase/inline-agent-prompt-card";
import { InlineAgentProcessingCard } from "@/components/ui-showcase/inline-agent-processing-card";
import { InlineAgentResponseCard } from "@/components/ui-showcase/inline-agent-response-card";
import { AgentSelectorDropdownCard } from "@/components/ui-showcase/agent-selector-dropdown-card";
import { PresenceBarCard } from "@/components/ui-showcase/presence-bar-card";
import { AgentStudioModal } from "@/components/marketplace/agent-studio-modal";
import { ReasoningBadge } from "@/components/editor/reasoning-tooltip";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function SectionLabel({ letter, title, subtitle }: { letter?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      {letter && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
          {letter}
        </span>
      )}
      <div>
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mock data                                                            */
/* ------------------------------------------------------------------ */

const MOCK_REASONING = {
  agentId: "strategy-lead",
  agentName: "Strategy Lead",
  model: "kimi-k2.5",
  reasoning:
    "I analyzed Q3 performance metrics and identified three compounding growth levers: enterprise expansion (0% churn, 140% QoQ), SMB activation improvement (6.8% → target 4%), and agent marketplace launch. The Q4 OKR framework I'm proposing directly targets each lever with measurable outcomes.",
  timestamp: new Date(Date.now() - 8 * 60_000).toISOString(),
  confidence: 0.91,
};

const MOCK_NOTIFICATIONS = [
  {
    id: "n1",
    type: "mention" as const,
    actorName: "Strategy Lead",
    message: "mentioned you in Q4 Go-To-Market Strategy",
    timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
    read: false,
  },
  {
    id: "n2",
    type: "agent-suggestion" as const,
    actorName: "Data Analyst",
    message: "completed Competitor Analysis and is ready to review",
    timestamp: new Date(Date.now() - 18 * 60_000).toISOString(),
    read: false,
  },
  {
    id: "n3",
    type: "mention" as const,
    actorName: "Sarah",
    message: "mentioned you in Q1 2026 Sprint Plan",
    timestamp: new Date(Date.now() - 45 * 60_000).toISOString(),
    read: true,
  },
  {
    id: "n4",
    type: "share" as const,
    actorName: "Alex",
    message: "shared Q4 Go-To-Market Strategy with you",
    timestamp: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    read: true,
  },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  mention: <span className="text-[10px] font-bold">@</span>,
  comment: <MessageSquare className="h-3 w-3" />,
  share: <UserPlus className="h-3 w-3" />,
  "agent-suggestion": <Bot className="h-3 w-3" />,
  "doc-edit": <Edit3 className="h-3 w-3" />,
  "member-joined": <UserPlus className="h-3 w-3" />,
  "role-changed": <Edit3 className="h-3 w-3" />,
};

function timeAgo(ts: string) {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/* ------------------------------------------------------------------ */
/* Notification Panel (standalone, no toggle button needed)             */
/* ------------------------------------------------------------------ */

function NotificationPanel() {
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <div className="w-80 rounded-xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-neutral-600" />
          <span className="text-sm font-semibold text-neutral-900">Notifications</span>
          {unread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
          <button className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
            <Archive className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-72 overflow-y-auto">
        {MOCK_NOTIFICATIONS.map((notif) => (
          <div
            key={notif.id}
            className={`group relative flex items-start gap-3 px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors ${
              !notif.read ? "bg-purple-50/40" : ""
            }`}
          >
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white mt-0.5 ${
              !notif.read ? "bg-purple-500" : "bg-neutral-300"
            }`}>
              {TYPE_ICONS[notif.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-neutral-700 leading-relaxed">
                <span className="font-medium">{notif.actorName}</span>{" "}
                {notif.message}
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-400">{timeAgo(notif.timestamp)}</p>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200">
                <X className="h-3 w-3" />
              </button>
              <button className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200">
                <Check className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reasoning Tooltip (always-visible version)                           */
/* ------------------------------------------------------------------ */

function ReasoningTooltipVisible() {
  return (
    <div className="w-72 rounded-lg border border-purple-100 bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center gap-1.5">
        <Brain className="h-3.5 w-3.5 text-purple-500" />
        <span className="text-xs font-semibold text-purple-600">
          {MOCK_REASONING.agentName}&apos;s Reasoning
        </span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-neutral-600">
        {MOCK_REASONING.reasoning}
      </p>
      <div className="flex items-center gap-3 border-t border-neutral-100 pt-2">
        <div className="flex items-center gap-1">
          <Cpu className="h-3 w-3 text-neutral-400" />
          <span className="text-[10px] text-neutral-400">{MOCK_REASONING.model}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-neutral-400" />
          <span className="text-[10px] text-neutral-400">8m ago</span>
        </div>
        <div className="ml-auto">
          <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
            91% confident
          </span>
        </div>
      </div>
      <div className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 border-b border-r border-purple-100 bg-white" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function UIShowcasePage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-8 py-3">
        <div className="flex items-center gap-3">
          <Image src="/openclaw.png" alt="Knobase" width={24} height={24} className="rounded-md" />
          <span className="text-sm font-semibold text-neutral-900">Knobase UI Kit</span>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
            html.to.design
          </span>
        </div>
        <p className="text-xs text-neutral-400">9 components · Public · No auth required</p>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-10 space-y-14">

        {/* ── Section 1: Inline Agent States ── */}
        <section>
          <SectionLabel
            title="Inline Agent States"
            subtitle="Components A, B, C — the three states of an @mention inline block inside the editor. Each takes a full row to show the natural horizontal width."
          />
          <div className="space-y-4">

            {/* A — Prompt */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">A</span>
                <span className="text-xs font-medium text-neutral-600">Prompt Box — input state</span>
              </div>
              <InlineAgentPromptCard
                agentName="Strategy Lead"
                agentAvatar="/strategy-lead.svg"
                agentColor="#7C3AED"
                promptValue="Analyze our Q3 performance data and outline three main growth pillars for Q4"
              />
            </Card>

            {/* B — Running */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">B</span>
                <span className="text-xs font-medium text-neutral-600">Processing State — running</span>
              </div>
              <InlineAgentProcessingCard
                agentName="Data Analyst"
                agentAvatar="/data-analyst.svg"
                agentColor="#2563EB"
                prompt="Pull exact churn cohort data for the SMB segment and model the revenue impact"
                currentAction="Scanning cohort tables..."
                state="running"
              />
            </Card>

            {/* B — Queued variant */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-400 text-[10px] font-bold text-white">B</span>
                <span className="text-xs font-medium text-neutral-600">Processing State — queued variant</span>
              </div>
              <InlineAgentProcessingCard
                agentName="Compliance Officer"
                agentAvatar="/compliance-officer.svg"
                agentColor="#1E3A5F"
                prompt="Review the BrightPath Health proposal for HIPAA requirements before we send it"
                state="queued"
              />
            </Card>

            {/* C — Response: OpenClaw */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">C</span>
                <span className="text-xs font-medium text-neutral-600">Response State — completed</span>
              </div>
              <InlineAgentResponseCard
                agentName="OpenClaw"
                agentAvatar="/openclaw.png"
                agentColor="#E94560"
                prompt="Summarize Q3 company report"
                result={`Q3 2025 was a strong quarter — $4.2M ARR (+24% QoQ), 89 new customers, and 12 enterprise accounts signed.\n\nKey risks: SMB churn rose to 4.2% ("too complex"). Q4 focus: marketplace launch, enterprise SSO, simplified SMB onboarding.`}
              />
            </Card>

            {/* C — Response: SEO Expert */}
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-400 text-[10px] font-bold text-white">C</span>
                <span className="text-xs font-medium text-neutral-600">Response State — SEO Expert</span>
              </div>
              <InlineAgentResponseCard
                agentName="SEO Expert"
                agentAvatar="/seo-expert.svg"
                agentColor="#EA580C"
                prompt="Optimize our positioning page headline for search"
                result={`Proposed headline: "The doc where your AI teammates work alongside you."\n\nMeta description: "Knobase lets you @mention AI agents inside your documents. They research, write, and analyze — right where the work happens."\n\nTop keyword opportunities: "ai document editor" (8,200/mo), "notion ai alternative" (5,400/mo).`}
              />
            </Card>

          </div>
        </section>

        {/* ── Section 2: @mention Selector Dropdown ── */}
        <section>
          <SectionLabel
            title="Agent Selector Dropdown"
            subtitle="The @mention picker — appears when typing @ inside the editor, showing all 9 agents + collaborators"
          />
          <div className="flex gap-6 flex-wrap">
            <AgentSelectorDropdownCard />
            <div className="flex-1 min-w-60 max-w-sm">
              <Card className="h-full">
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Triggered by typing <code className="rounded bg-neutral-100 px-1 font-mono text-[11px]">@</code> anywhere in a document.
                  Shows all 9 AI agents (4 product agents + 5 video agents) and the 5 workspace collaborators.
                  Keyboard navigable: <kbd className="rounded bg-neutral-100 px-1 font-mono text-[10px]">↑↓</kbd> to move,{" "}
                  <kbd className="rounded bg-neutral-100 px-1 font-mono text-[10px]">Enter</kbd> to select,{" "}
                  <kbd className="rounded bg-neutral-100 px-1 font-mono text-[10px]">Esc</kbd> to dismiss.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* ── Section 3: Reasoning Bubble ── */}
        <section>
          <SectionLabel
            letter="F"
            title="Floating Reasoning Bubble"
            subtitle="Two variants — ReasoningTooltip (hover card) and ReasoningBadge (inline expand/collapse pill)"
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <p className="text-xs font-medium text-neutral-500 mb-4">Tooltip — floats above text on hover</p>
              <div className="relative pt-2 pb-6">
                <div className="absolute top-2 left-0">
                  <ReasoningTooltipVisible />
                </div>
                <div className="mt-44 text-sm text-neutral-400 border-b border-dashed border-purple-300 inline-block pb-0.5">
                  The Q4 strategy recommendation
                </div>
              </div>
            </Card>

            <Card>
              <p className="text-xs font-medium text-neutral-500 mb-4">Badge — inline expand/collapse pill</p>
              <ReasoningBadge trace={MOCK_REASONING} defaultExpanded={true} />
            </Card>
          </div>
        </section>

        {/* ── Section 4: Notification Center ── */}
        <section>
          <SectionLabel
            title="Notification Center"
            subtitle="Bell dropdown — shows @mentions, agent completions, and workspace activity"
          />
          <div className="flex gap-6 flex-wrap items-start">
            <NotificationPanel />
            <div className="flex-1 min-w-60 max-w-sm">
              <Card>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Triggered by the Bell icon in the workspace toolbar.
                  Unread notifications are highlighted in purple.
                  Supports mark-all-read, archive-all, and per-item actions.
                  A toast slides in from the bottom-right when a new notification arrives.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* ── Section 5: Agent Studio Modal ── */}
        <section>
          <SectionLabel
            letter="E"
            title="Agent Studio Modal"
            subtitle="Triggered by 'Invite agents' in the sidebar — browse and add AI agents to the workspace"
          />
          <AgentStudioModal onClose={() => {}} standalone={true} addedAgentIds={["openclaw", "strategy-lead"]} />
        </section>

        {/* ── Section 6: Presence Bar ── */}
        <section>
          <SectionLabel
            title="Presence Bar"
            subtitle="Avatar stack showing who is online — humans (green dot) and agents (colored dot)"
          />
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-[10px] text-neutral-400 mb-2">Saved</p>
                <PresenceBarCard syncStatus="saved" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 mb-2">Saving...</p>
                <PresenceBarCard syncStatus="saving" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 mb-2">Offline</p>
                <PresenceBarCard syncStatus="offline" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 7: Avatar Reference Sheet ── */}
        <section>
          <SectionLabel
            title="Agent Avatar Reference"
            subtitle="All 9 agent avatars at full size for the videographer"
          />
          <Card>
            <div className="grid grid-cols-3 gap-6 sm:grid-cols-5 lg:grid-cols-9">
              {[
                { name: "OpenClaw", avatar: "/openclaw.png", color: "#E94560" },
                { name: "ChatGPT", avatar: "/chatgpt.png", color: "#10a37f" },
                { name: "Claude", avatar: "/claude.png", color: "#8B5CF6" },
                { name: "Cursor", avatar: "/cursor.png", color: "#2563EB" },
                { name: "Strategy Lead", avatar: "/strategy-lead.svg", color: "#7C3AED" },
                { name: "Data Analyst", avatar: "/data-analyst.svg", color: "#2563EB" },
                { name: "Designer", avatar: "/designer.svg", color: "#EC4899" },
                { name: "Compliance", avatar: "/compliance-officer.svg", color: "#1E3A5F" },
                { name: "SEO Expert", avatar: "/seo-expert.svg", color: "#EA580C" },
              ].map((agent) => (
                <div key={agent.name} className="flex flex-col items-center gap-2">
                  <div
                    className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2"
                    style={{ borderColor: agent.color + "40", backgroundColor: agent.color + "12" }}
                  >
                    <Image
                      src={agent.avatar}
                      alt={agent.name}
                      width={56}
                      height={56}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  </div>
                  <span className="text-center text-[10px] text-neutral-500 leading-tight">{agent.name}</span>
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: agent.color }}
                  >
                    {agent.color}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Footer */}
        <div className="border-t border-neutral-200 pt-6 pb-10 text-center">
          <p className="text-xs text-neutral-400">
            Knobase UI Kit · <span className="font-mono">noindex</span> · Use html.to.design to export this page to Figma
          </p>
        </div>

      </div>
    </div>
  );
}
