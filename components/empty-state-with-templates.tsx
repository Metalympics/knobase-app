"use client";

import {
  FileText,
  ClipboardList,
  FolderKanban,
  BookOpen,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";

export interface Template {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const defaultTemplates: Template[] = [
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Agenda, attendees & action items",
    icon: ClipboardList,
  },
  {
    id: "project-plan",
    title: "Project Plan",
    description: "Goals, milestones & timeline",
    icon: FolderKanban,
  },
  {
    id: "knowledge-base",
    title: "Knowledge Base",
    description: "Docs, guides & references",
    icon: BookOpen,
  },
  {
    id: "blank",
    title: "Blank Page",
    description: "Start from scratch",
    icon: FileText,
  },
];

interface EmptyStateWithTemplatesProps {
  onSelectTemplate: (template: Template) => void;
  templates?: Template[];
  folderName?: string;
}

export function EmptyStateWithTemplates({
  onSelectTemplate,
  templates = defaultTemplates,
  folderName,
}: EmptyStateWithTemplatesProps) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-2xl">
            📂
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {folderName ? `${folderName} is empty` : "This folder is empty"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a template to get started, or create a blank document.
          </p>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
            />
          ))}
        </div>

        {/* Drag & drop hint */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-2 text-xs">
            <Upload className="h-3.5 w-3.5" />
            <span>Or drag &amp; drop files here</span>
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: (template: Template) => void;
}) {
  const Icon = template.icon;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(template)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(template);
        }
      }}
      className="cursor-pointer gap-3 px-4 py-5 transition-colors hover:border-primary/20 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-0.5">
        <span className="block text-sm font-semibold text-foreground">
          {template.title}
        </span>
        <span className="block text-xs text-muted-foreground">
          {template.description}
        </span>
      </div>
    </Card>
  );
}
