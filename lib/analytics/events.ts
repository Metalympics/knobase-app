type EventProperties = Record<string, string | number | boolean | undefined>;

// ── GA4 helpers ──────────────────────────────────────────────────────────────

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(args);
}

export function trackGA4Event(name: string, params?: EventProperties) {
  gtag("event", name, params);
}

// ── PostHog helpers ──────────────────────────────────────────────────────────

function getPostHog() {
  if (typeof window === "undefined") return null;
  try {
    // Dynamic import already initialized in provider; grab the default instance
    const { default: posthog } = require("posthog-js");
    return posthog;
  } catch {
    return null;
  }
}

export function trackPostHogEvent(name: string, props?: EventProperties) {
  getPostHog()?.capture(name, props);
}

// ── Unified track ────────────────────────────────────────────────────────────

export function track(name: string, props?: EventProperties) {
  trackGA4Event(name, props);
  trackPostHogEvent(name, props);
}

// ── Pre-defined Knobase events ───────────────────────────────────────────────

export const analytics = {
  signup: (method?: string) =>
    track("signup", { method: method ?? "email" }),

  documentCreated: (docId: string, templateUsed?: boolean) =>
    track("document_created", { doc_id: docId, template_used: templateUsed }),

  agentUsed: (agentId: string, action: string) =>
    track("agent_used", { agent_id: agentId, action }),

  upgradeClicked: (plan: string, source: string) =>
    track("upgrade_clicked", { plan, source }),

  pageView: (path: string) =>
    track("page_view", { path }),

  featureUsed: (feature: string, detail?: string) =>
    track("feature_used", { feature, detail }),
};
