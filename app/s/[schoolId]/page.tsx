"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SchoolPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.schoolId as string;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchool() {
      try {
        const supabase = createClient();
        
        // Get authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        // Get user's public profile
        const { data: publicUser } = await supabase
          .from("users")
          .select("id, school_id")
          .eq("auth_id", user.id)
          .single();

        if (!publicUser) {
          router.replace("/onboarding");
          return;
        }

        // Handle "default" - redirect to user's actual school
        if (schoolId === "default") {
          if (publicUser.school_id) {
            router.replace(`/s/${publicUser.school_id}`);
            return;
          } else {
            // No school assigned, send to onboarding
            router.replace("/onboarding");
            return;
          }
        }

        // Verify user has access to this school
        if (publicUser.school_id !== schoolId) {
          router.replace(`/s/${publicUser.school_id || "default"}`);
          return;
        }

        // Get documents for this school
        const { data: documents } = await supabase
          .from("documents")
          .select("id, title, created_at, updated_at")
          .eq("school_id", schoolId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (documents && documents.length > 0) {
          // Redirect to most recent document
          router.replace(`/d/${documents[0].id}`);
        } else {
          // No documents, create one
          const { data: newDoc, error } = await supabase
            .from("documents")
            .insert({
              title: "Untitled",
              content: "",
              school_id: schoolId,
              created_by: publicUser.id,
              visibility: "private",
            })
            .select("id")
            .single();

          if (newDoc) {
            router.replace(`/d/${newDoc.id}`);
          } else {
            console.error("Failed to create document:", error);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Failed to load school:", error);
        router.replace("/auth/login");
      }
    }

    loadSchool();
  }, [schoolId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-500">Loading your school...</p>
      </div>
    </div>
  );
}
