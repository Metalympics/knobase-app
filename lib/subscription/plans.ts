import type { PlanDefinition, PlanTier, PlanLimits } from "./types";

/**
 * Knobase Subscription Plans
 * 
 * IMPORTANT: Knobase does NOT provide AI services natively.
 * Plans are based on workspace resources (documents, agents, members).
 * AI capabilities come from external agents connected via MCP (OpenClaw, etc.).
 */

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    description: "For individuals getting started with AI collaboration",
    priceMonthly: 0,
    stripePriceId: null,
    limits: {
      maxDocuments: 50,
      maxAgents: 1,        // 1 external agent slot
      maxWorkspaceMembers: 1,
      aiRequestsPerMonth: Infinity, // Not applicable - external agents handle AI
      customAgents: false,
      prioritySupport: false,
      apiAccess: false,
      advancedAnalytics: false,
    },
    features: [
      "Up to 50 documents",
      "1 external agent slot",
      "Connect your own AI via OpenClaw",
      "Real-time collaboration",
      "Version history",
      "Markdown editor",
      "MCP server access",
    ],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    description: "For power users and small teams",
    priceMonthly: 12,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? null,
    limits: {
      maxDocuments: Infinity,
      maxAgents: 5,        // 5 external agent slots
      maxWorkspaceMembers: 10,
      aiRequestsPerMonth: Infinity, // Not applicable - external agents handle AI
      customAgents: true,
      prioritySupport: false,
      apiAccess: true,
      advancedAnalytics: false,
    },
    features: [
      "Unlimited documents",
      "Up to 5 external agents",
      "Bring your own AI (any provider)",
      "OpenClaw native integration",
      "API access (REST + MCP)",
      "10 workspace members",
      "Agent marketplace access",
      "Priority sync",
    ],
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "For organizations at scale",
    priceMonthly: 49,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? null,
    limits: {
      maxDocuments: Infinity,
      maxAgents: Infinity,
      maxWorkspaceMembers: Infinity,
      aiRequestsPerMonth: Infinity, // Not applicable - external agents handle AI
      customAgents: true,
      prioritySupport: true,
      apiAccess: true,
      advancedAnalytics: true,
    },
    features: [
      "Everything in Pro",
      "Unlimited external agents",
      "Unlimited workspace members",
      "Advanced workspace analytics",
      "Priority support",
      "Custom MCP integrations",
      "SSO (coming soon)",
      "Audit logs",
    ],
  },
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLANS[tier].limits;
}

export function getPlan(tier: PlanTier): PlanDefinition {
  return PLANS[tier];
}

/**
 * Note on AI:
 * 
 * Knobase does NOT run AI natively. The "AI agent slots" in plans refer to
 * how many external agents you can connect via MCP (OpenClaw, Claude Desktop, etc.).
 * 
 * Your AI usage depends on:
 * - Your OpenClaw configuration
 * - Your own AI provider credentials (OpenAI, Anthropic, etc.)
 * - How you set up your agents
 * 
 * Knobase just provides the workspace where those agents work.
 */
