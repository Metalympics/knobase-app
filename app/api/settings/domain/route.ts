import { NextRequest } from "next/server";
import { apiJson, apiError, corsHeaders } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

async function resolveSessionAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, school_id, role_id")
    .eq("auth_id", user.id)
    .limit(1)
    .single();

  return data;
}

/**
 * GET /api/settings/domain
 *
 * Return the current domain settings for the caller's workspace.
 */
export async function GET() {
  const sessionUser = await resolveSessionAdmin();
  if (!sessionUser || !sessionUser.school_id) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const admin = createAdminClient();

  const [schoolResult, orgResult] = await Promise.all([
    admin
      .from("schools")
      .select("custom_domain, is_public_workspace")
      .eq("id", sessionUser.school_id)
      .single(),
    admin
      .from("organization_settings")
      .select("subdomain_id")
      .eq("school_id", sessionUser.school_id)
      .single(),
  ]);

  if (schoolResult.error) {
    console.error("[GET /api/settings/domain] school fetch:", schoolResult.error);
    return apiError("Failed to fetch domain settings", "INTERNAL_ERROR", 500);
  }

  const school = schoolResult.data;
  const subdomain = orgResult.data?.subdomain_id ?? null;

  const isDnsVerified = school.custom_domain
    ? await verifyDns(school.custom_domain)
    : false;

  return apiJson({
    subdomain,
    custom_domain: school.custom_domain,
    is_dns_verified: isDnsVerified,
    is_public_workspace: school.is_public_workspace,
  });
}

/**
 * POST /api/settings/domain
 *
 * Update custom domain and/or public workspace flag.
 * Body: { custom_domain?: string, is_public_workspace?: boolean }
 */
export async function POST(request: NextRequest) {
  const sessionUser = await resolveSessionAdmin();
  if (!sessionUser || !sessionUser.school_id) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  if (sessionUser.role_id !== "admin") {
    return apiError(
      "Only workspace admins can update domain settings",
      "FORBIDDEN",
      403,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const update: Record<string, unknown> = {};

  if ("custom_domain" in body) {
    const domain = body.custom_domain;
    if (domain !== null && domain !== "") {
      if (typeof domain !== "string" || !DOMAIN_RE.test(domain)) {
        return apiError(
          "Invalid domain format. Provide a valid domain like docs.example.com",
          "VALIDATION_ERROR",
          400,
        );
      }
      update.custom_domain = domain.toLowerCase();
    } else {
      update.custom_domain = null;
    }
  }

  if ("is_public_workspace" in body) {
    if (typeof body.is_public_workspace !== "boolean") {
      return apiError(
        "is_public_workspace must be a boolean",
        "VALIDATION_ERROR",
        400,
      );
    }
    update.is_public_workspace = body.is_public_workspace;
  }

  if (Object.keys(update).length === 0) {
    return apiError("No valid fields to update", "VALIDATION_ERROR", 400);
  }

  const admin = createAdminClient();

  const { data: school, error } = await admin
    .from("schools")
    .update(update)
    .eq("id", sessionUser.school_id)
    .select("custom_domain, is_public_workspace")
    .single();

  if (error) {
    console.error("[POST /api/settings/domain] update:", error);
    return apiError("Failed to update domain settings", "INTERNAL_ERROR", 500);
  }

  const { data: orgSettings } = await admin
    .from("organization_settings")
    .select("subdomain_id")
    .eq("school_id", sessionUser.school_id)
    .single();

  const isDnsVerified = school.custom_domain
    ? await verifyDns(school.custom_domain)
    : false;

  return apiJson({
    subdomain: orgSettings?.subdomain_id ?? null,
    custom_domain: school.custom_domain,
    is_dns_verified: isDnsVerified,
    is_public_workspace: school.is_public_workspace,
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/**
 * Lightweight DNS verification — resolves CNAME and checks if it points at our
 * expected host. Returns false rather than throwing so callers always get a
 * response.
 */
async function verifyDns(_domain: string): Promise<boolean> {
  // TODO: implement real DNS lookup (e.g. via dns.resolveCname or a hosted
  // verification endpoint). For now we default to false so the UI can show an
  // "unverified" badge until the check is wired up.
  return false;
}
