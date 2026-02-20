import type { PlanDefinition, PlanTier, PlanLimits } from "./types";

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    description: "For individuals getting started",
    priceMonthly: 0,
    stripePriceId: null,
    limits: {
      maxDocuments: 50,
      maxAgents: 1,
      maxWorkspaceMembers: 1,
      aiRequestsPerMonth: 100,
      customAgents: false,
      prioritySupport: false,
      apiAccess: false,
      advancedAnalytics: false,
    },
    features: [
      "Up to 50 documents",
      "1 AI agent (Claw)",
      "Basic search",
      "Markdown editor",
      "Version history",
      "100 AI requests/month",
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
      maxAgents: 5,
      maxWorkspaceMembers: 10,
      aiRequestsPerMonth: 5000,
      customAgents: true,
      prioritySupport: false,
      apiAccess: true,
      advancedAnalytics: false,
    },
    features: [
      "Unlimited documents",
      "Up to 5 AI agents",
      "Custom agents from Marketplace",
      "API access",
      "10 workspace members",
      "5,000 AI requests/month",
      "Priority search",
      "OpenClaw integration",
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
      aiRequestsPerMonth: Infinity,
      customAgents: true,
      prioritySupport: true,
      apiAccess: true,
      advancedAnalytics: true,
    },
    features: [
      "Everything in Pro",
      "Unlimited AI agents",
      "Unlimited workspace members",
      "Unlimited AI requests",
      "Advanced analytics",
      "Priority support",
      "Custom integrations",
      "SSO (coming soon)",
    ],
  },
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLANS[tier].limits;
}

export function getPlan(tier: PlanTier): PlanDefinition {
  return PLANS[tier];
}
