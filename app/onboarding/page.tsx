"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen } from "lucide-react";
import { createDocument, updateDocument } from "@/lib/documents/store";
import { WELCOME_TITLE, WELCOME_CONTENT } from "@/lib/documents/welcome";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces/store";
import { getSubscription } from "@/lib/subscription/store";

export default function OnboardingPage() {
  const [name, setName] = useState("My Knowledge");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    localStorage.setItem("knobase-app:workspace", name.trim() || "My Knowledge");

    const ws = getOrCreateDefaultWorkspace();
    getSubscription(ws.id);

    const welcomeDoc = createDocument(WELCOME_TITLE);
    updateDocument(welcomeDoc.id, { content: WELCOME_CONTENT });

    setTimeout(() => router.push("/knowledge"), 400);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        <div className="flex flex-col items-center gap-2 mb-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white shadow-sm">
            <BookOpen className="h-6 w-6 text-neutral-700" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
            Create your knowledge base
          </h1>
          <p className="text-sm text-neutral-500">
            Give your workspace a name to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="workspace-name"
              className="text-sm font-medium text-neutral-700"
            >
              Workspace name
            </label>
            <Input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Knowledge"
              className="h-11 border-[#e5e5e5] bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-300"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="h-11 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating...
              </span>
            ) : (
              "Continue"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          You can change this later in settings.
        </p>
      </div>
    </div>
  );
}
