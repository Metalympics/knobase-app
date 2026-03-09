"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>

      <div className="text-center">
        <h1 className="text-xl font-semibold text-neutral-900">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          An unexpected error occurred. You can try again, or return to the
          dashboard.
        </p>
        {error.message && (
          <p className="mt-3 max-w-md rounded-md bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-600">
            {error.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={reset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
        <Link href="/s/default">
          <Button className="gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800">
            <Home className="h-3.5 w-3.5" />
            Go to dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
