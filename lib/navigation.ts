// ── URL Navigation Helpers ──
// Dual URL strategy: /d/[id] (universal/shareable) and /w/[workspaceId]/d/[id] (contextual/sidebar)

const APP_ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "https://app.knobase.com";

/**
 * Universal shareable link — works for everyone, no workspace context.
 * Use for: copy-to-clipboard, emails, external sharing.
 */
export function getShareableLink(docId: string): string {
  return `${APP_ORIGIN}/d/${docId}`;
}

/**
 * Contextual internal link — preserves workspace sidebar and navigation.
 * Use for: in-app navigation, sidebar links, breadcrumbs.
 */
export function getInternalLink(
  docId: string,
  workspaceId: string
): string {
  return `/w/${workspaceId}/d/${docId}`;
}

/**
 * Workspace home link.
 */
export function getWorkspaceLink(workspaceId: string): string {
  return `/w/${workspaceId}`;
}

/**
 * Demo page link (no auth required).
 */
export function getDemoLink(): string {
  return `/demo`;
}

/**
 * Signup link from the demo page.
 */
export function getSignupWithDemoLink(): string {
  return `/auth/signup?source=demo`;
}

/**
 * Login link, optionally with redirect.
 */
export function getLoginLink(redirect?: string): string {
  const base = "/auth/login";
  if (redirect) return `${base}?redirect=${encodeURIComponent(redirect)}`;
  return base;
}

/**
 * Determine if a URL pattern is the universal (/d/) or contextual (/w/) form.
 */
export function parseDocumentUrl(pathname: string): {
  docId: string | null;
  workspaceId: string | null;
  mode: "universal" | "contextual" | "unknown";
} {
  // /w/[workspaceId]/d/[docId]
  const contextual = pathname.match(/^\/w\/([^/]+)\/d\/(.+)$/);
  if (contextual) {
    return {
      workspaceId: contextual[1],
      docId: contextual[2],
      mode: "contextual",
    };
  }

  // /d/[docId]
  const universal = pathname.match(/^\/d\/(.+)$/);
  if (universal) {
    return { workspaceId: null, docId: universal[1], mode: "universal" };
  }

  return { workspaceId: null, docId: null, mode: "unknown" };
}
