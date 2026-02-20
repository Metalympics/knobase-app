export type AgentStatus = "online" | "offline" | "typing" | "thinking";

export type AgentCapability = "read" | "write" | "suggest" | "chat";

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  color: string;
  status: AgentStatus;
  personality: string;
  capabilities: AgentCapability[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentAction {
  action: "read" | "write" | "chat" | "summarize";
  documentId?: string;
  content?: string;
  context?: string;
}

export interface AgentResponse {
  success: boolean;
  content: string;
  reasoning?: string;
  model?: string;
  agentId: string;
  timestamp: string;
}

export interface ReasoningTrace {
  reasoning: string;
  model: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  confidence?: number;
}

export interface AgentSuggestion {
  id: string;
  agentId: string;
  documentId: string;
  originalContent: string;
  suggestedContent: string;
  reasoning: string;
  model: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}
