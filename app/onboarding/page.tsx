"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Briefcase,
  GraduationCap,
  Lightbulb,
  PenTool,
  Check,
  Plus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { transferDemoToLocalAccount, hasDemoState } from "@/lib/demo/state";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}

type Step = "workspace" | "persona" | "invite" | "complete";
const STEPS: Step[] = ["workspace", "persona", "invite", "complete"];

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDemo = searchParams.get("from_demo") === "1";

  const [step, setStep] = useState<Step>("workspace");
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Workspace
  const [workspaceName, setWorkspaceName] = useState("My Knowledge");

  // Step 2: Persona
  const [persona, setPersona] = useState<string | null>(null);

  // Step 3: Invite
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // Auto-generate slug from name
  const workspaceSlug = useMemo(
    () =>
      workspaceName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "my-knowledge",
    [workspaceName]
  );

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleComplete = async () => {
    setIsLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login?redirect=/onboarding");
      return;
    }

    // Get public user
    const { data: publicUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!publicUser) {
      // Shouldn't happen — auth callback creates the profile
      console.error("No public.users record found");
      router.push("/knowledge");
      return;
    }

    // Create workspace in Supabase
    const inviteCode = crypto.randomUUID().slice(0, 8).toUpperCase();
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: workspaceName.trim() || "My Knowledge",
        slug: workspaceSlug,
        owner_id: publicUser.id,
        invite_code: inviteCode,
        settings: { persona: persona || "general" },
      })
      .select("id")
      .single();

    if (wsError) {
      console.error("Failed to create workspace:", wsError);
      // Fall through — workspace might already exist, etc.
    }

    if (workspace) {
      // Add owner as admin member
      await supabase.from("workspace_members").insert({
        workspace_id: workspace.id,
        user_id: publicUser.id,
        role: "admin" as const,
      });

      // Send invites (best-effort)
      const validEmails = inviteEmails.filter(
        (e) => e.trim() && e.includes("@")
      );
      for (const email of validEmails) {
        await supabase.from("invites").insert({
          token: crypto.randomUUID(),
          email: email.trim(),
          workspace_id: workspace.id,
          invited_by: publicUser.id,
          role: "editor",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
      }
    }

    // Transfer demo content if coming from demo
    if (fromDemo && hasDemoState()) {
      transferDemoToLocalAccount();
    }

    // Also persist workspace name to localStorage for offline mode
    localStorage.setItem(
      "knobase-app:workspace",
      workspaceName.trim() || "My Knowledge"
    );

    router.push("/knowledge");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-lg px-6">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1 w-full rounded-full bg-neutral-100">
            <div
              className="h-1 rounded-full bg-neutral-900 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-neutral-400">
            <span>Step {stepIndex + 1} of {STEPS.length}</span>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white shadow-sm">
            <BookOpen className="h-6 w-6 text-neutral-700" />
          </div>
        </div>

        {/* Step content */}
        {step === "workspace" && (
          <WorkspaceStep
            name={workspaceName}
            slug={workspaceSlug}
            onNameChange={setWorkspaceName}
            onNext={goNext}
          />
        )}
        {step === "persona" && (
          <PersonaStep
            selected={persona}
            onSelect={setPersona}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === "invite" && (
          <InviteStep
            emails={inviteEmails}
            onEmailsChange={setInviteEmails}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === "complete" && (
          <CompleteStep
            workspaceName={workspaceName}
            isLoading={isLoading}
            onComplete={handleComplete}
            onBack={goBack}
          />
        )}

        {/* Auth links */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-400">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-neutral-600 underline hover:text-neutral-900"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Workspace Setup ──

function WorkspaceStep({
  name,
  slug,
  onNameChange,
  onNext,
}: {
  name: string;
  slug: string;
  onNameChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-neutral-900">
        Create your workspace
      </h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        Give your knowledge base a name to get started.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onNext();
        }}
        className="mt-8 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-700">
            Workspace name
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="My Knowledge"
            className="h-11 border-[#e5e5e5] bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-300"
            autoFocus
          />
          <p className="text-xs text-neutral-400">
            URL: knobase.com/<span className="font-mono">{slug || "..."}</span>
          </p>
        </div>

        <Button
          type="submit"
          disabled={!name.trim()}
          className="h-11 bg-neutral-900 text-white hover:bg-neutral-800"
        >
          Continue
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

// ── Step 2: Persona / Intent Survey ──

const PERSONAS = [
  {
    id: "product",
    label: "Product & Engineering",
    icon: Briefcase,
    description: "Roadmaps, specs, sprint docs",
  },
  {
    id: "research",
    label: "Research & Analysis",
    icon: GraduationCap,
    description: "Papers, notes, findings",
  },
  {
    id: "creative",
    label: "Creative & Content",
    icon: PenTool,
    description: "Blogs, marketing, copywriting",
  },
  {
    id: "general",
    label: "General Knowledge",
    icon: Lightbulb,
    description: "Personal wiki, reference, learning",
  },
];

function PersonaStep({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-neutral-900">
        What are you building?
      </h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        We&apos;ll customize your experience. You can change this later.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                isSelected
                  ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                  : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <Icon
                  className={`h-5 w-5 ${isSelected ? "text-neutral-900" : "text-neutral-400"}`}
                />
                {isSelected && <Check className="h-4 w-4 text-neutral-900" />}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {p.label}
                </p>
                <p className="text-xs text-neutral-500">{p.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-11 flex-1 border-neutral-200"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          className="h-11 flex-[2] bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {selected ? "Continue" : "Skip"}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Invite Teammates ──

function InviteStep({
  emails,
  onEmailsChange,
  onNext,
  onBack,
}: {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const addEmail = () => {
    if (emails.length < 5) {
      onEmailsChange([...emails, ""]);
    }
  };

  const removeEmail = (idx: number) => {
    if (emails.length > 1) {
      onEmailsChange(emails.filter((_, i) => i !== idx));
    }
  };

  const updateEmail = (idx: number, value: string) => {
    const updated = [...emails];
    updated[idx] = value;
    onEmailsChange(updated);
  };

  return (
    <div>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-neutral-900">
        Invite your team
      </h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        Collaboration is better together. You can always invite later.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {emails.map((email, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => updateEmail(idx, e.target.value)}
              placeholder="teammate@company.com"
              className="h-11 flex-1 border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-300"
              autoFocus={idx === 0}
            />
            {emails.length > 1 && (
              <button
                onClick={() => removeEmail(idx)}
                className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {emails.length < 5 && (
          <button
            onClick={addEmail}
            className="flex items-center gap-1 self-start text-xs text-neutral-500 hover:text-neutral-700"
          >
            <Plus className="h-3 w-3" />
            Add another
          </button>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-11 flex-1 border-neutral-200"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          className="h-11 flex-[2] bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {emails.some((e) => e.trim() && e.includes("@"))
            ? "Continue"
            : "Skip for now"}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Ready ──

function CompleteStep({
  workspaceName,
  isLoading,
  onComplete,
  onBack,
}: {
  workspaceName: string;
  isLoading: boolean;
  onComplete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        You&apos;re all set!
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        <span className="font-medium text-neutral-700">{workspaceName}</span> is
        ready. Your first document is waiting for you.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Button
          onClick={onComplete}
          disabled={isLoading}
          className="h-12 bg-neutral-900 text-white hover:bg-neutral-800"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Setting up...
            </span>
          ) : (
            <>
              Open my workspace
              <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="text-neutral-500"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Go back
        </Button>
      </div>
    </div>
  );
}
