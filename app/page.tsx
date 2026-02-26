"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function resolve() {
      // Check Supabase auth first
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Authenticated → go to main knowledge dashboard
        router.replace("/knowledge");
        return;
      }

      // Not authenticated — check for legacy localStorage onboarding
      const workspace = localStorage.getItem("knobase-app:workspace");
      if (workspace) {
        router.replace("/knowledge");
      } else {
        // Not onboarded → send to demo (zero-friction)
        router.replace("/demo");
      }
      setChecking(false);
    }
    resolve();
  }, [router]);

  if (!checking) return null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
    </div>
  );
}
