"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const workspace = localStorage.getItem("knobase-app:workspace");
    if (workspace) {
      router.replace("/knowledge");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
    </div>
  );
}
