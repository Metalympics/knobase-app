import type { PlanTier } from "./types";
import { PLANS, getPlanLimits } from "./plans";
import {
  getSubscription,
  updateSubscriptionTier,
  refreshUsage,
  canCreateDocument,
  canCreateAgent,
  getDocumentLimitInfo,
  getAgentLimitInfo,
} from "./store";
import { getActiveWorkspaceId, getOrCreateDefaultWorkspace } from "@/lib/schools/store";

function resolveWorkspaceId(): string {
  return getActiveWorkspaceId() ?? getOrCreateDefaultWorkspace().id;
}

export function getCurrentPlan() {
  const wsId = resolveWorkspaceId();
  const sub = getSubscription(wsId);
  const plan = PLANS[sub.tier];
  const usage = refreshUsage(wsId);

  return {
    tier: sub.tier,
    name: plan.name,
    priceMonthly: plan.priceMonthly,
    limits: plan.limits,
    features: plan.features,
    usage: {
      documents: usage.documentCount,
      agents: usage.agentCount,
    },
  };
}

export function setPlan(tier: PlanTier): { success: boolean; tier: PlanTier } {
  const wsId = resolveWorkspaceId();
  const sub = updateSubscriptionTier(wsId, tier);
  return { success: true, tier: sub.tier };
}

export function canAddDoc(): boolean {
  const wsId = resolveWorkspaceId();
  return canCreateDocument(wsId);
}

export function canAddAgent(): boolean {
  const wsId = resolveWorkspaceId();
  return canCreateAgent(wsId);
}

export function getDocUsage() {
  const wsId = resolveWorkspaceId();
  const info = getDocumentLimitInfo(wsId);
  const limits = getPlanLimits(getSubscription(wsId).tier);
  return {
    current: info.current,
    max: limits.maxDocuments,
    display: limits.maxDocuments === Infinity
      ? `${info.current}/unlimited`
      : `${info.current}/${limits.maxDocuments}`,
    isAtLimit: info.isAtLimit,
    percentage: info.percentage,
  };
}

export function getAgentUsage() {
  const wsId = resolveWorkspaceId();
  const info = getAgentLimitInfo(wsId);
  const limits = getPlanLimits(getSubscription(wsId).tier);
  return {
    current: info.current,
    max: limits.maxAgents,
    display: limits.maxAgents === Infinity
      ? `${info.current}/unlimited`
      : `${info.current}/${limits.maxAgents}`,
    isAtLimit: info.isAtLimit,
  };
}
