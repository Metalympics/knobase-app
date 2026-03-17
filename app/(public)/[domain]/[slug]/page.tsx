"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { BookOpen, FileText, Loader2, ChevronRight } from "lucide-react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import Link from "next/link";

interface PublicPage {
  id: string;
  title: string;
  content_md: string;
  updated_at: string;
}

interface SidebarPage {
  id: string;
  title: string;
  public_slug: string;
  updated_at: string;
}

interface Workspace {
  id: string;
  name: string;
}

type PageStatus = "loading" | "found" | "not-found" | "domain-not-found";

export default function PublicDocsPage() {
  const params = useParams();
  const domain = decodeURIComponent(params.domain as string);
  const slug = params.slug as string;

  const [status, setStatus] = useState<PageStatus>("loading");
  const [page, setPage] = useState<PublicPage | null>(null);
  const [sidebarPages, setSidebarPages] = useState<SidebarPage[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchPage = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/pages?slug=${encodeURIComponent(slug)}&domain=${encodeURIComponent(domain)}`,
      );

      if (res.status === 404) {
        const body = await res.json();
        if (body.error?.includes("Workspace not found")) {
          setStatus("domain-not-found");
        } else {
          setStatus("not-found");
        }
        return;
      }

      if (!res.ok) {
        setStatus("not-found");
        return;
      }

      const data = await res.json();
      setPage({
        id: data.id,
        title: data.title,
        content_md: data.content_md,
        updated_at: data.updated_at,
      });
      if (data.workspace) setWorkspace(data.workspace);
      setStatus("found");
    } catch {
      setStatus("not-found");
    }
  }, [slug, domain]);

  const fetchSidebar = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/pages?domain=${encodeURIComponent(domain)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.pages) setSidebarPages(data.pages);
      if (data.workspace) setWorkspace(data.workspace);
    } catch {
      // Sidebar is non-critical
    }
  }, [domain]);

  useEffect(() => {
    fetchPage();
    fetchSidebar();
  }, [fetchPage, fetchSidebar]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (status === "domain-not-found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
          <BookOpen className="h-6 w-6 text-neutral-400" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Site not found
        </h1>
        <p className="max-w-sm text-center text-sm text-neutral-500">
          No documentation site is configured for <strong>{domain}</strong>.
          Check the URL or contact the site owner.
        </p>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
          <FileText className="h-6 w-6 text-neutral-400" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Page not found
        </h1>
        <p className="max-w-sm text-center text-sm text-neutral-500">
          The page <strong>{slug}</strong> doesn&apos;t exist or isn&apos;t
          published yet.
        </p>
        {sidebarPages.length > 0 && (
          <Link
            href={`/${domain}/${sidebarPages[0].public_slug}`}
            className="mt-2 text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-900"
          >
            Go to docs home
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white transition-colors hover:bg-neutral-50"
            aria-label="Toggle sidebar"
          >
            <BookOpen className="h-4 w-4 text-neutral-700" />
          </button>
          <span className="text-sm font-semibold text-neutral-900">
            {workspace?.name ?? domain}
          </span>
          {page && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />
              <span className="text-sm text-neutral-500">{page.title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
            Public
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && sidebarPages.length > 0 && (
          <nav className="w-60 shrink-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50/50 p-3">
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Pages
            </p>
            <ul className="space-y-0.5">
              {sidebarPages.map((sp) => {
                const isActive = sp.public_slug === slug;
                return (
                  <li key={sp.id}>
                    <Link
                      href={`/${domain}/${sp.public_slug}`}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-neutral-200/70 font-medium text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="truncate">{sp.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-8">
            {page && (
              <>
                <h1 className="mb-6 text-3xl font-bold tracking-tight text-neutral-900">
                  {page.title}
                </h1>
                <TiptapEditor
                  initialContent={page.content_md}
                  documentId={page.id}
                  documentTitle={page.title}
                  readOnly
                />
                <footer className="mt-12 border-t border-neutral-100 pt-4 text-xs text-neutral-400">
                  Last updated{" "}
                  {new Date(page.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </footer>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
