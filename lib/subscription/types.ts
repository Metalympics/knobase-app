export type PlanTier = "free" | "pro" | "enterprise";

export interface PlanLimits {
  maxDocuments: number;
  maxAgents: number;
  maxWorkspaceMembers: number;
  aiRequestsPerMonth: number;
  customAgents: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  stripePriceId: string | null;
  limits: PlanLimits;
  features: string[];
}

export interface Subscription {
  id: string;
  workspaceId: string;
  tier: PlanTier;
  status: "active" | "canceled" | "past_due" | "trialing";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageRecord {
  workspaceId: string;
  documentCount: number;
  agentCount: number;
  aiRequestsThisMonth: number;
  lastUpdated: string;
}
