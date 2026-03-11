"use client";

import { useState, Suspense, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

type LoginMode = "password" | "magic-link";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<LoginMode>("password");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveWorkspaceRedirect = useCallback(
    async (supabase: ReturnType<typeof createClient>, authId: string) => {
      const { data: authProfile } = await supabase
        .from("auth_profiles")
        .select("last_active_school_id")
        .eq("auth_id", authId)
        .single();

      if (authProfile?.last_active_school_id) {
        return redirect || `/s/${authProfile.last_active_school_id}`;
      }

      const { data: users } = await supabase
        .from("users")
        .select("school_id")
        .eq("auth_id", authId)
        .not("school_id", "is", null)
        .limit(1);

      if (users && users.length > 0) {
        return redirect || `/s/${users[0].school_id}`;
      }

      return "/onboarding";
    },
    [redirect]
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        resolveWorkspaceRedirect(supabase, session.user.id).then((path) => {
          if (!cancelled) router.push(path);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, resolveWorkspaceRedirect]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      setIsSubmitting(false);
      if (signInError.message.includes("Invalid login credentials")) {
        setError("Invalid email or password.");
      } else if (signInError.message.includes("rate limit")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(signInError.message);
      }
      return;
    }

    if (data.user) {
      const path = await resolveWorkspaceRedirect(supabase, data.user.id);
      router.push(path);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const callbackUrl = redirect
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
      : `${window.location.origin}/auth/callback`;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl },
    });

    setIsSubmitting(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const callbackUrl = redirect
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
      : `${window.location.origin}/auth/callback`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (oauthError) setError(oauthError.message);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
            <BookOpen className="h-6 w-6 text-neutral-700" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
            Welcome back
          </h1>
          <p className="text-sm text-neutral-500">
            Log in to your Knobase account.
          </p>
        </div>

        {magicLinkSent ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <p className="text-sm font-medium text-green-800">
              Check your email
            </p>
            <p className="text-xs text-green-600">
              We sent a login link to{" "}
              <span className="font-medium">{email}</span>. Click it to sign in.
            </p>
            <button
              onClick={() => {
                setMagicLinkSent(false);
                setError(null);
              }}
              className="mt-2 text-xs text-green-600 underline hover:text-green-800"
            >
              Try a different method
            </button>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <Button
              variant="outline"
              className="mb-3 h-11 w-full justify-center gap-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              onClick={handleGoogleLogin}
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

            {mode === "password" ? (
              <form
                onSubmit={handlePasswordLogin}
                className="flex flex-col gap-3"
              >
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-300"
                  autoFocus
                  autoComplete="email"
                />
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-neutral-200 bg-white pr-10 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-300"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim() || !password}
                  className="h-11 bg-neutral-900 text-white hover:bg-neutral-800"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("magic-link");
                    setError(null);
                  }}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  Use a magic link instead
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleMagicLink}
                className="flex flex-col gap-3"
              >
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-300"
                  autoFocus
                  autoComplete="email"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="h-11 bg-neutral-900 text-white hover:bg-neutral-800"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending...
                    </span>
                  ) : (
                    "Email me a login link"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("password");
                    setError(null);
                  }}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  Use password instead
                </button>
              </form>
            )}

            {error && (
              <p className="mt-3 text-center text-xs text-red-500">{error}</p>
            )}
          </>
        )}

        {/* Footer links */}
        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-neutral-400">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-neutral-600 underline hover:text-neutral-900"
            >
              Sign up free
            </Link>
          </p>
          <p>
            Just exploring?{" "}
            <Link
              href="/demo"
              className="text-neutral-600 underline hover:text-neutral-900"
            >
              Try the demo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
