import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // ── Public routes — resolve before touching Supabase ──
  const publicPaths = [
    "/demo",
    "/ui",
    "/d/",
    "/auth/",
    "/tos",
    "/privacy",
    "/pricing",
    "/api/",
    "/invite/",
  ];

  // Tag demo routes and return immediately
  if (pathname.startsWith("/demo")) {
    response.headers.set("x-demo-mode", "true");
    return response;
  }

  // Invite routes — always public
  if (pathname.startsWith("/invite/")) {
    return response;
  }

  // All other public paths
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublicPath) {
    return response;
  }

  // ── Auth-required routes — need Supabase ──
  // Guard against missing env vars (e.g. local dev without .env)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Protected routes — require authentication ──
  const protectedPaths = [
    "/knowledge",
    "/settings",
    "/workspaces",
    "/w/",
    "/onboarding",
  ];
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));

  // ── Auth routes — redirect if already authenticated ──
  const authPaths = ["/auth/login", "/auth/signup"];
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));

  // Redirect to login if trying to access protected route without auth
  if (isProtectedPath && !user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to knowledge if accessing auth pages while already logged in
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL("/knowledge", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
