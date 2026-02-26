"use client";

// ── Signup Prompt Modal ──
// Soft signup prompt shown during demo mode.
// Triggers: exit intent, 5-minute timer, manual "Save" click, share attempt.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Shield, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface SignupPromptModalProps {
  trigger: string;
  onClose: () => void;
  onContinueEditing: () => void;
}

const TRIGGER_COPY: Record<string, { title: string; subtitle: string }> = {
  exit: {
    title: "Don\u2019t lose your work!",
    subtitle:
      "You\u2019ve been creating something great. Sign up free to save it.",
  },
  time: {
    title: "Save your progress",
    subtitle:
      "You\u2019ve been editing for a while. Create a free account to keep everything.",
  },
  save: {
    title: "Save your document",
    subtitle:
      "Create a free account to save your work and access it from anywhere.",
  },
  share: {
    title: "Share your work",
    subtitle:
      "Sign up free to get a shareable link for this document.",
  },
  manual: {
    title: "Keep your work forever",
    subtitle:
      "Create a free account to save, share, and collaborate with AI agents.",
  },
};

export function SignupPromptModal({
  trigger,
  onClose,
  onContinueEditing,
}: SignupPromptModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = TRIGGER_COPY[trigger] || TRIGGER_COPY.manual;

  const handleGoogleSignup = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?source=demo`,
      },
    });
    if (error) setError(error.message);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?source=demo`,
      },
    });

    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X className="h-4 w-4" />
        </button>

        {magicLinkSent ? (
          /* Magic link sent confirmation */
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">
              Check your email
            </h2>
            <p className="text-sm text-neutral-500">
              We sent a magic link to{" "}
              <span className="font-medium text-neutral-700">{email}</span>.
              Click the link to save your work and create your account.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-neutral-500"
              onClick={onContinueEditing}
            >
              Continue editing while you wait
            </Button>
          </div>
        ) : (
          /* Signup form */
          <>
            <div className="mb-5 text-center">
              <h2 className="text-xl font-semibold text-neutral-900">
                {copy.title}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">{copy.subtitle}</p>
            </div>

            {/* Google OAuth */}
            <Button
              variant="outline"
              className="mb-3 h-11 w-full justify-center gap-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              onClick={handleGoogleSignup}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-neutral-400">
                  or use email
                </span>
              </div>
            </div>

            {/* Magic link form */}
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-300"
                autoFocus
              />
              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="h-11 bg-neutral-900 text-white hover:bg-neutral-800"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending...
                  </span>
                ) : (
                  "Email me a magic link"
                )}
              </Button>
            </form>

            {error && (
              <p className="mt-3 text-center text-xs text-red-500">{error}</p>
            )}

            {/* Continue without saving */}
            <button
              onClick={onContinueEditing}
              className="mt-4 w-full text-center text-xs text-neutral-400 hover:text-neutral-600"
            >
              Keep editing without saving
            </button>

            {/* Trust badges */}
            <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" /> Free forever
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> No credit card
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Instant setup
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
