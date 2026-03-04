/**
 * Mention Detector
 * 
 * Scans document text and agent responses for @username patterns
 * and resolves them to actual users/agents in the workspace.
 * 
 * User Flow:
 * 1. Agent writes response: "@chris analysis complete. please review."
 * 2. Detector finds @chris pattern
 * 3. Resolves "chris" to user ID via workspace lookup
 * 4. Creates mention record and notification
 * 5. Renders as inline badge in editor
 */

import type { MentionableUser, MentionableAgent } from './types';

export interface DetectedMention {
  /** Type of target being mentioned */
  targetType: 'user' | 'agent';
  /** ID of the target (user_id or agent_id) */
  targetId: string;
  /** Display name of target */
  targetName: string;
  /** Avatar/emoji for target */
  targetAvatar?: string;
  /** If agent mentioned, the agent's ID */
  sourceAgentId?: string;
  /** If agent mentioned, the agent's name */
  sourceAgentName?: string;
  /** Position in text where mention was found */
  position: { from: number; to: number };
  /** Raw text matched (e.g., "@chris") */
  rawText: string;
  /** The full line/context around mention */
  context: string;
}

export interface MentionDetectionResult {
  mentions: DetectedMention[];
  /** Text with mentions processed/stripped */
  processedText: string;
}

// Regex to match @username patterns
// Matches: @username, @user-name, @user_name
// Does NOT match: @ in email@domain.com, @ in code blocks, @123 (numeric only)
const MENTION_REGEX = /@([a-zA-Z][a-zA-Z0-9_-]*)/g;

// Regex to detect code blocks (markdown or inline)
const CODE_BLOCK_REGEX = /```[\s\S]*?```|`[^`]*`/g;

// Regex to detect email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Regex to detect URLs
const URL_REGEX = /https?:\/\/[^\s]+/g;

/**
 * Extract all positions that should be excluded from mention detection
 * (code blocks, emails, URLs)
 */
function getExcludedRanges(text: string): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];

  // Code blocks
  let match;
  while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
    ranges.push({ from: match.index, to: match.index + match[0].length });
  }

  // Emails
  while ((match = EMAIL_REGEX.exec(text)) !== null) {
    ranges.push({ from: match.index, to: match.index + match[0].length });
  }

  // URLs
  while ((match = URL_REGEX.exec(text)) !== null) {
    ranges.push({ from: match.index, to: match.index + match[0].length });
  }

  return ranges;
}

/**
 * Check if a position is inside any excluded range
 */
function isInExcludedRange(
  pos: number,
  ranges: Array<{ from: number; to: number }>
): boolean {
  return ranges.some((r) => pos >= r.from && pos < r.to);
}

/**
 * Find all @mentions in text
 * 
 * @param text - The text to scan
 * @param workspaceUsers - List of valid users in workspace
 * @param availableAgents - List of available agents
 * @param options - Detection options
 * @returns Detected mentions with positions
 */
export function detectMentions(
  text: string,
  workspaceUsers: MentionableUser[],
  availableAgents: MentionableAgent[],
  options: {
    /** If provided, marks mentions as coming from this agent */
    sourceAgentId?: string;
    sourceAgentName?: string;
  } = {}
): MentionDetectionResult {
  const mentions: DetectedMention[] = [];
  const excludedRanges = getExcludedRanges(text);

  // Create lookup maps for fast resolution
  const userMap = new Map<string, MentionableUser>();
  workspaceUsers.forEach((user) => {
    userMap.set(user.displayName.toLowerCase(), user);
    // Also map by userId for direct mentions
    userMap.set(user.userId.toLowerCase(), user);
  });

  const agentMap = new Map<string, MentionableAgent>();
  availableAgents.forEach((agent) => {
    agentMap.set(agent.id.toLowerCase(), agent);
    // Extract name from model or use id
    const agentName = agent.model || agent.id;
    agentMap.set(agentName.toLowerCase(), agent);
  });

  // Reset regex lastIndex
  MENTION_REGEX.lastIndex = 0;

  let match;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const mentionStart = match.index;
    const mentionEnd = mentionStart + match[0].length;
    const username = match[1].toLowerCase();

    // Skip if inside excluded range (code, email, URL)
    if (isInExcludedRange(mentionStart, excludedRanges)) {
      continue;
    }

    // Try to resolve as user first, then agent
    const user = userMap.get(username);
    if (user) {
      // Extract context (line containing the mention)
      const lineStart = text.lastIndexOf('\n', mentionStart) + 1;
      const lineEnd = text.indexOf('\n', mentionEnd);
      const context = text.slice(
        lineStart,
        lineEnd === -1 ? undefined : lineEnd
      ).trim();

      mentions.push({
        targetType: 'user',
        targetId: user.userId,
        targetName: user.displayName,
        targetAvatar: user.avatar,
        sourceAgentId: options.sourceAgentId,
        sourceAgentName: options.sourceAgentName,
        position: { from: mentionStart, to: mentionEnd },
        rawText: match[0],
        context,
      });
      continue;
    }

    // Try agent
    const agent = agentMap.get(username);
    if (agent) {
      const lineStart = text.lastIndexOf('\n', mentionStart) + 1;
      const lineEnd = text.indexOf('\n', mentionEnd);
      const context = text.slice(
        lineStart,
        lineEnd === -1 ? undefined : lineEnd
      ).trim();

      mentions.push({
        targetType: 'agent',
        targetId: agent.id,
        targetName: agent.model || agent.id,
        sourceAgentId: options.sourceAgentId,
        sourceAgentName: options.sourceAgentName,
        position: { from: mentionStart, to: mentionEnd },
        rawText: match[0],
        context,
      });
    }
  }

  // Remove duplicate mentions (same target, overlapping positions)
  const uniqueMentions = mentions.filter((m, index, self) =>
    index === self.findIndex((t) => 
      t.targetId === m.targetId && 
      Math.abs(t.position.from - m.position.from) < 5
    )
  );

  return {
    mentions: uniqueMentions,
    processedText: text, // Original text preserved for display
  };
}

/**
 * Extract just the mention targets from text (for quick scanning)
 */
export function extractMentionTargets(text: string): string[] {
  const targets: string[] = [];
  const excludedRanges = getExcludedRanges(text);

  let match;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    if (!isInExcludedRange(match.index, excludedRanges)) {
      targets.push(match[1].toLowerCase());
    }
  }

  return [...new Set(targets)]; // Deduplicate
}

/**
 * Check if text contains any @mentions
 */
export function hasMentions(text: string): boolean {
  const excludedRanges = getExcludedRanges(text);
  let match;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    if (!isInExcludedRange(match.index, excludedRanges)) {
      return true;
    }
  }
  return false;
}

/**
 * Format text for agent context
 * Shows available users/agents agent can mention
 */
export function formatMentionContext(
  workspaceUsers: MentionableUser[],
  availableAgents: MentionableAgent[]
): string {
  const userList = workspaceUsers
    .map((u) => `@${u.displayName.toLowerCase().replace(/\s+/g, '')}`)
    .join(', ');

  const agentList = availableAgents
    .map((a) => `@${a.id}`)
    .join(', ');

  let context = '';
  if (userList) {
    context += `Users you can mention: ${userList}\n`;
  }
  if (agentList) {
    context += `Agents you can mention: ${agentList}\n`;
  }
  context += '\nTo mention someone, include @username in your response.\n';
  context += 'Example: "@chris analysis complete. please review."\n';

  return context;
}
