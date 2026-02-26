// ── Sanitization Engine ──
// Scans an OpenclawManifest for PII, API keys, and personal references.
// Returns a cleaned manifest + list of issues found.

import type {
  OpenclawManifest,
  SanitizeOptions,
  SanitizeResult,
  SanitizeIssue,
} from "./types";

/* ------------------------------------------------------------------ */
/* Patterns                                                            */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

// API key / secret patterns
const API_KEY_RE =
  /(?:api[_-]?key|secret[_-]?key|access[_-]?token|bearer|authorization|password|PRIVATE[_-]?KEY)[=:\s]["']?([a-zA-Z0-9_\-./+=]{16,})["']?/gi;
const ENV_VAR_RE =
  /(?:sk_live_|sk_test_|pk_live_|pk_test_|ghp_|gho_|github_pat_|xoxb-|xoxp-|AKIA)[a-zA-Z0-9_\-]{10,}/g;
const JWT_RE = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;

/** Strings that suggest personal reference */
const PERSONAL_MARKERS = [
  "my personal",
  "my private",
  "home address",
  "social security",
  "bank account",
  "credit card",
  "passport",
  "driver's license",
];

/* ------------------------------------------------------------------ */
/* Core scanner                                                        */
/* ------------------------------------------------------------------ */

/**
 * Scan and sanitize a manifest before listing on the marketplace.
 */
export function sanitizePackage(
  manifest: OpenclawManifest,
  options: SanitizeOptions = {}
): SanitizeResult {
  const opts: Required<SanitizeOptions> = {
    removePii: options.removePii ?? true,
    removeSecrets: options.removeSecrets ?? true,
    removePersonalRefs: options.removePersonalRefs ?? true,
  };

  const issues: SanitizeIssue[] = [];

  // Deep-clone so we don't mutate the original
  const cleaned: OpenclawManifest = JSON.parse(JSON.stringify(manifest));

  // Scan agents
  cleaned.agents.forEach((agent, i) => {
    const loc = `agents[${i}]`;

    if (agent.instructions) {
      agent.instructions = scanAndRedact(agent.instructions, `${loc}.instructions`, opts, issues);
    }
    if (agent.personality) {
      agent.personality = scanAndRedact(agent.personality, `${loc}.personality`, opts, issues);
    }
    if (agent.constraints) {
      agent.constraints = agent.constraints.map((c, ci) =>
        scanAndRedact(c, `${loc}.constraints[${ci}]`, opts, issues)
      );
    }
  });

  // Scan documents
  cleaned.documents.forEach((doc, i) => {
    const loc = `documents[${i}]`;
    doc.title = scanAndRedact(doc.title, `${loc}.title`, opts, issues);
    doc.content = scanAndRedact(doc.content, `${loc}.content`, opts, issues);
  });

  // Scan top-level fields
  cleaned.description = scanAndRedact(cleaned.description, "description", opts, issues);

  return {
    manifest: cleaned,
    issues,
    clean: issues.length === 0,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function scanAndRedact(
  text: string,
  location: string,
  opts: Required<SanitizeOptions>,
  issues: SanitizeIssue[]
): string {
  let result = text;

  if (opts.removePii) {
    result = redactMatches(result, EMAIL_RE, location, "pii", "Email address detected", issues);
    result = redactMatches(result, PHONE_RE, location, "pii", "Phone number detected", issues);
    result = redactMatches(result, SSN_RE, location, "pii", "SSN-like number detected", issues);
    result = redactMatches(result, IP_RE, location, "pii", "IP address detected", issues);
  }

  if (opts.removeSecrets) {
    result = redactMatches(result, API_KEY_RE, location, "secret", "API key / secret detected", issues);
    result = redactMatches(result, ENV_VAR_RE, location, "secret", "Service credential detected", issues);
    result = redactMatches(result, JWT_RE, location, "secret", "JWT token detected", issues);
  }

  if (opts.removePersonalRefs) {
    for (const marker of PERSONAL_MARKERS) {
      if (result.toLowerCase().includes(marker)) {
        issues.push({
          type: "personal_ref",
          severity: "warning",
          location,
          description: `Personal reference: "${marker}"`,
        });
      }
    }
  }

  return result;
}

function redactMatches(
  text: string,
  pattern: RegExp,
  location: string,
  type: SanitizeIssue["type"],
  description: string,
  issues: SanitizeIssue[]
): string {
  // Reset lastIndex for global regexes
  pattern.lastIndex = 0;

  let result = text;
  const matches = text.match(pattern);

  if (matches) {
    for (const match of matches) {
      issues.push({
        type,
        severity: type === "secret" ? "error" : "warning",
        location,
        description,
        original: match.slice(0, 8) + "***",
        redacted: "[REDACTED]",
      });
      result = result.replace(match, "[REDACTED]");
    }
  }

  return result;
}

/**
 * Quick check if a manifest has any issues (without redacting).
 * Useful for preview before full sanitization.
 */
export function quickScan(manifest: OpenclawManifest): SanitizeIssue[] {
  const result = sanitizePackage(manifest, {
    removePii: true,
    removeSecrets: true,
    removePersonalRefs: true,
  });
  return result.issues;
}
