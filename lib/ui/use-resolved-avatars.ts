"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface AvatarSource {
  id: string;
  avatar_url: string | null;
}

function isFullUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Resolves avatar URLs for a list of items: full URLs pass through directly,
 * Supabase storage paths are downloaded and converted to blob URLs.
 * Returns a map of item id → resolved URL string.
 */
export function useResolvedAvatars(items: AvatarSource[]): Record<string, string> {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const newBlobUrls = new Set<string>();

    async function resolve() {
      const supabase = createClient();
      const result: Record<string, string> = {};

      await Promise.all(
        items.map(async (item) => {
          if (!item.avatar_url) return;

          if (isFullUrl(item.avatar_url)) {
            result[item.id] = item.avatar_url;
            return;
          }

          try {
            const { data, error } = await supabase.storage
              .from("avatars")
              .download(item.avatar_url);
            if (error || !data) return;
            const url = URL.createObjectURL(data);
            newBlobUrls.add(url);
            result[item.id] = url;
          } catch {
            // Storage download failed — fall back to initials
          }
        }),
      );

      if (cancelled) {
        newBlobUrls.forEach((u) => URL.revokeObjectURL(u));
        return;
      }

      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = newBlobUrls;
      setResolved(result);
    }

    resolve();
    return () => { cancelled = true; };
  }, [items]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current.clear();
    };
  }, []);

  return resolved;
}
