import { addNotification } from "@/lib/notifications/store";

export interface MentionUser {
  id: string;
  name: string;
}

const LS_KEY = "knobase-app:known-users";

function readKnownUsers(): MentionUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeKnownUsers(users: MentionUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(users));
}

export function registerUser(user: MentionUser): void {
  const users = readKnownUsers();
  if (!users.some((u) => u.id === user.id)) {
    users.push(user);
    writeKnownUsers(users);
  }
}

export function getKnownUsers(): MentionUser[] {
  return readKnownUsers();
}

export function searchUsers(query: string): MentionUser[] {
  const q = query.toLowerCase();
  return readKnownUsers().filter((u) => u.name.toLowerCase().includes(q));
}

export function parseMentions(text: string): string[] {
  const re = /@(\w+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

export function processMentions(
  text: string,
  documentId: string,
  authorName: string,
): void {
  const mentionNames = parseMentions(text);
  if (mentionNames.length === 0) return;

  const users = readKnownUsers();

  mentionNames.forEach((name) => {
    const user = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
    if (user) {
      addNotification({
        type: "mention",
        message: `mentioned you in a comment`,
        actorName: authorName,
        documentId,
        link: `/knowledge?doc=${documentId}`,
      });
    }
  });
}

export function renderMentions(text: string): string {
  return text.replace(
    /@(\w+)/g,
    '<span class="mention font-medium text-purple-600 cursor-pointer hover:underline">@$1</span>',
  );
}
