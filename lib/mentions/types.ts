export type MentionType = 'human' | 'ai' | 'agent-to-human' | 'agent-to-agent';

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

export interface AgentToHumanMention extends BaseMention {
  type: 'agent-to-human';
  targetUserId: string;
  targetName: string;
  targetAvatar?: string;
  sourceAgentId: string;
  sourceAgentName: string;
}

export interface AgentToAgentMention extends BaseMention {
  type: 'agent-to-agent';
  targetAgentId: string;
  targetAgentName: string;
  sourceAgentId: string;
  sourceAgentName: string;
}

export type Mention = HumanMention | AIMention | AgentToHumanMention | AgentToAgentMention;

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
  icon?: React.ReactNode;
  description: string;
}
