// ── Auth Callback Route ──
// Handles OAuth and magic link redirects from Supabase.
// Uses auth_profiles as primary identity source (Option A architecture).
// Maintains public.users for backward compatibility.
// Pattern copied from apps/dashboard - tolerant of race conditions.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Prevent duplicate exchanges (same code reused within 30s)
const recentExchanges = new Map<string, number>();
const EXCHANGE_WINDOW = 30000;

function shouldAllowExchange(codePrefix: string): boolean {
  const now = Date.now();
  const lastExchange = recentExchanges.get(codePrefix);

  // Clean old entries
  for (const [key, timestamp] of recentExchanges.entries()) {
    if (now - timestamp > 60000) {
      recentExchanges.delete(key);
    }
  }

  if (lastExchange && now - lastExchange < EXCHANGE_WINDOW) {
    return false;
  }

  recentExchanges.set(codePrefix, now);
  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect");
  const inviteToken = searchParams.get("invite");

  if (!code) {
    console.log("❌ No authorization code provided");
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", origin));
  }

  // Create cookie store for Supabase client
  const cookieStore = await cookies();
  
  // In-memory cookie cache for refreshed tokens
  const cookieWriteCache = new Map<string, string>();

  // Create server client with proper cookie handling
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();
          
          // Merge with write cache for refreshed tokens
          if (cookieWriteCache.size > 0) {
            const merged = allCookies.map((cookie) => {
              const cached = cookieWriteCache.get(cookie.name);
              return cached !== undefined ? { ...cookie, value: cached } : cookie;
            });
            
            for (const [name, value] of cookieWriteCache) {
              if (!allCookies.some((c) => c.name === name)) {
                merged.push({ name, value });
              }
            }
            return merged;
          }
          return allCookies;
        },
        setAll(cookiesToSet) {
          // Cache refreshed tokens immediately
          cookiesToSet.forEach(({ name, value }) => {
            cookieWriteCache.set(name, value);
          });
          
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Read-only context - tokens cached above will be used
          }
        },
      },
    }
  );

  // Prevent duplicate exchanges
  const codePrefix = code.substring(0, 16);
  if (!shouldAllowExchange(codePrefix)) {
    console.log("⚠️ Duplicate exchange attempt blocked:", codePrefix);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/login?error=duplicate_attempt", origin));
    }
    console.log("✅ Session found from previous exchange, continuing...");
    // Fall through to profile check with existing session
  } else {
    // Exchange code for session
    console.log("📝 Exchanging OAuth code for session...", { codePrefix });
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error("❌ Exchange error:", exchangeError);
      
      // Handle "already used" codes
      if (exchangeError.message?.includes("already used")) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log("✅ Code reused but session exists, continuing...");
          // Fall through to profile check
        } else {
          return NextResponse.redirect(new URL("/auth/login?error=code_used", origin));
        }
      } else {
        return NextResponse.redirect(new URL("/auth/login?error=auth_failed", origin));
      }
    }
  }

  // Get authenticated user from Supabase Auth
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser || !authUser.email) {
    console.error("❌ No user after successful exchange");
    return NextResponse.redirect(new URL("/auth/login?error=no_user", origin));
  }

  console.log("✅ Session established:", { userId: authUser.id, email: authUser.email });

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Upsert auth_profiles (primary identity source)
  // ─────────────────────────────────────────────────────────────────
  
  const fullName = 
    authUser.user_metadata?.full_name || 
    authUser.user_metadata?.name || 
    authUser.email.split("@")[0] || 
    "User";

  let profileId: string;
  let isNewProfile = false;

  try {
    // Try to upsert auth profile - ON CONFLICT DO UPDATE for existing users
    const { data: profile, error: profileError } = await supabase
      .from("auth_profiles")
      .upsert({
        auth_id: authUser.id,
        email: authUser.email,
        full_name: fullName,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        last_login_at: new Date().toISOString(),
        email_verified: authUser.email_confirmed_at ? true : false,
        email_verified_at: authUser.email_confirmed_at || null,
      }, {
        onConflict: "auth_id",
        ignoreDuplicates: false, // Update on conflict
      })
      .select("id, created_at")
      .single();

    if (profileError) {
      console.error("❌ Failed to upsert auth profile:", profileError);
      // Try to fetch existing profile
      const { data: existingProfile } = await supabase
        .from("auth_profiles")
        .select("id, created_at")
        .eq("auth_id", authUser.id)
        .single();
      
      if (existingProfile) {
        profileId = existingProfile.id;
        // Check if created recently (within last minute) to determine if new
        const createdAt = new Date(existingProfile.created_at);
        isNewProfile = (Date.now() - createdAt.getTime()) < 60000;
        console.log("✅ Found existing auth profile:", profileId);
      } else {
        console.error("❌ Could not create or fetch auth profile");
        return NextResponse.redirect(new URL("/auth/login?error=profile_failed", origin));
      }
    } else if (profile) {
      profileId = profile.id;
      // Check if this was an insert (created_at is very recent)
      const createdAt = new Date(profile.created_at);
      isNewProfile = (Date.now() - createdAt.getTime()) < 60000;
      console.log(isNewProfile ? "✅ Created new auth profile:" : "✅ Updated auth profile:", profileId);
    } else {
      console.error("❌ No profile returned from upsert");
      return NextResponse.redirect(new URL("/auth/login?error=profile_failed", origin));
    }
  } catch (err) {
    console.error("❌ Unexpected error with auth profile:", err);
    return NextResponse.redirect(new URL("/auth/login?error=profile_failed", origin));
  }

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Maintain public.users for backward compatibility (Option A)
  // ─────────────────────────────────────────────────────────────────
  
  // Check for existing public.users records for this auth_id
  const { data: existingUsers } = await supabase
    .from("users")
    .select("id, school_id, name")
    .eq("auth_id", authUser.id);

  const primaryUser = existingUsers?.find(u => u.school_id === null);
  const workspaceUsers = existingUsers?.filter(u => u.school_id !== null) || [];

  // Create primary public.users record if doesn't exist (for backward compat)
  if (!primaryUser) {
    console.log("📝 Creating primary public.users record for backward compatibility");
    
    try {
      const { error: userError } = await supabase
        .from("users")
        .insert({
          auth_id: authUser.id,
          email: authUser.email,
          name: fullName,
          avatar_url: authUser.user_metadata?.avatar_url || null,
          school_id: null, // Primary record has no school
        });

      if (userError) {
        // 23505 = duplicate key, someone else created it (race condition)
        if (userError.code === "23505") {
          console.log("⚠️ public.users primary record already exists (race condition)");
        } else {
          console.error("❌ Failed to create public.users record:", userError);
          // Don't fail - auth_profiles is the source of truth now
        }
      } else {
        console.log("✅ Created primary public.users record");
      }
    } catch (err) {
      console.error("❌ Error creating public.users:", err);
      // Don't fail - auth_profiles is primary
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // STEP 3: Handle invite token (creates workspace membership)
  // ─────────────────────────────────────────────────────────────────
  
  if (inviteToken) {
    try {
      const { data: invite } = await supabase
        .from("invites")
        .select("id, school_id, document_id, expires_at, used_at")
        .eq("token", inviteToken)
        .maybeSingle();

      if (invite && !invite.used_at && new Date(invite.expires_at) > new Date()) {
        console.log("🎟️ Processing invite:", invite.id);
        
        // Check if user already has a record for this school
        const existingWorkspaceUser = workspaceUsers.find(u => u.school_id === invite.school_id);
        
        if (!existingWorkspaceUser) {
          // Create public.users record for this workspace
          const { error: inviteUserError } = await supabase
            .from("users")
            .insert({
              auth_id: authUser.id,
              email: authUser.email,
              name: fullName,
              avatar_url: authUser.user_metadata?.avatar_url || null,
              school_id: invite.school_id,
            });

          if (inviteUserError && inviteUserError.code !== "23505") {
            console.error("❌ Failed to create workspace user from invite:", inviteUserError);
          } else {
            console.log("✅ Created workspace user from invite");
          }
        }

        // Mark invite as used
        await supabase
          .from("invites")
          .update({ used_at: new Date().toISOString() })
          .eq("id", invite.id);

        console.log("✅ Invite processed, redirecting...");
        
        // Redirect to document or school
        if (invite.document_id) {
          return NextResponse.redirect(new URL(`/d/${invite.document_id}`, origin));
        }
        return NextResponse.redirect(new URL(`/s/${invite.school_id}`, origin));
      }
    } catch (err) {
      console.error("❌ Invite error:", err);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // STEP 4: Determine redirect based on workspace membership
  // ─────────────────────────────────────────────────────────────────
  
  const redirectPath = redirect && redirect !== "/s/default" ? redirect : null;

  // Re-fetch to get current state after invite processing
  const { data: currentUsers } = await supabase
    .from("users")
    .select("school_id")
    .eq("auth_id", authUser.id);
  
  const currentWorkspaces = currentUsers?.filter(u => u.school_id !== null) || [];

  if (currentWorkspaces.length === 0) {
    // No workspaces - needs onboarding
    const onboardingUrl = new URL("/onboarding", origin);
    if (redirectPath) onboardingUrl.searchParams.set("redirect", redirectPath);
    console.log("🚀 Redirecting to onboarding (no workspaces)");
    return NextResponse.redirect(onboardingUrl);
  }

  // Check for last_active_school_id in auth_profiles
  const { data: authProfile } = await supabase
    .from("auth_profiles")
    .select("last_active_school_id")
    .eq("auth_id", authUser.id)
    .single();

  const lastActiveSchoolId = authProfile?.last_active_school_id;

  // If last_active_school_id exists and user is a member, redirect there
  if (lastActiveSchoolId) {
    const hasAccess = currentWorkspaces.some(u => u.school_id === lastActiveSchoolId);
    if (hasAccess) {
      console.log("🚀 Redirecting to last active workspace:", lastActiveSchoolId);
      return NextResponse.redirect(new URL(redirectPath || `/s/${lastActiveSchoolId}`, origin));
    }
  }

  // Fallback: redirect to first workspace
  const firstWorkspaceId = currentWorkspaces[0].school_id;
  console.log("🚀 Redirecting to first workspace:", firstWorkspaceId);
  
  // Update last_active_school_id to the first workspace
  await supabase
    .from("auth_profiles")
    .update({ last_active_school_id: firstWorkspaceId })
    .eq("auth_id", authUser.id);
  
  return NextResponse.redirect(new URL(redirectPath || `/s/${firstWorkspaceId}`, origin));
}
