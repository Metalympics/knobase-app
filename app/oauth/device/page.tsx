"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

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

  const [userCode, setUserCode] = useState(searchParams.get("code") ?? "");
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
        const returnPath = userCode
          ? `/oauth/device?code=${encodeURIComponent(userCode)}`
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
  }, [router, userCode]);

  const formatCode = useCallback((raw: string) => {
    const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
    if (clean.length > 4) {
      return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
    return clean;
  }, []);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserCode(formatCode(e.target.value));
    setError(null);
  };

  const isCodeValid = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeValid || !userId) return;

    setStatus("loading");
    setError(null);

    const supabase = createClient();

    const { data: device, error: lookupErr } = await supabase
      .from("oauth_device_codes")
      .select("id, status, expires_at")
      .eq("user_code", userCode)
      .single();

    if (lookupErr || !device) {
      setStatus("error");
      setError("Invalid code. Please check and try again.");
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

    const { error: updateErr } = await supabase
      .from("oauth_device_codes")
      .update(updatePayload)
      .eq("id", device.id);

    if (updateErr) {
      setStatus("error");
      setError("Failed to authorize device. Please try again.");
      return;
    }

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
                htmlFor="user-code"
                className="text-sm font-medium text-neutral-700"
              >
                Device code
              </label>
              <Input
                id="user-code"
                type="text"
                placeholder="XXXX-XXXX"
                value={userCode}
                onChange={handleCodeChange}
                maxLength={9}
                className="h-11 border-neutral-200 bg-white text-center font-mono text-lg tracking-widest text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-300"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
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
