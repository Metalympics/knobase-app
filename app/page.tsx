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
        // Authenticated → fetch user's school and redirect
        const { data: userData } = await supabase
          .from("users")
          .select("school_id")
          .eq("id", user.id)
          .single();
        
        const schoolId = userData?.school_id || "default";
        router.replace(`/s/${schoolId}`);
        return;
      }

      // Not authenticated → send to login
      router.replace("/auth/login");
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
