"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BookOpen,
  LogIn,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Clock,
  Plus,
  User,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo, type SimulatedTask, type PresenceEntry } from "@/lib/demo/context";

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

function TaskRow({ task, onClick }: { task: SimulatedTask; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-xs text-left hover:bg-neutral-100 transition-colors"
      title="Go to task location"
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white border border-neutral-200">
        <Image
          src={task.agentAvatar}
          alt={task.agentName}
          width={20}
          height={20}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-neutral-700 truncate">
            {task.agentName}
          </span>
          {task.status === "queued" && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
              <Clock className="h-2.5 w-2.5" />
              Queued
            </span>
          )}
          {task.status === "processing" && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: task.agentColor }}>
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Processing
            </span>
          )}
          {task.status === "completed" && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Done
            </span>
          )}
        </div>
        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
          {task.prompt}
        </p>
      </div>
    </button>
  );
}

function PresenceRow({
  entry,
  onClick,
}: {
  entry: PresenceEntry;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors text-left group"
      title={`Go to ${entry.documentTitle}`}
    >
      <div className="relative">
        {entry.type === "agent" && entry.avatar ? (
          <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white border border-neutral-200">
            <Image
              src={entry.avatar}
              alt={entry.name}
              width={20}
              height={20}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: entry.color }}
          >
            {getInitial(entry.name)}
          </div>
        )}
        <div
          className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#fafafa]"
          style={{ backgroundColor: entry.type === "person" ? "#10B981" : entry.color }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[13px]">{entry.name}</span>
      </div>
      {entry.type === "person" ? (
        <User className="h-3 w-3 text-neutral-300" />
      ) : (
        <Bot className="h-3 w-3 text-neutral-300" />
      )}
    </button>
  );
}

type PresenceFilter = "all" | "people" | "agents";

export function DemoSidebar() {
  const router = useRouter();
  const demo = useDemo();
  const [presenceFilter, setPresenceFilter] = useState<PresenceFilter>("all");

  const people = demo.presence.filter((p) => p.type === "person");
  const agents = demo.presence.filter((p) => p.type === "agent");
  const activeTasks = demo.simulatedTasks.filter((t) => t.status !== "completed").length;

  const filteredPresence =
    presenceFilter === "people"
      ? people
      : presenceFilter === "agents"
        ? agents
        : [...people, ...agents];

  const toggleFilter = (f: PresenceFilter) =>
    setPresenceFilter((prev) => (prev === f ? "all" : f));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[#e5e5e5] bg-[#fafafa]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#e5e5e5] px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-neutral-200 bg-white">
          <BookOpen className="h-3.5 w-3.5 text-neutral-700" />
        </div>
        <span className="text-sm font-semibold text-neutral-900">Knobase</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          Demo
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Documents */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Pages
          </span>
          <button
            onClick={() => demo.createDocument()}
            className="flex h-5 w-5 items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 transition-colors"
            title="New page"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-2 space-y-0.5">
          {demo.documents.map((doc) => {
            const isActive = doc.id === demo.currentDocument?.id;
            return (
              <button
                key={doc.id}
                onClick={() => demo.setCurrentDocumentId(doc.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-neutral-200/70 text-neutral-900 font-medium"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span className="text-sm">{doc.icon}</span>
                <span className="truncate text-[13px]">{doc.title}</span>
              </button>
            );
          })}
        </div>

        {/* Online */}
        <div className="flex items-center justify-between px-3 pt-5 pb-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Online — {people.length + agents.length}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => toggleFilter("people")}
              className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                presenceFilter === "people"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
              }`}
              title="People"
            >
              <User className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={() => toggleFilter("agents")}
              className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                presenceFilter === "agents"
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
              }`}
              title="Agents"
            >
              <Bot className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
        <div className="px-2 space-y-0.5">
          {filteredPresence.map((entry) => (
            <PresenceRow
              key={entry.id}
              entry={entry}
              onClick={() => demo.setCurrentDocumentId(entry.documentId)}
            />
          ))}
        </div>

        {/* Agent Queue */}
        <div className="px-3 pt-5 pb-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
              Agent Queue
            </span>
            {demo.simulatedTasks.length > 0 && (
              <span className="text-[10px] text-neutral-400">
                {activeTasks} active
              </span>
            )}
          </div>
        </div>
        <div className="px-2 space-y-0.5 pb-3">
          {demo.simulatedTasks.slice(0, 10).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onClick={() => demo.navigateToTask(task)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#e5e5e5] p-3 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/auth/login")}
          className="w-full justify-start text-neutral-600"
        >
          <LogIn className="mr-2 h-3.5 w-3.5" />
          Log in
        </Button>
        <Button
          size="sm"
          onClick={() => router.push("/auth/signup")}
          className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
        >
          Get started free
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
