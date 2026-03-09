"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, ArrowLeft, Sparkles, Shield, Users, Zap, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const fromDemo = searchParams.get("source") === "demo";

  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignup = async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-blue-600/20 via-cyan-600/20 to-teal-600/20 blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-orange-600/15 via-pink-600/15 to-rose-600/15 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Floating agent avatars */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {[
          { src: "/avatar-sarah.svg", delay: 0, x: "10%", y: "20%" },
          { src: "/avatar-alex.svg", delay: 2, x: "85%", y: "15%" },
          { src: "/designer.svg", delay: 4, x: "15%", y: "75%" },
          { src: "/data-analyst.svg", delay: 1, x: "80%", y: "70%" },
        ].map((avatar, i) => (
          <motion.div
            key={i}
            className="absolute h-16 w-16"
            style={{ left: avatar.x, top: avatar.y }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: avatar.delay,
            }}
          >
            <Image
              src={avatar.src}
              alt=""
              width={64}
              height={64}
              className="h-full w-full rounded-full border border-white/10 bg-neutral-900/50 backdrop-blur-sm"
            />
          </motion.div>
        ))}
      </div>

      {/* Main content - Split screen on desktop */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col lg:flex-row">
        {/* Left side - Marketing content */}
        <motion.div
          className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                <span>Join 1,000+ teams building with AI</span>
              </div>
              <h1 className="mb-4 text-5xl font-bold leading-tight tracking-tight text-white">
                Your AI-powered workspace
              </h1>
              <p className="text-xl leading-relaxed text-neutral-300">
                Collaborate with intelligent agents that understand your work and help you achieve more.
              </p>
            </motion.div>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {[
                { icon: Zap, text: "Deploy AI agents in seconds, not weeks" },
                { icon: Shield, text: "Enterprise-grade security and privacy" },
                { icon: Users, text: "Real-time collaboration with your team" },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <div className="mt-0.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-2">
                    <feature.icon className="h-5 w-5 text-violet-300" />
                  </div>
                  <p className="text-lg text-neutral-200">{feature.text}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="space-y-3 border-l-2 border-violet-500/30 pl-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-sm italic text-neutral-400">
                "Knobase transformed how our team works with AI. Setup took minutes, not months."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                <div>
                  <p className="text-sm font-medium text-white">Sarah Chen</p>
                  <p className="text-xs text-neutral-400">Head of Engineering, TechCorp</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right side - Signup form */}
        <motion.div
          className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="w-full max-w-md">
            {/* Mobile-only header */}
            <motion.div
              className="mb-8 lg:hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" />
                <span>Join 1,000+ teams</span>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-2xl backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Logo & Title */}
              <div className="mb-8 text-center">
                <motion.div
                  className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/50"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <BookOpen className="h-7 w-7 text-white" />
                </motion.div>
                <h2 className="mb-2 text-2xl font-bold text-white">Create your account</h2>
                <p className="text-sm text-neutral-400">
                  Start building with AI agents today
                </p>
              </div>

              <AnimatePresence mode="wait">
                {magicLinkSent ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4 text-center"
                  >
                    <motion.div
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle2 className="h-8 w-8 text-green-400" />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">Check your inbox</h3>
                      <p className="text-sm text-neutral-300">
                        We sent a magic link to
                      </p>
                      <p className="font-medium text-violet-400">{email}</p>
                      <p className="text-xs text-neutral-400">
                        Click the link to complete your signup
                      </p>
                    </div>
                    <motion.button
                      onClick={() => setMagicLinkSent(false)}
                      className="text-sm text-violet-400 hover:text-violet-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Use a different email →
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        variant="outline"
                        className="h-12 w-full justify-center gap-3 border-neutral-700 bg-white text-neutral-900 hover:bg-neutral-50 hover:shadow-lg hover:shadow-white/10"
                        onClick={handleGoogleSignup}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                        <span className="font-medium">Continue with Google</span>
                      </Button>
                    </motion.div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-neutral-700" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-neutral-900 px-3 text-neutral-500">or use email</span>
                      </div>
                    </div>

                    <form onSubmit={handleMagicLink} className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 border-neutral-700 bg-neutral-800/50 pl-10 text-white placeholder:text-neutral-500 focus-visible:border-violet-500 focus-visible:ring-violet-500/20"
                          autoFocus
                        />
                      </div>
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Button
                          type="submit"
                          disabled={isLoading || !email.trim()}
                          className="h-12 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 font-medium text-white shadow-lg shadow-violet-500/30 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <motion.span
                                className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Sending magic link...
                            </span>
                          ) : (
                            "Continue with Email"
                          )}
                        </Button>
                      </motion.div>
                    </form>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-center text-sm text-red-400"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <motion.div
                className="mt-6 space-y-3 text-center text-xs text-neutral-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p>
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="font-medium text-violet-400 hover:text-violet-300"
                  >
                    Log in
                  </Link>
                </p>
                {fromDemo && (
                  <Link
                    href="/demo"
                    className="flex items-center justify-center gap-1 text-neutral-500 hover:text-neutral-400"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to demo
                  </Link>
                )}
                <p className="pt-2">
                  By signing up, you agree to our{" "}
                  <Link href="/tos" className="underline hover:text-neutral-400">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline hover:text-neutral-400">
                    Privacy Policy
                  </Link>
                </p>
              </motion.div>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>GDPR Ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>256-bit Encryption</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
