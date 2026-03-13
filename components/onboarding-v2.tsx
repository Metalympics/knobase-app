"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  FileText,
  FolderKanban,
  FilePlus2,
  UserPlus,
  AtSign,
  Check,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const templates: Template[] = [
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Agenda, attendees & action items",
    icon: ClipboardList,
  },
  {
    id: "blank",
    title: "Blank",
    description: "Start from scratch",
    icon: FileText,
  },
  {
    id: "project",
    title: "Project",
    description: "Goals, milestones & tasks",
    icon: FolderKanban,
  },
];

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const checklistItems: ChecklistItem[] = [
  {
    id: "create-doc",
    label: "Create your first doc",
    description: "Start writing something — anything!",
    icon: FilePlus2,
  },
  {
    id: "invite-teammate",
    label: "Invite a teammate",
    description: "Collaboration is better together",
    icon: UserPlus,
  },
  {
    id: "try-mention",
    label: "Try @mention",
    description: "Reference people and pages inline",
    icon: AtSign,
  },
];

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

interface OnboardingV2Props {
  onComplete: (data: {
    workspaceName: string;
    templateId: string;
    completedItems: string[];
  }) => void;
}

export function OnboardingV2({ onComplete }: OnboardingV2Props) {
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  const canAdvance = workspaceName.trim().length > 0 && selectedTemplate !== null;

  function toggleItem(id: string) {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFinish() {
    onComplete({
      workspaceName: workspaceName.trim(),
      templateId: selectedTemplate!,
      completedItems: Array.from(completedItems),
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                step === i ? "w-6 bg-primary" : "w-2 bg-muted-foreground/25",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Name your workspace
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick a name and choose a starting template.
                </p>
              </div>

              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Team"
                autoFocus
                className="file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 border-input h-11 w-full rounded-lg border bg-transparent px-4 text-base shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />

              <div className="grid grid-cols-3 gap-3">
                {templates.map((t) => {
                  const Icon = t.icon;
                  const selected = selectedTemplate === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition-all",
                        "hover:border-primary/30 hover:bg-accent",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border bg-card",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-foreground">
                          {t.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!canAdvance}
                onClick={() => setStep(1)}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Getting started
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete these to hit the ground running. You can always come
                  back later.
                </p>
              </div>

              <div className="space-y-3">
                {checklistItems.map((item) => {
                  const Icon = item.icon;
                  const done = completedItems.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
                        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        done
                          ? "border-primary/20 bg-primary/5"
                          : "border-border bg-card",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                          done
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {done ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm font-medium",
                            done
                              ? "text-muted-foreground line-through"
                              : "text-foreground",
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {done && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep(0)}
                >
                  Back
                </Button>
                <Button size="lg" className="flex-1" onClick={handleFinish}>
                  {completedItems.size === checklistItems.length
                    ? "Let\u2019s go!"
                    : "Skip & finish"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
