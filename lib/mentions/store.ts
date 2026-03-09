import type { MentionableUser, MentionableAgent, HumanMention } from './types';
import type { SchoolWithMembers } from '@/lib/schools/types';
import { getWorkspace, getCurrentUserId } from '@/lib/schools/store';
import { addNotification } from '@/lib/notifications/store';

/**
 * Get all mentionable users in a workspace
 */
export function getWorkspaceUsers(workspaceId: string): MentionableUser[] {
  const workspace = getWorkspace(workspaceId) as SchoolWithMembers | null;
  if (!workspace?.members?.length) return [];
  
  const currentUserId = getCurrentUserId();
  
  return workspace.members
    .filter(member => member.userId !== currentUserId)
    .map(member => ({
      userId: member.userId,
      displayName: member.user?.displayName ?? member.userId,
      role: member.role,
      color: hashToColor(member.userId),
    }));
}

/**
 * Search for mentionable users by query
 */
export function searchWorkspaceUsers(
  workspaceId: string,
  query: string
): MentionableUser[] {
  const users = getWorkspaceUsers(workspaceId);
  const q = query.toLowerCase();
  
  return users.filter(user =>
    user.displayName.toLowerCase().includes(q)
  );
}

/**
 * Create notification for mentioned user
 */
export function notifyMentionedUser(
  mention: HumanMention,
  documentId: string,
  documentTitle: string,
  authorName: string
): void {
  addNotification({
    type: 'mention',
    message: `mentioned you in "${documentTitle}"`,
    actorName: authorName,
    documentId,
    link: `/d/${documentId}`,
  });
}

/**
 * Generate consistent color from string
 */
function hashToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Get display initial for avatar
 */
export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}
