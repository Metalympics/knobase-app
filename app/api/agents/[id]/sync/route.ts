import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ClientFile {
  filename: string;
  content: string;
  updated_at: string;
}

interface SyncResult {
  uploaded: { filename: string }[];
  downloaded: { filename: string; content: string; updated_at: string }[];
  conflicts: { filename: string; serverContent: string; clientContent: string }[];
}

async function verifyAgent(agentId: string, schoolId: string) {
  const supabase = createAdminClient();

  const { data: existing, error } = await supabase
    .from("users")
    .select("id, type, school_id, is_suspended")
    .eq("id", agentId)
    .single();

  if (error || !existing) {
    return { ok: false as const, response: apiError("Agent not found", "NOT_FOUND", 404) };
  }

  const row = existing as unknown as {
    id: string;
    type: string | null;
    school_id: string | null;
    is_suspended: boolean;
  };

  if (row.type !== "agent") {
    return { ok: false as const, response: apiError("Resource is not an agent", "BAD_REQUEST", 400) };
  }
  if (row.school_id !== schoolId) {
    return { ok: false as const, response: apiError("Agent does not belong to this workspace", "FORBIDDEN", 403) };
  }
  if (row.is_suspended) {
    return { ok: false as const, response: apiError("Agent is suspended", "FORBIDDEN", 403) };
  }

  return { ok: true as const };
}

/**
 * POST /api/agents/[id]/sync
 *
 * Two-way file sync. Accepts the client's file list, compares timestamps
 * against the server, and returns which files were uploaded (client→server),
 * which should be downloaded (server→client), and which have conflicts.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id: agentId } = await context.params;
  const { school_id } = auth.apiKey;

  const check = await verifyAgent(agentId, school_id);
  if (!check.ok) return check.response;

  let body: { files?: ClientFile[] };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  if (!Array.isArray(body.files)) {
    return apiError("files must be an array", "BAD_REQUEST", 400);
  }

  for (const f of body.files) {
    if (!f.filename || typeof f.filename !== "string") {
      return apiError("Each file must have a filename string", "BAD_REQUEST", 400);
    }
    if (typeof f.content !== "string") {
      return apiError("Each file must have a content string", "BAD_REQUEST", 400);
    }
    if (!f.updated_at || typeof f.updated_at !== "string") {
      return apiError("Each file must have an updated_at string", "BAD_REQUEST", 400);
    }
  }

  const supabase = createAdminClient();

  const { data: serverFiles, error: fetchErr } = await supabase
    .from("agent_files")
    .select("filename, content, updated_at")
    .eq("agent_id", agentId);

  if (fetchErr) {
    console.error("[Agent Sync] Fetch error:", fetchErr);
    return apiError("Failed to fetch server files", "INTERNAL_ERROR", 500);
  }

  const serverMap = new Map(
    (serverFiles ?? []).map((f: { filename: string; content: string; updated_at: string }) => [f.filename, f]),
  );

  const clientFiles = body.files;
  const clientFilenames = new Set(clientFiles.map((f) => f.filename));

  const result: SyncResult = { uploaded: [], downloaded: [], conflicts: [] };
  const upserts: { agent_id: string; filename: string; content: string; updated_at: string }[] = [];

  for (const clientFile of clientFiles) {
    const serverFile = serverMap.get(clientFile.filename);

    if (!serverFile) {
      upserts.push({
        agent_id: agentId,
        filename: clientFile.filename,
        content: clientFile.content,
        updated_at: clientFile.updated_at,
      });
      result.uploaded.push({ filename: clientFile.filename });
      continue;
    }

    const clientTime = new Date(clientFile.updated_at).getTime();
    const serverTime = new Date(serverFile.updated_at).getTime();

    if (clientFile.content === serverFile.content) {
      continue;
    }

    if (clientTime > serverTime) {
      upserts.push({
        agent_id: agentId,
        filename: clientFile.filename,
        content: clientFile.content,
        updated_at: clientFile.updated_at,
      });
      result.uploaded.push({ filename: clientFile.filename });
    } else if (serverTime > clientTime) {
      result.downloaded.push({
        filename: serverFile.filename,
        content: serverFile.content,
        updated_at: serverFile.updated_at,
      });
    } else {
      result.conflicts.push({
        filename: clientFile.filename,
        serverContent: serverFile.content,
        clientContent: clientFile.content,
      });
    }
  }

  for (const [filename, serverFile] of serverMap) {
    if (!clientFilenames.has(filename)) {
      result.downloaded.push({
        filename: serverFile.filename,
        content: serverFile.content,
        updated_at: serverFile.updated_at,
      });
    }
  }

  if (upserts.length > 0) {
    const { error: upsertErr } = await supabase
      .from("agent_files")
      .upsert(upserts, { onConflict: "agent_id,filename" });

    if (upsertErr) {
      console.error("[Agent Sync] Upsert error:", upsertErr);
      return apiError("Failed to sync files to server", "INTERNAL_ERROR", 500);
    }
  }

  return apiJson(result);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
