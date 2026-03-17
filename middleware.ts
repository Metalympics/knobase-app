import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/* ------------------------------------------------------------------ */
/* Path configuration                                                  */
/* ------------------------------------------------------------------ */

const PUBLIC_PATHS = [
  "/demo",
  "/ui",
  "/auth",
  "/tos",
  "/privacy",
  "/pricing",
  "/api",
  "/invite",
];

const PROTECTED_PREFIXES = ["/s/", "/d/", "/settings", "/onboarding"];

/**
 * API paths served on the api.* host. Requests to these paths on the
 * main app host are also allowed (they go through the normal /api flow).
 */
const API_PATH_PREFIXES = [
  "/api/mcp",
  "/api/v1/",
  "/api/agent",
  "/api/agents",
  "/api/keys",
  "/api/mentions",
  "/api/webhooks",
  "/api/collaborators",
  "/api/export",
];

const APP_HOSTS = ["app.knobase.com", "localhost", "127.0.0.1"];

/**
 * In-memory cache for custom domain → workspace lookups.
 * Entries expire after 5 minutes so DNS/config changes propagate quickly.
 * A `workspace: null` entry is a negative cache hit (domain not configured).
 */
interface DomainCacheEntry {
  workspace: { schoolId: string; schoolName: string } | null;
  resolvedAt: number;
}
const DOMAIN_CACHE = new Map<string, DomainCacheEntry>();
const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Rate limiting (in-memory, per-instance)                             */
/* ------------------------------------------------------------------ */

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const API_RATE_WINDOW_MS = 60_000;
const API_RATE_LIMIT = 200;

function checkApiRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + API_RATE_WINDOW_MS };
    RATE_LIMIT_MAP.set(ip, entry);
  }
  entry.count++;
  return {
    allowed: entry.count <= API_RATE_LIMIT,
    remaining: Math.max(0, API_RATE_LIMIT - entry.count),
  };
}

/* ------------------------------------------------------------------ */
/* CORS helpers                                                        */
/* ------------------------------------------------------------------ */

function addApiCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin ?? "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key, X-Agent-Id, X-Knobase-Workspace",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

/* ------------------------------------------------------------------ */
/* Middleware                                                           */
/* ------------------------------------------------------------------ */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const isApiHost = host.startsWith("api.");
  const origin = request.headers.get("origin");

  /* ── api.knobase.com: dedicated API host ── */
  if (isApiHost) {
    return handleApiHost(request, pathname, origin);
  }

  /* ── Custom domain: public docs site (e.g. docs.knobase.com) ── */
  const isCustomDomain = !APP_HOSTS.some(
    (h) => host === h || host.startsWith(h + ":"),
  );
  if (isCustomDomain) {
    return handleCustomDomain(request, host, pathname);
  }

  /* ── app.knobase.com (or default): normal app behaviour ── */

  // Fast exit: root
  if (pathname === "/") {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // Fast exit: public paths (no Supabase call at all)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const res = NextResponse.next({ request: { headers: request.headers } });
    if (pathname.startsWith("/demo")) res.headers.set("x-demo-mode", "true");
    return res;
  }

  // Only touch Supabase for protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

/* ------------------------------------------------------------------ */
/* Custom domain handler (public docs)                                 */
/* ------------------------------------------------------------------ */

async function handleCustomDomain(
  request: NextRequest,
  host: string,
  pathname: string,
): Promise<NextResponse> {
  const domain = host.split(":")[0];

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const cached = DOMAIN_CACHE.get(domain);
  let workspace: { schoolId: string; schoolName: string } | null = null;

  if (cached && Date.now() - cached.resolvedAt < DOMAIN_CACHE_TTL_MS) {
    workspace = cached.workspace;
  } else {
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );

    const { data } = await sb
      .from("schools")
      .select("id, name, is_public_workspace")
      .eq("custom_domain", domain)
      .single();

    if (data && data.is_public_workspace) {
      workspace = { schoolId: data.id, schoolName: data.name };
    } else {
      workspace = null;
    }

    DOMAIN_CACHE.set(domain, { workspace, resolvedAt: Date.now() });
  }

  if (!workspace) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Static assets / Next internals — pass through with context headers
  if (pathname.startsWith("/_next/") || pathname.startsWith("/public/")) {
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.headers.set("x-custom-domain", domain);
    response.headers.set("x-school-id", workspace.schoolId);
    response.headers.set("x-school-name", workspace.schoolName);
    response.headers.set("x-public-docs", "true");
    return response;
  }

  // Rewrite all paths into the school's doc space so the app can render them.
  // e.g. /getting-started → /s/<schoolId>/d/getting-started (public slug lookup happens in page component)
  const url = request.nextUrl.clone();

  if (pathname === "/" || pathname === "") {
    url.pathname = `/s/${workspace.schoolId}/d`;
  } else {
    url.pathname = `/s/${workspace.schoolId}/d${pathname}`;
  }

  const response = NextResponse.rewrite(url, {
    request: { headers: request.headers },
  });

  response.headers.set("x-custom-domain", domain);
  response.headers.set("x-school-id", workspace.schoolId);
  response.headers.set("x-school-name", workspace.schoolName);
  response.headers.set("x-public-docs", "true");

  return response;
}

/* ------------------------------------------------------------------ */
/* api.* host handler                                                  */
/* ------------------------------------------------------------------ */

function handleApiHost(
  request: NextRequest,
  pathname: string,
  origin: string | null,
): NextResponse {
  // Preflight
  if (request.method === "OPTIONS") {
    return addApiCorsHeaders(
      new NextResponse(null, { status: 204 }),
      origin,
    );
  }

  // Only allow API paths on the API host
  const isApiPath = API_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isApiPath) {
    return addApiCorsHeaders(
      NextResponse.json(
        { error: "Not found. Use app.knobase.com for the web application." },
        { status: 404 },
      ),
      origin,
    );
  }

  // Per-IP rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkApiRateLimit(ip);
  if (!rate.allowed) {
    const res = addApiCorsHeaders(
      NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMITED" },
        { status: 429 },
      ),
      origin,
    );
    res.headers.set("X-RateLimit-Limit", String(API_RATE_LIMIT));
    res.headers.set("X-RateLimit-Remaining", "0");
    res.headers.set("Retry-After", "60");
    return res;
  }

  // Pass through to the API route handler with CORS headers
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.headers.set("X-RateLimit-Limit", String(API_RATE_LIMIT));
  response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
  return addApiCorsHeaders(response, origin);
}

/* ------------------------------------------------------------------ */
/* Matcher                                                             */
/* ------------------------------------------------------------------ */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
