import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // ── Public routes — no auth required ──
  const publicPaths = [
    "/demo",           // Demo mode
    "/ui",             // UI components
    "/auth",           // All auth pages (login, signup, callback)
    "/tos",            // Terms of service
    "/privacy",        // Privacy policy
    "/pricing",        // Pricing page
    "/api",            // API routes (handle auth internally)
    "/invite",         // Invite acceptance (public token-based)
    "/",               // Root (redirects to login or dashboard)
  ];

  // Check if path is public
  const isPublicPath = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  
  // Demo routes — tagged and public
  if (pathname.startsWith("/demo")) {
    response.headers.set("x-demo-mode", "true");
    return response;
  }

  // Public paths allow through
  if (isPublicPath) {
    return response;
  }

  // ── Auth check for protected routes ──
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

  // ── Auth routes handling ──
  const authPaths = ["/auth/login", "/auth/signup"];
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));

  // Redirect authenticated users away from auth pages
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL("/s/default", request.url));
  }

  // ── Protected routes require auth ──
  const protectedPaths = [
    "/s/",             // School workspace routes
    "/d/",             // Document routes (universal)
    "/settings",       // User settings
    "/onboarding",     // Onboarding flow
  ];
  
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));

  // Redirect to login if accessing protected route without auth
  if (isProtectedPath && !user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
