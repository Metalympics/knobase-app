import type { Subscription, UsageRecord, PlanTier } from "./types";
import { getPlanLimits } from "./plans";
import { listDocuments } from "@/lib/documents/store";
import { listAgents } from "@/lib/agents/store";

const LS_PREFIX = "knobase-app:";
const SUBSCRIPTION_KEY = `${LS_PREFIX}subscription`;
const USAGE_KEY = `${LS_PREFIX}usage`;

function readSubscription(workspaceId: string): Subscription | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${SUBSCRIPTION_KEY}:${workspaceId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSubscription(sub: Subscription): void {
  localStorage.setItem(`${SUBSCRIPTION_KEY}:${sub.workspaceId}`, JSON.stringify(sub));
}

function readUsage(workspaceId: string): UsageRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${USAGE_KEY}:${workspaceId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeUsage(usage: UsageRecord): void {
  localStorage.setItem(`${USAGE_KEY}:${usage.workspaceId}`, JSON.stringify(usage));
}

export function getSubscription(workspaceId: string): Subscription {
  const existing = readSubscription(workspaceId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 100);

  const freeSub: Subscription = {
    id: crypto.randomUUID(),
    workspaceId,
    tier: "free",
    status: "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: now,
    currentPeriodEnd: endDate.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  };

  writeSubscription(freeSub);
  return freeSub;
}

export function updateSubscriptionTier(workspaceId: string, tier: PlanTier, stripeIds?: { customerId: string; subscriptionId: string }): Subscription {
  const sub = getSubscription(workspaceId);
  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  sub.tier = tier;
  sub.status = "active";
  sub.updatedAt = now.toISOString();
  sub.currentPeriodStart = now.toISOString();
  sub.currentPeriodEnd = periodEnd.toISOString();
  sub.cancelAtPeriodEnd = false;

  if (stripeIds) {
    sub.stripeCustomerId = stripeIds.customerId;
    sub.stripeSubscriptionId = stripeIds.subscriptionId;
  }

  writeSubscription(sub);
  return sub;
}

export function cancelSubscription(workspaceId: string): Subscription {
  const sub = getSubscription(workspaceId);
  sub.cancelAtPeriodEnd = true;
  sub.updatedAt = new Date().toISOString();
  writeSubscription(sub);
  return sub;
}

export function getUsage(workspaceId: string): UsageRecord {
  const existing = readUsage(workspaceId);
  if (existing) return existing;

  const usage: UsageRecord = {
    workspaceId,
    documentCount: listDocuments().length,
    agentCount: listAgents().length,
    aiRequestsThisMonth: 0,
    lastUpdated: new Date().toISOString(),
  };

  writeUsage(usage);
  return usage;
}

export function refreshUsage(workspaceId: string): UsageRecord {
  const usage = getUsage(workspaceId);
  usage.documentCount = listDocuments().length;
  usage.agentCount = listAgents().length;
  usage.lastUpdated = new Date().toISOString();
  writeUsage(usage);
  return usage;
}

export function incrementAiRequests(workspaceId: string): UsageRecord {
  const usage = getUsage(workspaceId);
  usage.aiRequestsThisMonth += 1;
  usage.lastUpdated = new Date().toISOString();
  writeUsage(usage);
  return usage;
}

export function canCreateDocument(workspaceId: string): boolean {
  const sub = getSubscription(workspaceId);
  const limits = getPlanLimits(sub.tier);
  const usage = refreshUsage(workspaceId);
  return usage.documentCount < limits.maxDocuments;
}

export function canCreateAgent(workspaceId: string): boolean {
  const sub = getSubscription(workspaceId);
  const limits = getPlanLimits(sub.tier);
  const usage = refreshUsage(workspaceId);
  return usage.agentCount < limits.maxAgents;
}

export function canMakeAiRequest(workspaceId: string): boolean {
  const sub = getSubscription(workspaceId);
  const limits = getPlanLimits(sub.tier);
  const usage = getUsage(workspaceId);
  return usage.aiRequestsThisMonth < limits.aiRequestsPerMonth;
}

export function getDocumentLimitInfo(workspaceId: string): { current: number; max: number; percentage: number; isAtLimit: boolean } {
  const sub = getSubscription(workspaceId);
  const limits = getPlanLimits(sub.tier);
  const usage = refreshUsage(workspaceId);
  const max = limits.maxDocuments === Infinity ? Infinity : limits.maxDocuments;
  const percentage = max === Infinity ? 0 : (usage.documentCount / max) * 100;
  return {
    current: usage.documentCount,
    max,
    percentage: Math.min(percentage, 100),
    isAtLimit: usage.documentCount >= max,
  };
}

export function getAgentLimitInfo(workspaceId: string): { current: number; max: number; isAtLimit: boolean } {
  const sub = getSubscription(workspaceId);
  const limits = getPlanLimits(sub.tier);
  const usage = refreshUsage(workspaceId);
  const max = limits.maxAgents === Infinity ? Infinity : limits.maxAgents;
  return {
    current: usage.agentCount,
    max,
    isAtLimit: usage.agentCount >= max,
  };
}
