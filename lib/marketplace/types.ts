// ── Marketplace Types ──
// Shared types for .openclaw package manifests, import options, and results.

/* ------------------------------------------------------------------ */
/* .openclaw Manifest Schema                                           */
/* ------------------------------------------------------------------ */

export interface OpenclawManifest {
  version: string; // e.g. "1.0"
  name: string;
  description: string;
  author?: string;
  created_at?: string;

  agents: OpenclawAgent[];
  documents: OpenclawDocument[];
  workflows: OpenclawWorkflow[];
}

export interface OpenclawAgent {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  color?: string;
  tone?: string;
  personality?: string;
  expertise?: string[];
  instructions?: string;
  constraints?: string[];
  capabilities?: string[];
}

export interface OpenclawDocument {
  id: string;
  title: string;
  content: string; // markdown
  tags?: string[];
}

export interface OpenclawWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: Record<string, unknown>[];
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export interface ImportOptions {
  /** Import into existing workspace or create new */
  workspaceId?: string;
  newWorkspaceName?: string;

  /** Cherry-pick which items to import */
  selectedAgentIds?: string[];
  selectedDocumentIds?: string[];
  selectedWorkflowIds?: string[];

  /** Source tracking */
  sourceType: "file_upload" | "marketplace_purchase" | "url";
  sourceId?: string; // pack_id if from marketplace
  originalFilename?: string;
}

export interface ImportResult {
  success: boolean;
  workspaceId: string;
  importJobId: string;
  agentsCreated: number;
  documentsCreated: number;
  workflowsCreated: number;
  errors: string[];
}

/* ------------------------------------------------------------------ */
/* Sanitization                                                        */
/* ------------------------------------------------------------------ */

export interface SanitizeOptions {
  /** Remove PII (emails, phones, addresses) */
  removePii?: boolean;
  /** Remove API keys and secrets */
  removeSecrets?: boolean;
  /** Remove personal document references */
  removePersonalRefs?: boolean;
}

export interface SanitizeResult {
  manifest: OpenclawManifest;
  issues: SanitizeIssue[];
  clean: boolean;
}

export interface SanitizeIssue {
  type: "pii" | "secret" | "personal_ref";
  severity: "warning" | "error";
  location: string; // e.g. "agents[0].instructions"
  description: string;
  original?: string;
  redacted?: string;
}

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

export interface CreateListingInput {
  name: string;
  description: string;
  shortDescription?: string;
  readme?: string;
  priceCents: number;
  categories: string[];
  tags: string[];
  manifest: OpenclawManifest;
  thumbnailUrl?: string;
  previewImages?: string[];
}
