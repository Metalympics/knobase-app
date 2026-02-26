import { createClient } from "@/lib/supabase/client";
import type { AgentPersonaRow, AgentPersonaUpdate } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface LearnedPreferences {
  /** Topics the user frequently asks about */
  frequentTopics: string[];
  /** Preferred output length: "concise" | "detailed" | "balanced" */
  preferredLength: "concise" | "detailed" | "balanced";
  /** Preferred code style (if code tasks) */
  codeStyle?: {
    language?: string;
    useTypeAnnotations?: boolean;
    preferFunctional?: boolean;
  };
  /** Formatting preferences */
  formatting: {
    preferHeaders: boolean;
    preferBulletPoints: boolean;
    preferCodeBlocks: boolean;
    preferTables: boolean;
  };
  /** Words/phrases the user frequently modifies in proposals */
  dislikedPhrases: string[];
  /** Overall satisfaction score (rolling window) */
  satisfactionScore: number;
  /** Last updated */
  updatedAt: string;
}

export interface CommonPatterns {
  /** Most common task types requested */
  taskTypeFrequency: Record<string, number>;
  /** Average proposal acceptance rate */
  acceptanceRate: number;
  /** Common edit operations performed on proposals */
  commonModifications: string[];
  /** Time-of-day activity patterns (0-23 → count) */
  hourlyActivity: Record<number, number>;
  /** Average task completion time per type (ms) */
  avgCompletionByType: Record<string, number>;
  /** Total interactions analyzed */
  totalInteractions: number;
}

export interface LearningEvent {
  type: "task_completed" | "proposal_accepted" | "proposal_rejected" | "proposal_modified";
  agentId: string;
  workspaceId: string;
  taskType?: string;
  proposedContent?: string;
  modifiedContent?: string;
  completionTimeMs?: number;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_PREFERENCES: LearnedPreferences = {
  frequentTopics: [],
  preferredLength: "balanced",
  formatting: {
    preferHeaders: true,
    preferBulletPoints: true,
    preferCodeBlocks: true,
    preferTables: false,
  },
  dislikedPhrases: [],
  satisfactionScore: 0.5,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_PATTERNS: CommonPatterns = {
  taskTypeFrequency: {},
  acceptanceRate: 0,
  commonModifications: [],
  hourlyActivity: {},
  avgCompletionByType: {},
  totalInteractions: 0,
};

/* ------------------------------------------------------------------ */
/* Supabase client                                                     */
/* ------------------------------------------------------------------ */

const supabase = () => createClient();

/* ------------------------------------------------------------------ */
/* Read current persona                                                */
/* ------------------------------------------------------------------ */

async function getPersona(
  agentId: string,
  workspaceId: string,
): Promise<AgentPersonaRow | null> {
  const { data, error } = await supabase()
    .from("agent_personas")
    .select("*")
    .eq("agent_id", agentId)
    .eq("workspace_id", workspaceId)
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as AgentPersonaRow | null;
}

async function updatePersona(
  personaId: string,
  updates: AgentPersonaUpdate,
): Promise<void> {
  const { error } = await supabase()
    .from("agent_personas")
    .update(updates)
    .eq("id", personaId);

  if (error) {
    console.error("Failed to update persona:", error.message);
  }
}

/* ------------------------------------------------------------------ */
/* Learning logic                                                      */
/* ------------------------------------------------------------------ */

/** Extract topics from content (naive keyword extraction) */
function extractTopics(content: string): string[] {
  const words = content.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  const counts = new Map<string, number>();
  for (const w of words) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([w]) => w);
}

/** Detect content style preferences from accepted proposals */
function detectFormattingPrefs(content: string): Partial<LearnedPreferences["formatting"]> {
  return {
    preferHeaders: /^#{1,6}\s/m.test(content),
    preferBulletPoints: /^[-*]\s/m.test(content),
    preferCodeBlocks: /```/.test(content),
    preferTables: /\|.*\|/.test(content),
  };
}

/** Find phrases that were removed/replaced during modification */
function findDislikedPhrases(
  original: string,
  modified: string,
): string[] {
  const origWords = original.split(/\s+/);
  const modWords = new Set(modified.split(/\s+/));

  // Find sequences of 2-3 words in original that don't appear in modified
  const removed: string[] = [];
  for (let i = 0; i < origWords.length - 1; i++) {
    const bigram = `${origWords[i]} ${origWords[i + 1]}`;
    if (!modified.includes(bigram) && bigram.length > 6) {
      removed.push(bigram);
    }
  }

  return removed.slice(0, 5);
}

/** Infer preferred length from modification patterns */
function inferLengthPreference(
  originalLen: number,
  modifiedLen: number,
  currentPref: LearnedPreferences["preferredLength"],
): LearnedPreferences["preferredLength"] {
  const ratio = modifiedLen / Math.max(originalLen, 1);

  if (ratio < 0.7) return "concise";
  if (ratio > 1.3) return "detailed";
  return currentPref; // No strong signal, keep current
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Process a learning event and update the persona's learned_preferences
 * and common_patterns fields.
 */
export async function processLearningEvent(event: LearningEvent): Promise<void> {
  const persona = await getPersona(event.agentId, event.workspaceId);
  if (!persona) return; // No persona to learn for

  const prefs: LearnedPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(persona.learned_preferences as Partial<LearnedPreferences>),
  };
  const patterns: CommonPatterns = {
    ...DEFAULT_PATTERNS,
    ...(persona.common_patterns as Partial<CommonPatterns>),
  };

  patterns.totalInteractions++;

  // Update hourly activity
  const hour = new Date(event.timestamp).getHours();
  patterns.hourlyActivity[hour] = (patterns.hourlyActivity[hour] ?? 0) + 1;

  // Update task type frequency
  if (event.taskType) {
    patterns.taskTypeFrequency[event.taskType] =
      (patterns.taskTypeFrequency[event.taskType] ?? 0) + 1;
  }

  switch (event.type) {
    case "task_completed": {
      // Update average completion time
      if (event.taskType && event.completionTimeMs) {
        const prev = patterns.avgCompletionByType[event.taskType] ?? 0;
        const count = patterns.taskTypeFrequency[event.taskType] ?? 1;
        // Exponential moving average
        patterns.avgCompletionByType[event.taskType] =
          count === 1
            ? event.completionTimeMs
            : prev * 0.8 + event.completionTimeMs * 0.2;
      }
      break;
    }

    case "proposal_accepted": {
      // Increase satisfaction
      prefs.satisfactionScore = Math.min(
        1,
        prefs.satisfactionScore * 0.9 + 0.1,
      );

      // Update acceptance rate (rolling average)
      patterns.acceptanceRate =
        patterns.acceptanceRate * 0.9 + 1 * 0.1;

      // Learn formatting preferences from accepted content
      if (event.proposedContent) {
        const fmtPrefs = detectFormattingPrefs(event.proposedContent);
        prefs.formatting = { ...prefs.formatting, ...fmtPrefs };

        // Extract topics
        const topics = extractTopics(event.proposedContent);
        const existing = new Set(prefs.frequentTopics);
        for (const t of topics) {
          existing.add(t);
        }
        prefs.frequentTopics = Array.from(existing).slice(0, 20);
      }
      break;
    }

    case "proposal_rejected": {
      // Decrease satisfaction slightly
      prefs.satisfactionScore = Math.max(
        0,
        prefs.satisfactionScore * 0.9,
      );

      // Update acceptance rate
      patterns.acceptanceRate =
        patterns.acceptanceRate * 0.9 + 0 * 0.1;
      break;
    }

    case "proposal_modified": {
      // Moderate satisfaction
      prefs.satisfactionScore =
        prefs.satisfactionScore * 0.9 + 0.05;

      // Update acceptance rate (count as partial accept)
      patterns.acceptanceRate =
        patterns.acceptanceRate * 0.9 + 0.5 * 0.1;

      // Learn from modifications
      if (event.proposedContent && event.modifiedContent) {
        // Find disliked phrases
        const disliked = findDislikedPhrases(
          event.proposedContent,
          event.modifiedContent,
        );
        const existingDisliked = new Set(prefs.dislikedPhrases);
        for (const d of disliked) {
          existingDisliked.add(d);
        }
        prefs.dislikedPhrases = Array.from(existingDisliked).slice(0, 30);

        // Infer length preference
        prefs.preferredLength = inferLengthPreference(
          event.proposedContent.length,
          event.modifiedContent.length,
          prefs.preferredLength,
        );

        // Track modification type
        const modType =
          event.modifiedContent.length < event.proposedContent.length
            ? "shortened"
            : event.modifiedContent.length > event.proposedContent.length
              ? "expanded"
              : "rephrased";
        if (!patterns.commonModifications.includes(modType)) {
          patterns.commonModifications.push(modType);
        }

        // Learn formatting from what user actually wants
        const fmtPrefs = detectFormattingPrefs(event.modifiedContent);
        prefs.formatting = { ...prefs.formatting, ...fmtPrefs };
      }
      break;
    }
  }

  prefs.updatedAt = new Date().toISOString();

  // Persist to Supabase
  await updatePersona(persona.id, {
    learned_preferences: prefs as unknown as Record<string, unknown>,
    common_patterns: patterns as unknown as Record<string, unknown>,
    last_used_at: new Date().toISOString(),
  });
}

/**
 * Get a system prompt supplement based on learned preferences.
 * Append to the persona's base instructions for personalized behavior.
 */
export function generatePreferenceSupplement(
  prefs: LearnedPreferences,
): string {
  const lines: string[] = [];

  if (prefs.preferredLength === "concise") {
    lines.push("Keep responses concise and to-the-point.");
  } else if (prefs.preferredLength === "detailed") {
    lines.push("Provide thorough, detailed responses with examples.");
  }

  if (prefs.formatting.preferBulletPoints) {
    lines.push("Use bullet points for clarity when listing items.");
  }
  if (prefs.formatting.preferCodeBlocks) {
    lines.push("Include code blocks with syntax highlighting when showing code.");
  }
  if (prefs.formatting.preferTables) {
    lines.push("Use markdown tables when comparing options or showing structured data.");
  }
  if (!prefs.formatting.preferHeaders) {
    lines.push("Minimize use of headings; prefer flowing prose.");
  }

  if (prefs.dislikedPhrases.length > 0) {
    lines.push(
      `Avoid these phrases: ${prefs.dislikedPhrases.slice(0, 10).join(", ")}`,
    );
  }

  if (prefs.frequentTopics.length > 0) {
    lines.push(
      `The user frequently works with: ${prefs.frequentTopics.slice(0, 5).join(", ")}.`,
    );
  }

  return lines.join("\n");
}

/**
 * Get analytics summary for display in the persona settings.
 */
export function getLearningSummary(
  prefs: LearnedPreferences,
  patterns: CommonPatterns,
): {
  satisfactionLabel: string;
  satisfactionColor: string;
  topTaskTypes: string[];
  peakHours: number[];
  totalInteractions: number;
  acceptanceRatePct: number;
} {
  // Find peak activity hours
  const hourEntries = Object.entries(patterns.hourlyActivity)
    .map(([h, c]) => ({ hour: Number(h), count: c }))
    .sort((a, b) => b.count - a.count);
  const peakHours = hourEntries.slice(0, 3).map((e) => e.hour);

  // Top task types
  const topTaskTypes = Object.entries(patterns.taskTypeFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([t]) => t);

  const score = prefs.satisfactionScore;
  const satisfactionLabel =
    score >= 0.7 ? "High" : score >= 0.4 ? "Medium" : "Low";
  const satisfactionColor =
    score >= 0.7
      ? "text-emerald-600"
      : score >= 0.4
        ? "text-amber-600"
        : "text-red-600";

  return {
    satisfactionLabel,
    satisfactionColor,
    topTaskTypes,
    peakHours,
    totalInteractions: patterns.totalInteractions,
    acceptanceRatePct: Math.round(patterns.acceptanceRate * 100),
  };
}
