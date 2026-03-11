/**
 * CORS utilities for agent-facing API routes.
 *
 * External agents call from their own servers, so we need proper CORS
 * headers on every response. For requests arriving on the dedicated
 * api.knobase.com host, we allow any origin. For app.knobase.com we
 * restrict to same-origin by default.
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-API-Key",
  "X-Agent-Id",
  "X-Knobase-Workspace",
].join(", ");
const MAX_AGE = "86400"; // 24 hours

/**
 * Add CORS headers to an existing response.
 * Per the CORS spec, when credentials are needed the origin must be
 * explicitly reflected (not `*`). We reflect the request origin when
 * present, and fall back to `*` for simple/non-credentialed requests.
 */
export function addCorsHeaders(request: NextRequest, response: Response): Response {
  const origin = request.headers.get("origin");

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Max-Age", MAX_AGE);

  return response;
}

/**
 * Handle an OPTIONS preflight request.
 */
export function handlePreflight(request: NextRequest): Response {
  return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
}
