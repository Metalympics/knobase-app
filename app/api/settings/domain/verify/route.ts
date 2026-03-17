import { NextRequest } from "next/server";
import { apiJson, apiError, corsHeaders } from "@/lib/api/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolve } from "dns/promises";

const EXPECTED_CNAME_TARGET = "cname.vercel-dns.com";

interface DNSRecord {
  type: string;
  value: string;
}

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
 * POST /api/settings/domain/verify
 *
 * Verify that the given domain has a CNAME record pointing to
 * cname.vercel-dns.com. Returns the resolved records for transparency.
 */
export async function POST(request: NextRequest) {
  const sessionUser = await resolveSessionAdmin();
  if (!sessionUser || !sessionUser.school_id) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const { domain } = body as { domain?: string };
  if (!domain || typeof domain !== "string") {
    return apiError(
      "Missing required field: domain",
      "VALIDATION_ERROR",
      400,
    );
  }

  const trimmed = domain.trim().toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(trimmed)) {
    return apiError(
      "Invalid domain format",
      "VALIDATION_ERROR",
      400,
    );
  }

  try {
    const cnames = await resolve(trimmed, "CNAME");
    const records: DNSRecord[] = cnames.map((value) => ({
      type: "CNAME",
      value: typeof value === "string" ? value : String(value),
    }));

    const verified = records.some(
      (r) =>
        r.value === EXPECTED_CNAME_TARGET ||
        r.value === `${EXPECTED_CNAME_TARGET}.`,
    );

    return apiJson({
      verified,
      message: verified
        ? "DNS is correctly configured"
        : `CNAME record found but does not point to ${EXPECTED_CNAME_TARGET}`,
      records,
    });
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;

    if (code === "ENOTFOUND" || code === "ENODATA") {
      return apiJson({
        verified: false,
        message: `No CNAME record found for ${trimmed}. Add a CNAME record pointing to ${EXPECTED_CNAME_TARGET}.`,
        records: [] as DNSRecord[],
      });
    }

    console.error("[POST /api/settings/domain/verify] DNS lookup error:", err);
    return apiError(
      "DNS lookup failed — please try again later",
      "INTERNAL_ERROR",
      500,
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
