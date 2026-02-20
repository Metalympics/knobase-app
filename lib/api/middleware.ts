import { NextRequest, NextResponse } from "next/server";

const LS_PREFIX = "knobase-app:";
const API_KEYS_KEY = `${LS_PREFIX}api-keys`;
const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const FREE_TIER_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  tier: "free" | "pro" | "enterprise";
  createdAt: string;
  lastUsedAt?: string;
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "kb_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getApiKeys(): ApiKey[] {
  if (typeof globalThis.localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(API_KEYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveApiKeys(keys: ApiKey[]): void {
  localStorage.setItem(API_KEYS_KEY, JSON.stringify(keys));
}

export function createApiKey(name: string, tier: ApiKey["tier"] = "free"): ApiKey {
  const keys = getApiKeys();
  const apiKey: ApiKey = {
    id: crypto.randomUUID(),
    name,
    key: generateApiKey(),
    tier,
    createdAt: new Date().toISOString(),
  };
  keys.push(apiKey);
  saveApiKeys(keys);
  return apiKey;
}

export function revokeApiKey(id: string): boolean {
  const keys = getApiKeys();
  const filtered = keys.filter((k) => k.id !== id);
  if (filtered.length === keys.length) return false;
  saveApiKeys(filtered);
  return true;
}

function getRateLimit(tier: ApiKey["tier"]): number {
  switch (tier) {
    case "enterprise":
      return 10_000;
    case "pro":
      return 1_000;
    default:
      return FREE_TIER_LIMIT;
  }
}

function checkRateLimit(keyId: string, tier: ApiKey["tier"]): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const limit = getRateLimit(tier);
  let entry = RATE_LIMIT_MAP.get(keyId);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    RATE_LIMIT_MAP.set(keyId, entry);
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt: entry.resetAt,
  };
}

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCors(request: NextRequest): NextResponse | null {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }
  return null;
}

export interface AuthenticatedRequest {
  apiKey: ApiKey;
}

export function authenticate(request: NextRequest): { key: ApiKey | null; error?: string } {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { key: null, error: "Missing or invalid Authorization header. Use: Bearer <api_key>" };
  }

  const token = authHeader.slice(7);
  const keys = getApiKeys();
  const found = keys.find((k) => k.key === token);

  if (!found) {
    return { key: null, error: "Invalid API key" };
  }

  found.lastUsedAt = new Date().toISOString();
  saveApiKeys(keys);
  return { key: found };
}

export type ApiMiddlewareResult =
  | { success: true; apiKey: ApiKey }
  | { success: false; response: NextResponse };

export function withApiAuth(request: NextRequest): ApiMiddlewareResult {
  const corsResponse = handleCors(request);
  if (corsResponse) {
    return { success: false, response: corsResponse };
  }

  const { key, error } = authenticate(request);
  if (!key) {
    return {
      success: false,
      response: NextResponse.json(
        { error: error ?? "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const rateCheck = checkRateLimit(key.id, key.tier);
  if (!rateCheck.allowed) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMITED", retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        {
          status: 429,
          headers: {
            ...corsHeaders(),
            "X-RateLimit-Limit": String(getRateLimit(key.tier)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateCheck.resetAt / 1000)),
            "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          },
        }
      ),
    };
  }

  console.log(`[API] ${request.method} ${request.nextUrl.pathname} key=${key.name} remaining=${rateCheck.remaining}`);

  return { success: true, apiKey: key };
}

export function apiResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

export function apiError(message: string, code: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, code, ...(details ? { details } : {}) },
    { status, headers: corsHeaders() }
  );
}
