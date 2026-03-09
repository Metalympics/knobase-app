"use client";

// ── Magic Link Verification Page ──
// Shown while the user waits for email / after clicking link without auto-redirect.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Mail, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function MagicLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      }
    >
      <MagicLinkContent />
    </Suspense>
  );
}

function MagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"waiting" | "verified" | "error">(
    "waiting"
  );
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state change (magic link auto-handling by Supabase)
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("verified");
        // Redirect after short delay
        const redirect = searchParams.get("redirect") || "/s/default";
        setTimeout(() => router.push(redirect), 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
            {status === "verified" ? (
              <BookOpen className="h-6 w-6 text-green-600" />
            ) : (
              <Mail className="h-6 w-6 text-neutral-700" />
            )}
          </div>

          {status === "verified" ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                You&apos;re in!
              </h1>
              <p className="text-sm text-neutral-500">
                Redirecting to your workspace...
              </p>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            </>
          ) : status === "error" ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Something went wrong
              </h1>
              <p className="text-sm text-red-500">
                {error || "The magic link may have expired. Please try again."}
              </p>
              <Link
                href="/auth/login"
                className="mt-4 flex items-center gap-1 text-sm text-neutral-600 underline hover:text-neutral-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to login
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Check your email
              </h1>
              <p className="text-sm text-neutral-500">
                We sent you a magic link. Click the link in your email to sign
                in.
              </p>
              <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
                Didn&apos;t get the email? Check your spam folder or{" "}
                <Link
                  href="/auth/login"
                  className="text-neutral-700 underline"
                >
                  try again
                </Link>
                .
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
