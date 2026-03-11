// ── .openclaw Import System ──
// Parses .openclaw JSON files, validates the manifest, and imports
// agents + documents + workflows into a target Supabase workspace.

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  OpenclawManifest,
  OpenclawAgent,
  OpenclawDocument,
  ImportOptions,
  ImportResult,
} from "./types";

/* ------------------------------------------------------------------ */
/* Parse + Validate                                                    */
/* ------------------------------------------------------------------ */

/**
 * Parse a raw JSON string into a validated OpenclawManifest.
 * Throws on malformed input.
 */
export function parseManifest(raw: string): OpenclawManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON: could not parse .openclaw file");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid manifest: expected a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.name !== "string" || !obj.name) {
    throw new Error("Invalid manifest: missing 'name' field");
  }

  const manifest: OpenclawManifest = {
    version: typeof obj.version === "string" ? obj.version : "1.0",
    name: obj.name as string,
    description: typeof obj.description === "string" ? obj.description : "",
    author: typeof obj.author === "string" ? obj.author : undefined,
    created_at: typeof obj.created_at === "string" ? obj.created_at : undefined,
    agents: Array.isArray(obj.agents) ? validateAgents(obj.agents) : [],
    documents: Array.isArray(obj.documents) ? validateDocuments(obj.documents) : [],
    workflows: Array.isArray(obj.workflows) ? (obj.workflows as OpenclawManifest["workflows"]) : [],
  };

  return manifest;
}

function validateAgents(raw: unknown[]): OpenclawAgent[] {
  return raw
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a, i) => ({
      id: typeof a.id === "string" ? a.id : `agent-${i}`,
      name: typeof a.name === "string" ? a.name : `Agent ${i + 1}`,
      role: typeof a.role === "string" ? a.role : "assistant",
      avatar: typeof a.avatar === "string" ? a.avatar : "🤖",
      color: typeof a.color === "string" ? a.color : "#8B5CF6",
      tone: typeof a.tone === "string" ? a.tone : undefined,
      personality: typeof a.personality === "string" ? a.personality : undefined,
      expertise: Array.isArray(a.expertise) ? (a.expertise as string[]) : undefined,
      instructions: typeof a.instructions === "string" ? a.instructions : undefined,
      constraints: Array.isArray(a.constraints) ? (a.constraints as string[]) : undefined,
      capabilities: Array.isArray(a.capabilities) ? (a.capabilities as string[]) : undefined,
    }));
}

function validateDocuments(raw: unknown[]): OpenclawDocument[] {
  return raw
    .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
    .map((d, i) => ({
      id: typeof d.id === "string" ? d.id : `doc-${i}`,
      title: typeof d.title === "string" ? d.title : `Document ${i + 1}`,
      content: typeof d.content === "string" ? d.content : "",
      tags: Array.isArray(d.tags) ? (d.tags as string[]) : undefined,
    }));
}

/* ------------------------------------------------------------------ */
/* Import orchestrator                                                 */
/* ------------------------------------------------------------------ */

/**
 * Import an .openclaw manifest into a workspace.
 * Creates agents (as personas), documents, and tracks the import job.
 */
export async function importOpenclawPackage(
  manifest: OpenclawManifest,
  userId: string,
  options: ImportOptions
): Promise<ImportResult> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  let workspaceId = options.workspaceId ?? "";

  // 1. Create workspace if needed
  if (!workspaceId && options.newWorkspaceName) {
    const slug = options.newWorkspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: ws, error: wsErr } = await supabase
      .from("schools")
      .insert({
        name: options.newWorkspaceName,
        slug: `${slug}-${Date.now().toString(36)}`,
        owner_id: userId,
        invite_code: crypto.randomUUID().slice(0, 8),
      })
      .select("id")
      .single();

    if (wsErr || !ws) {
      throw new Error(`Failed to create workspace: ${wsErr?.message ?? "unknown"}`);
    }

    workspaceId = (ws as unknown as { id: string }).id;

    // Add creator as admin member by updating their school_id
    await supabase.from("users").update({
      school_id: workspaceId,
      role: "admin",
    }).eq("id", userId);
  }

  if (!workspaceId) {
    throw new Error("No workspace specified and no new workspace name provided");
  }

  // 2. Create import job
  const { data: job, error: jobErr } = await supabase
    .from("import_jobs")
    .insert({
      user_id: userId,
      school_id: workspaceId,
      source_type: options.sourceType,
      source_id: options.sourceId ?? null,
      original_filename: options.originalFilename ?? null,
      status: "processing" as const,
      manifest: manifest as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    throw new Error(`Failed to create import job: ${jobErr?.message ?? "unknown"}`);
  }

  const importJobId = (job as unknown as { id: string }).id;

  // 3. Import agents as personas
  const selectedAgents = options.selectedAgentIds
    ? manifest.agents.filter((a) => options.selectedAgentIds!.includes(a.id))
    : manifest.agents;

  let agentsCreated = 0;
  for (const agent of selectedAgents) {
    const { error: agentErr } = await supabase.from("agent_personas").insert({
      agent_id: agent.id,
      name: agent.name,
      role: agent.role,
      avatar: agent.avatar ?? "🤖",
      color: agent.color ?? "#8B5CF6",
      tone: agent.tone ?? "professional",
      voice_description: agent.personality ?? null,
      expertise: agent.expertise ?? [],
      instructions: agent.instructions ?? null,
      constraints: agent.constraints ?? [],
      school_id: workspaceId,
      created_by: userId,
    });

    if (agentErr) {
      errors.push(`Agent "${agent.name}": ${agentErr.message}`);
    } else {
      agentsCreated++;
    }
  }

  // 4. Import documents
  const selectedDocs = options.selectedDocumentIds
    ? manifest.documents.filter((d) => options.selectedDocumentIds!.includes(d.id))
    : manifest.documents;

  let documentsCreated = 0;
  const createdDocIds: string[] = [];
  for (const doc of selectedDocs) {
    const { data: created, error: docErr } = await supabase
      .from("pages")
      .insert({
        title: doc.title,
        content_md: doc.content,
        school_id: workspaceId,
        created_by: userId,
        visibility: "shared" as const,
      })
      .select("id")
      .single();

    if (docErr) {
      errors.push(`Document "${doc.title}": ${docErr.message}`);
    } else {
      documentsCreated++;
      if (created) createdDocIds.push((created as unknown as { id: string }).id);
    }
  }

  // 5. Update import job with results
  const finalStatus = errors.length > 0 ? "completed" : "completed";
  await supabase
    .from("import_jobs")
    .update({
      status: finalStatus as "completed",
      created_documents: createdDocIds,
      created_agents: selectedAgents.map((a) => a.id),
      error_message: errors.length > 0 ? errors.join("; ") : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", importJobId);

  return {
    success: errors.length === 0,
    workspaceId,
    importJobId,
    agentsCreated,
    documentsCreated,
    workflowsCreated: 0, // workflows are a future feature
    errors,
  };
}

/**
 * Export a workspace as an OpenclawManifest (for creating marketplace listings).
 */
export async function exportWorkspaceAsManifest(
  workspaceId: string
): Promise<OpenclawManifest> {
  const supabase = createAdminClient();

  // Get workspace info
  const { data: workspace } = await supabase
    .from("schools")
    .select("name")
    .eq("id", workspaceId)
    .single();

  const wsName = workspace ? (workspace as unknown as { name: string }).name : "Exported Pack";

  // Get agents
  const { data: personas } = await supabase
    .from("agent_personas")
    .select("*")
    .eq("school_id", workspaceId);

  // Get pages (workspace editor content)
  const { data: docs } = await supabase
    .from("pages")
    .select("id, title, content_md")
    .eq("school_id", workspaceId);

  return {
    version: "1.0",
    name: wsName,
    description: "",
    created_at: new Date().toISOString(),
    agents: (personas ?? []).map((p: Record<string, unknown>) => ({
      id: p.agent_id as string,
      name: p.name as string,
      role: p.role as string,
      avatar: p.avatar as string,
      color: p.color as string,
      tone: p.tone as string,
      expertise: p.expertise as string[],
      instructions: p.instructions as string,
      constraints: p.constraints as string[],
    })),
    documents: (docs ?? []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      title: d.title as string,
      content: d.content as string,
    })),
    workflows: [],
  };
}
