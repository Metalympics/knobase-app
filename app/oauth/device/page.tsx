"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const CODE_LENGTH = 8;
const VALID_CHAR = /^[A-Za-z0-9]$/;

function parseCodeToDigits(raw: string): string[] {
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, CODE_LENGTH);
  const digits = Array(CODE_LENGTH).fill("");
  for (let i = 0; i < clean.length; i++) {
    digits[i] = clean[i];
  }
  return digits;
}

function digitsToCode(digits: string[]): string {
  const joined = digits.join("");
  if (joined.length > 4) {
    return `${joined.slice(0, 4)}-${joined.slice(4)}`;
  }
  return joined;
}

interface DeviceCodeRecord {
  id: string;
  device_code: string;
  user_code: string;
  client_id: string;
  user_id: string | null;
  scope: string[];
  status: string;
  expires_at: string;
  interval: number;
  last_polled_at: string | null;
  access_token: string | null;
  created_at: string;
}

export default function DeviceVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      }
    >
      <DeviceVerificationContent />
    </Suspense>
  );
}

interface Workspace {
  id: string;
  name: string;
}

type Status = "idle" | "loading" | "success" | "error";

function DeviceVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [digits, setDigits] = useState<string[]>(() =>
    parseCodeToDigits(searchParams.get("code") ?? ""),
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;

      if (!session?.user) {
        const codeStr = digitsToCode(digits);
        const returnPath = codeStr
          ? `/oauth/device?code=${encodeURIComponent(codeStr)}`
          : "/oauth/device";
        router.push(`/auth/login?redirect=${encodeURIComponent(returnPath)}`);
        return;
      }

      setUserId(session.user.id);

      const { data: userRows } = await supabase
        .from("users")
        .select("school_id")
        .eq("auth_id", session.user.id)
        .not("school_id", "is", null);

      if (cancelled) return;

      const schoolIds = [
        ...new Set(
          (userRows ?? [])
            .map((u) => u.school_id)
            .filter((id): id is string => !!id),
        ),
      ];

      if (schoolIds.length > 0) {
        const { data: schools } = await supabase
          .from("schools")
          .select("id, name")
          .in("id", schoolIds);

        if (!cancelled && schools) {
          setWorkspaces(schools);
          if (schools.length === 1) {
            setSelectedWorkspace(schools[0].id);
          }
        }
      }

      if (!cancelled) setAuthLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router, digits]);

  useEffect(() => {
    if (!authLoading && status !== "success") {
      inputRefs.current[0]?.focus();
    }
  }, [authLoading, status]);

  const updateDigit = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value.toUpperCase().replace(/[^A-Z0-9]/, "") || "";
    setDigits(next);
    setError(null);
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      setError(null);
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, CODE_LENGTH);
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    setError(null);
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const userCode = digitsToCode(digits);
  const isCodeValid = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeValid || !userId) return;

    setStatus("loading");
    setError(null);

    const supabase = createClient();

    console.log("[OAuth Device] Looking up code:", userCode);

    // Use limit(1) instead of single()/maybeSingle() to avoid 406 when no rows
    const { data: rows, error: lookupErr } = await (supabase
      .from("oauth_device_codes") as any)
      .select("id, status, expires_at")
      .eq("user_code", userCode)
      .limit(1);

    const device = (rows as DeviceCodeRecord[] | null)?.[0] ?? null;

    if (lookupErr) {
      console.error("[OAuth Device] Lookup error:", {
        code: lookupErr.code,
        message: lookupErr.message,
        details: lookupErr.details,
        status: (lookupErr as { status?: number })?.status,
      });
    }
    if (!device) {
      console.log("[OAuth Device] No device found for code:", userCode, "(rows:", rows?.length ?? 0, ")");
    }

    if (lookupErr || !device) {
      setStatus("error");
      const isSetupError =
        lookupErr?.code === "PGRST301" ||
        lookupErr?.message?.includes("404") ||
        lookupErr?.message?.includes("does not exist") ||
        lookupErr?.message?.includes("relation");
      setError(
        isSetupError
          ? "Device authorization is not set up. Please run database migrations (e.g. supabase db push) or contact support."
          : "Invalid code. Please check and try again."
      );
      return;
    }

    if (new Date(device.expires_at) < new Date()) {
      setStatus("error");
      setError("This code has expired. Please request a new one from the CLI.");
      return;
    }

    if (device.status !== "pending") {
      setStatus("error");
      setError("This code has already been used.");
      return;
    }

    const updatePayload: Record<string, string> = { user_id: userId };
    if (selectedWorkspace) {
      updatePayload.school_id = selectedWorkspace;
    }

    const { error: updateErr } = await (supabase
      .from("oauth_device_codes") as any)
      .update(updatePayload)
      .eq("id", device.id);

    if (updateErr) {
      console.error("[OAuth Device] Update error:", {
        code: updateErr.code,
        message: updateErr.message,
        details: updateErr.details,
      });
      setStatus("error");
      setError("Failed to authorize device. Please try again.");
      return;
    }

    console.log("[OAuth Device] Authorization successful");

    setStatus("success");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
            <BookOpen className="h-6 w-6 text-neutral-700" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
            Authorize device
          </h1>
          <p className="text-center text-sm text-neutral-500">
            Enter the code shown on your device to connect it to your Knobase
            account.
          </p>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              Device authorized
            </p>
            <p className="text-xs text-green-600">
              You can close this page and return to your device.
            </p>
          </div>
        ) : (
          <form onSubmit={handleAuthorize} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="code-0"
                className="text-sm font-medium text-neutral-700"
              >
                Device code
              </label>
              <div
                className="flex items-center justify-center gap-2"
                role="group"
                aria-label="Device code"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span key={i} className="flex items-center gap-2">
                    <input
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      id={i === 0 ? "code-0" : undefined}
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      value={digits[i]}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.length <= 1) updateDigit(i, v.slice(-1));
                      }}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      autoComplete="off"
                      spellCheck={false}
                      autoFocus={i === 0}
                      className={cn(
                        "h-12 w-12 rounded-lg border border-neutral-200 bg-white text-center font-mono text-xl font-semibold text-neutral-900 transition-colors",
                        "focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:ring-offset-0",
                        "placeholder:text-neutral-300",
                        i === 4 && "ml-1",
                      )}
                      placeholder=""
                      aria-label={`Character ${i + 1} of 8`}
                    />
                    {i === 3 && (
                      <span
                        className="text-lg font-medium text-neutral-400"
                        aria-hidden
                      >
                        –
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {workspaces.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="workspace"
                  className="text-sm font-medium text-neutral-700"
                >
                  Workspace
                </label>
                <Select
                  value={selectedWorkspace}
                  onValueChange={setSelectedWorkspace}
                >
                  <SelectTrigger className="h-11 w-full border-neutral-200 bg-white text-neutral-900 focus-visible:ring-neutral-300">
                    <SelectValue placeholder="Select a workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={
                !isCodeValid ||
                status === "loading" ||
                (workspaces.length > 1 && !selectedWorkspace)
              }
              className="h-11 bg-neutral-900 text-white hover:bg-neutral-800"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Authorizing...
                </span>
              ) : (
                "Authorize"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
