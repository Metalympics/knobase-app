import { NextRequest, NextResponse } from "next/server";
import { findApiKeyByRawToken } from "@/lib/supabase/api-keys";
import type { AgentApiKey } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Resolved API key info exposed to route handlers after auth.
 * Uses the Supabase-backed agent_api_keys table.
 */
export interface ResolvedApiKey {
  id: string;
  name: string;
  school_id: string;
  agent_id: string | null;
  scopes: string[];
  tier: "free" | "pro" | "enterprise";
}

function toResolvedKey(row: AgentApiKey): ResolvedApiKey {
  // Derive tier from scopes or default
  const scopes: string[] = Array.isArray(row.scopes) ? (row.scopes as string[]) : [];
  let tier: ResolvedApiKey["tier"] = "free";
  if (scopes.includes("enterprise")) tier = "enterprise";
  else if (scopes.includes("pro")) tier = "pro";
  return {
    id: row.id,
    name: row.name,
    school_id: row.school_id,
    agent_id: row.agent_id,
    scopes,
    tier,
  };
}

/* ------------------------------------------------------------------ */
/* Rate Limiting (in-memory, per-instance)                             */
/* ------------------------------------------------------------------ */

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;

function getRateLimit(tier: ResolvedApiKey["tier"]): number {
  switch (tier) {
    case "enterprise":
      return 10_000;
    case "pro":
      return 1_000;
    default:
      return 100;
  }
}

function checkRateLimit(keyId: string, tier: ResolvedApiKey["tier"]): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const limit = getRateLimit(tier);
  let entry = RATE_LIMIT_MAP.get(keyId);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    RATE_LIMIT_MAP.set(keyId, entry);
  }

  entry.count++;
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function apiJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

export function apiError(message: string, code: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, code, ...(details ? { details } : {}) },
    { status, headers: corsHeaders() }
  );
}

/* ------------------------------------------------------------------ */
/* Auth middleware (async — uses Supabase)                              */
/* ------------------------------------------------------------------ */

export type AuthResult =
  | { ok: true; apiKey: ResolvedApiKey }
  | { ok: false; response: NextResponse };

/**
 * Authenticate an incoming API request using the Supabase-backed
 * `agent_api_keys` table. Performs SHA-256 token lookup, expiry check,
 * and in-memory rate limiting.
 */
export async function withAuth(request: NextRequest): Promise<AuthResult> {
  if (request.method === "OPTIONS") {
    return { ok: false, response: new NextResponse(null, { status: 204, headers: corsHeaders() }) };
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: apiError("Missing or invalid Authorization header", "UNAUTHORIZED", 401) };
  }

  const token = authHeader.slice(7);
  const row = await findApiKeyByRawToken(token);
  if (!row) {
    return { ok: false, response: apiError("Invalid API key", "UNAUTHORIZED", 401) };
  }

  const key = toResolvedKey(row);

  const rate = checkRateLimit(key.id, key.tier);
  if (!rate.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMITED", retryAfter: Math.ceil((rate.resetAt - Date.now()) / 1000) },
        {
          status: 429,
          headers: {
            ...corsHeaders(),
            "X-RateLimit-Limit": String(getRateLimit(key.tier)),
            "X-RateLimit-Remaining": "0",
            "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
          },
        }
      ),
    };
  }

  console.log(`[API] ${request.method} ${request.nextUrl.pathname} key=${key.name} remaining=${rate.remaining}`);

  return { ok: true, apiKey: key };
}
