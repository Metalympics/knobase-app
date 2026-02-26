"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LogIn, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import {
  saveDemoState,
  loadDemoState,
  getOrCreateDemoDocId,
  markDemoStarted,
  getDemoMinutesElapsed,
  DEMO_DOCUMENT_CONTENT,
} from "@/lib/demo/state";
import { SignupPromptModal } from "@/components/onboarding/signup-modal";

export default function DemoPage() {
  const router = useRouter();
  const [docId] = useState(() => getOrCreateDemoDocId());
  const [content, setContent] = useState("");
  const [showSignup, setShowSignup] = useState(false);
  const [signupTrigger, setSignupTrigger] = useState<string>("manual");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPromptedRef = useRef(false);

  // Load existing demo or initialize with template content
  useEffect(() => {
    const existing = loadDemoState();
    if (existing && existing.content) {
      setContent(existing.content);
    } else {
      setContent(DEMO_DOCUMENT_CONTENT);
      saveDemoState({
        id: docId,
        title: "Untitled Document",
        content: DEMO_DOCUMENT_CONTENT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    markDemoStarted();
  }, [docId]);

  // Auto-prompt after 5 minutes of editing
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (getDemoMinutesElapsed() >= 5 && !hasPromptedRef.current) {
        hasPromptedRef.current = true;
        setSignupTrigger("time");
        setShowSignup(true);
      }
    }, 30_000); // Check every 30s
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Exit intent detection — mouse leaves top of viewport
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 20 && !hasPromptedRef.current) {
        hasPromptedRef.current = true;
        setSignupTrigger("exit");
        setShowSignup(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, []);

  // Persist content changes to localStorage (debounced via editor)
  const handleContentChange = useCallback(
    (markdown: string) => {
      setContent(markdown);
      const existing = loadDemoState();
      saveDemoState({
        id: docId,
        title: existing?.title || "Untitled Document",
        content: markdown,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    [docId]
  );

  const handleSignupClick = () => {
    setSignupTrigger("manual");
    setShowSignup(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Demo header bar */}
      <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white">
            <BookOpen className="h-4 w-4 text-neutral-700" />
          </div>
          <span className="text-sm font-medium text-neutral-900">
            Knobase
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            Demo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/auth/login")}
            className="text-neutral-600"
          >
            <LogIn className="mr-1 h-3.5 w-3.5" />
            Log in
          </Button>
          <Button
            size="sm"
            onClick={handleSignupClick}
            className="bg-neutral-900 text-white hover:bg-neutral-800"
          >
            Save your work
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Demo info banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
        You&apos;re in demo mode — no account required. Try typing{" "}
        <kbd className="rounded border border-amber-300 bg-amber-100 px-1 py-0.5 font-mono text-[10px]">
          @claw
        </kbd>{" "}
        in the editor to see your AI teammate in action.
      </div>

      {/* Editor */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <TiptapEditor
          initialContent={content}
          onContentChange={handleContentChange}
          documentId={docId}
          documentTitle="Demo Document"
        />
      </main>

      {/* Signup prompt modal */}
      {showSignup && (
        <SignupPromptModal
          trigger={signupTrigger}
          onClose={() => setShowSignup(false)}
          onContinueEditing={() => setShowSignup(false)}
        />
      )}
    </div>
  );
}
