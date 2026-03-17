import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 20 * 1024; // 20KB per file
const RECOMMENDED_FILES = ["SOUL.md", "IDENTITY.md"];

interface ImportedFile {
  filename: string;
  size: number;
}

interface SkippedFile {
  filename: string;
  reason: string;
}

interface FileError {
  filename: string;
  error: string;
}

interface OpenClawManifest {
  version?: string;
  files?: Array<{ filename: string; content: string; updated_at?: string }>;
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

function isValidFilename(name: string): boolean {
  if (!name || name.includes("..") || name.startsWith("/")) return false;
  if (name.includes("\0")) return false;
  return /^[\w\-.]+$/.test(name);
}

async function extractFilesFromZip(
  buffer: ArrayBuffer,
): Promise<Array<{ filename: string; content: string }>> {
  const zip = await JSZip.loadAsync(buffer);
  const results: Array<{ filename: string; content: string }> = [];

  // Check if there's an openclaw manifest inside the zip
  const manifestEntry = zip.file(/\.openclaw\.json$/i);
  if (manifestEntry.length > 0) {
    const manifestText = await manifestEntry[0].async("string");
    const manifest = JSON.parse(manifestText) as OpenClawManifest;
    if (manifest.files && Array.isArray(manifest.files)) {
      for (const f of manifest.files) {
        if (f.filename && typeof f.content === "string") {
          results.push({ filename: f.filename, content: f.content });
        }
      }
      return results;
    }
  }

  // Otherwise extract individual files
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const basename = path.split("/").pop() ?? path;
    if (!basename) continue;
    const content = await entry.async("string");
    results.push({ filename: basename, content });
  }

  return results;
}

function extractFilesFromManifest(
  manifest: OpenClawManifest,
): Array<{ filename: string; content: string }> {
  if (!manifest.files || !Array.isArray(manifest.files)) {
    throw new Error("Invalid OpenClaw manifest: missing files array");
  }
  return manifest.files
    .filter((f) => f.filename && typeof f.content === "string")
    .map((f) => ({ filename: f.filename, content: f.content }));
}

/**
 * POST /api/agents/[id]/import
 *
 * Import agent files from .openclaw format.
 * Accepts multipart/form-data with file uploads (.zip or .md files)
 * or a JSON openclaw manifest.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id: agentId } = await context.params;
  const { school_id } = auth.apiKey;

  const check = await verifyAgent(agentId, school_id);
  if (!check.ok) return check.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("Expected multipart/form-data", "BAD_REQUEST", 400);
  }

  const overwrite = formData.get("overwrite") !== "false";
  const uploadedFiles = formData.getAll("files") as File[];

  if (!uploadedFiles.length) {
    return apiError("No files provided", "BAD_REQUEST", 400);
  }

  // Collect all files to import
  let filesToImport: Array<{ filename: string; content: string }> = [];
  const errors: FileError[] = [];

  for (const file of uploadedFiles) {
    try {
      if (file.name.endsWith(".zip")) {
        const buffer = await file.arrayBuffer();
        const extracted = await extractFilesFromZip(buffer);
        filesToImport.push(...extracted);
      } else if (file.name.endsWith(".openclaw.json") || file.name.endsWith(".json")) {
        const text = await file.text();
        const manifest = JSON.parse(text) as OpenClawManifest;
        const extracted = extractFilesFromManifest(manifest);
        filesToImport.push(...extracted);
      } else if (file.name.endsWith(".md")) {
        const content = await file.text();
        filesToImport.push({ filename: file.name, content });
      } else {
        errors.push({ filename: file.name, error: "Unsupported file type. Use .zip, .json, or .md" });
      }
    } catch (e) {
      errors.push({ filename: file.name, error: `Failed to process: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  if (filesToImport.length === 0 && errors.length === 0) {
    return apiError("No importable files found", "BAD_REQUEST", 400);
  }

  // Validate files
  const imported: ImportedFile[] = [];
  const skipped: SkippedFile[] = [];

  // Deduplicate by filename (last wins)
  const deduped = new Map<string, string>();
  for (const f of filesToImport) {
    deduped.set(f.filename, f.content);
  }
  filesToImport = Array.from(deduped, ([filename, content]) => ({ filename, content }));

  // Check for recommended files
  const filenames = new Set(filesToImport.map((f) => f.filename));
  for (const rec of RECOMMENDED_FILES) {
    if (!filenames.has(rec)) {
      console.warn(`[Agent Import] Recommended file ${rec} not found in import`);
    }
  }

  // Fetch existing files if overwrite is disabled
  let existingFilenames = new Set<string>();
  if (!overwrite) {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("agent_files")
      .select("filename")
      .eq("agent_id", agentId);

    existingFilenames = new Set((existing ?? []).map((r: { filename: string }) => r.filename));
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  for (const file of filesToImport) {
    if (!isValidFilename(file.filename)) {
      errors.push({ filename: file.filename, error: "Invalid filename" });
      continue;
    }

    const size = new TextEncoder().encode(file.content).byteLength;
    if (size > MAX_FILE_SIZE) {
      errors.push({ filename: file.filename, error: `Exceeds ${MAX_FILE_SIZE / 1024}KB limit (${(size / 1024).toFixed(1)}KB)` });
      continue;
    }

    if (!overwrite && existingFilenames.has(file.filename)) {
      skipped.push({ filename: file.filename, reason: "File already exists (overwrite=false)" });
      continue;
    }

    const { error } = await supabase
      .from("agent_files")
      .upsert(
        { agent_id: agentId, filename: file.filename, content: file.content, updated_at: now },
        { onConflict: "agent_id,filename" },
      );

    if (error) {
      console.error(`[Agent Import] Error saving ${file.filename}:`, error);
      errors.push({ filename: file.filename, error: "Failed to save" });
      continue;
    }

    imported.push({ filename: file.filename, size });
  }

  return apiJson({ imported, skipped, errors });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
