// ── Agent Authentication Middleware ──
// Authenticates inbound requests from external agents (e.g. OpenClaw).
// Wraps the lower-level `withAuth()` in a cleaner interface matching
// the OpenClaw Gateway integration contract.

import { NextRequest } from "next/server";
import { withAuth, apiError } from "@/lib/api/auth";
import type { AuthResult } from "@/lib/api/auth";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AgentAuthContext {
  /** Authenticated agent ID (e.g. "claw") */
  agentId: string;
  /** Workspace the API key belongs to */
  schoolId: string;
  /** Granted scopes / permissions (e.g. ["read", "write", "task"]) */
  permissions: string[];
  /** Pricing tier that governs rate limits */
  tier: "free" | "pro" | "enterprise";
  /** API key record ID */
  keyId: string;
  /** Human-readable key name */
  keyName: string;
}

export type AgentAuthResult =
  | { ok: true; context: AgentAuthContext }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Middleware                                                           */
/* ------------------------------------------------------------------ */

/**
 * Authenticate an incoming agent request.
 *
 * Accepts `Authorization: Bearer <key>` **or** `X-Agent-API-Key: <key>`.
 * Delegates to the Supabase-backed `withAuth()` which handles
 * SHA-256 lookup, expiry, and rate limiting.
 *
 * Usage:
 * ```ts
 * const auth = await authenticateAgent(request);
 * if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
 * const { agentId, schoolId, permissions } = auth.context;
 * ```
 */
export async function authenticateAgent(
  request: NextRequest
): Promise<AgentAuthResult> {
  // Normalise X-Agent-API-Key header → Authorization: Bearer header
  // so the existing withAuth() middleware can consume it.
  const agentKeyHeader = request.headers.get("X-Agent-API-Key");
  if (agentKeyHeader && !request.headers.get("Authorization")) {
    // Clone request with Authorization header
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${agentKeyHeader}`);
    // Create a mutated request for withAuth
    const mutated = new NextRequest(request.url, {
      method: request.method,
      headers,
      body: request.body,
    });
    return resolveAuth(await withAuth(mutated));
  }

  return resolveAuth(await withAuth(request));
}

/* ------------------------------------------------------------------ */
/* Internal                                                            */
/* ------------------------------------------------------------------ */

function resolveAuth(result: AuthResult): AgentAuthResult {
  if (!result.ok) {
    // Extract error message from the response JSON
    return { ok: false, error: "Authentication failed" };
  }

  const { apiKey } = result;

  return {
    ok: true,
    context: {
      agentId: apiKey.agent_id ?? apiKey.name,
      schoolId: apiKey.school_id,
      permissions: apiKey.scopes,
      tier: apiKey.tier,
      keyId: apiKey.id,
      keyName: apiKey.name,
    },
  };
}
