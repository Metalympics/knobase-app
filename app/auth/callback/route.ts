// ── Auth Callback Route ──
// Handles OAuth and magic link redirects from Supabase.
// Transfers demo document to real account if source=demo.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const source = searchParams.get("source");
  const redirect = searchParams.get("redirect");

  // Default destination
  let destination = redirect || "/knowledge";

  if (code) {
    const response = NextResponse.redirect(new URL(destination, origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(
        new URL("/auth/login?error=auth_failed", origin)
      );
    }

    // If coming from demo, tag the redirect so client can transfer the document
    if (source === "demo") {
      const url = new URL(destination, origin);
      url.searchParams.set("from_demo", "1");
      return NextResponse.redirect(url);
    }

    return response;
  }

  // No code → redirect to home
  return NextResponse.redirect(new URL("/", origin));
}
