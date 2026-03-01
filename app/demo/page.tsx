"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  LogIn,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { DemoProvider, useDemo } from "@/lib/demo/context";
import { useDemoCTA } from "@/hooks/use-demo-cta";
import {
  saveDemoState,
  markDemoStarted,
} from "@/lib/demo/state";
import { SignupPromptModal } from "@/components/onboarding/signup-modal";

export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoPageContent />
    </DemoProvider>
  );
}

function DemoPageContent() {
  const router = useRouter();
  const demo = useDemo();
  const { showCTA, trigger, trackEdit, openCTA, dismissCTA } =
    useDemoCTA();

  // Also persist to localStorage for transfer-on-signup compatibility
  useEffect(() => {
    markDemoStarted();
  }, []);

  const handleContentChange = useCallback(
    (markdown: string) => {
      if (demo.currentDocument) {
        demo.updateDocumentContent(demo.currentDocument.id, markdown);
        trackEdit();

        // Also persist to localStorage so existing signup-transfer works
        saveDemoState({
          id: demo.currentDocument.id,
          title: demo.currentDocument.title,
          content: markdown,
          createdAt: demo.currentDocument.createdAt,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [demo, trackEdit]
  );

  const handleSignupClick = () => {
    openCTA("manual");
  };

  const currentDoc = demo.currentDocument;
  if (!currentDoc) return null;

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

          {/* Demo doc selector */}
          <span className="mx-1 text-neutral-300">|</span>
          <div className="flex items-center gap-1">
            {demo.documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => demo.setCurrentDocumentId(doc.id)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                  doc.id === currentDoc.id
                    ? "bg-neutral-100 text-neutral-900 font-medium"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                }`}
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {doc.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent typing indicator */}
          {demo.agentTyping && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              {demo.agentTyping.avatar} {demo.agentTyping.name} is thinking…
            </span>
          )}
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
          key={currentDoc.id}
          initialContent={currentDoc.content}
          onContentChange={handleContentChange}
          documentId={currentDoc.id}
          documentTitle={currentDoc.title}
        />
      </main>

      {/* Signup prompt modal */}
      {showCTA && (
        <SignupPromptModal
          trigger={trigger}
          onClose={dismissCTA}
          onContinueEditing={dismissCTA}
        />
      )}
    </div>
  );
}
