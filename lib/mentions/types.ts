export type MentionType = 'human' | 'ai';

export interface BaseMention {
  type: MentionType;
  id: string;
}

export interface HumanMention extends BaseMention {
  type: 'human';
  userId: string;
  name: string;
  avatar?: string;
  color?: string;
}

export interface AIMention extends BaseMention {
  type: 'ai';
  agentId: string;
  model: string;
  provider: string;
  taskId?: string;
}

export type Mention = HumanMention | AIMention;

export interface MentionableUser {
  userId: string;
  displayName: string;
  avatar?: string;
  color?: string;
  role?: string;
}

export interface MentionableAgent {
  id: string;
  model: string;
  provider: string;
  icon: React.ReactNode;
  description: string;
}
