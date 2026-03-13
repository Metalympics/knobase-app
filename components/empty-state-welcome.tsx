"use client";

import {
  FileText,
  LayoutTemplate,
  ArrowRight,
  Download,
  ClipboardList,
  CheckSquare,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateWelcomeProps {
  onStartFromTemplate?: () => void;
  onBlankPage?: () => void;
  onImportFromNotion?: () => void;
  onCreateMeetingNotes?: () => void;
  onStartTodoList?: () => void;
}

export function EmptyStateWelcome({
  onStartFromTemplate,
  onBlankPage,
  onImportFromNotion,
  onCreateMeetingNotes,
  onStartTodoList,
}: EmptyStateWelcomeProps) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg space-y-10">
        {/* Welcome header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-2xl">
            👋
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to your workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is your blank canvas. Create your first document to get
            started.
          </p>
        </div>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onStartFromTemplate}
            className="h-auto flex-col gap-3 rounded-xl border-border bg-card px-4 py-6 shadow-sm hover:border-primary/20 hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5 text-center">
              <span className="block text-sm font-semibold text-foreground">
                Start from template
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                Meeting notes, wiki &amp; more
              </span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={onBlankPage}
            className="h-auto flex-col gap-3 rounded-xl border-border bg-card px-4 py-6 shadow-sm hover:border-primary/20 hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5 text-center">
              <span className="block text-sm font-semibold text-foreground">
                Blank page
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                Start with an empty canvas
              </span>
            </div>
          </Button>
        </div>

        {/* Quick action links */}
        <div className="space-y-1">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quick actions
          </p>
          <QuickAction
            icon={<Download className="h-4 w-4" />}
            label="Import from Notion"
            onClick={onImportFromNotion}
          />
          <QuickAction
            icon={<ClipboardList className="h-4 w-4" />}
            label="Create meeting notes"
            onClick={onCreateMeetingNotes}
          />
          <QuickAction
            icon={<CheckSquare className="h-4 w-4" />}
            label="Start todo list"
            onClick={onStartTodoList}
          />
        </div>

        {/* Pro tip */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">Pro tip</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Type{" "}
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
                @
              </kbd>{" "}
              anywhere to mention a teammate or an AI agent. They&apos;ll get
              notified and can jump right into your doc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        {icon}
      </div>
      <span className="flex-1 font-medium">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
