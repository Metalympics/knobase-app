import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type ExportFormat = "openclaw" | "claude" | "markdown";

const VALID_FORMATS = new Set<ExportFormat>(["openclaw", "claude", "markdown"]);

interface AgentFile {
  filename: string;
  content: string;
  updated_at: string;
}

async function verifyAgent(agentId: string, schoolId: string) {
  const supabase = createAdminClient();

  const { data: existing, error } = await supabase
    .from("users")
    .select("id, name, display_name, type, school_id, is_suspended")
    .eq("id", agentId)
    .single();

  if (error || !existing) {
    return { ok: false as const, response: apiError("Agent not found", "NOT_FOUND", 404) };
  }

  const row = existing as unknown as {
    id: string;
    name: string;
    display_name: string | null;
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

  return { ok: true as const, agent: row };
}

function formatOpenclaw(
  agent: { id: string; name: string; display_name: string | null },
  files: AgentFile[],
): { body: string; contentType: string; filename: string } {
  const fileMap: Record<string, string> = {};
  for (const f of files) {
    fileMap[f.filename] = f.content;
  }

  const manifest = {
    version: "1.0",
    name: agent.display_name ?? agent.name,
    description: `Exported agent files for ${agent.display_name ?? agent.name}`,
    agent_id: agent.id,
    created_at: new Date().toISOString(),
    files: files.map((f) => ({
      filename: f.filename,
      content: f.content,
      updated_at: f.updated_at,
    })),
  };

  const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    body: JSON.stringify(manifest, null, 2),
    contentType: "application/json",
    filename: `${safeName}.openclaw.json`,
  };
}

function formatClaude(
  agent: { name: string; display_name: string | null },
  files: AgentFile[],
): { body: string; contentType: string; filename: string } {
  const parts: string[] = [];

  parts.push(`# ${agent.display_name ?? agent.name}\n`);
  parts.push("This project contains the following agent files:\n");

  const mdFiles = files.filter((f) => f.filename.endsWith(".md"));
  const otherFiles = files.filter((f) => !f.filename.endsWith(".md"));

  for (const f of mdFiles) {
    parts.push(`---\n\n## ${f.filename}\n\n${f.content}\n`);
  }

  for (const f of otherFiles) {
    parts.push(`---\n\n## ${f.filename}\n\n\`\`\`\n${f.content}\n\`\`\`\n`);
  }

  const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    body: parts.join("\n"),
    contentType: "text/markdown; charset=utf-8",
    filename: `${safeName}-claude-project.md`,
  };
}

function formatMarkdown(
  agent: { name: string; display_name: string | null },
  files: AgentFile[],
): { body: string; contentType: string; filename: string } {
  const parts: string[] = [];

  parts.push(`# ${agent.display_name ?? agent.name} — Agent Files\n`);
  parts.push(`Exported on ${new Date().toISOString()}\n`);

  for (const f of files) {
    parts.push(`---\n\n## ${f.filename}\n\n${f.content}\n`);
  }

  const safeName = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    body: parts.join("\n"),
    contentType: "text/markdown; charset=utf-8",
    filename: `${safeName}-export.md`,
  };
}

/**
 * POST /api/agents/[id]/export
 *
 * Export agent files in the requested format.
 * Body: { format: "openclaw" | "claude" | "markdown" }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id: agentId } = await context.params;
  const { school_id } = auth.apiKey;

  const check = await verifyAgent(agentId, school_id);
  if (!check.ok) return check.response;

  let body: { format?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const format = body.format as ExportFormat | undefined;
  if (!format || !VALID_FORMATS.has(format)) {
    return apiError(
      "format is required and must be one of: openclaw, claude, markdown",
      "BAD_REQUEST",
      400,
    );
  }

  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("agent_files")
    .select("filename, updated_at, pages!inner(content_md)")
    .eq("agent_id", agentId)
    .order("filename");

  if (error) {
    console.error("[Agent Export] Error fetching files:", error);
    return apiError("Failed to fetch agent files", "INTERNAL_ERROR", 500);
  }

  const agentFiles: AgentFile[] = (rows ?? []).map((row) => {
    const page = row.pages as unknown as { content_md: string };
    return {
      filename: row.filename,
      content: page?.content_md ?? "",
      updated_at: row.updated_at,
    };
  });

  if (agentFiles.length === 0) {
    return apiError("Agent has no files to export", "NOT_FOUND", 404);
  }

  const { agent } = check;
  let result: { body: string; contentType: string; filename: string };

  switch (format) {
    case "openclaw":
      result = formatOpenclaw(agent, agentFiles);
      break;
    case "claude":
      result = formatClaude(agent, agentFiles);
      break;
    case "markdown":
      result = formatMarkdown(agent, agentFiles);
      break;
  }

  return new NextResponse(result.body, {
    status: 200,
    headers: {
      ...corsHeaders(),
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
