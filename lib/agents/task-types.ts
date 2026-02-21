export type TaskStatus = 
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskType = 
  | 'inline'
  | 'chat'
  | 'suggestion'
  | 'summarize';

export interface TextSelection {
  from: number;
  to: number;
  text: string;
}

export interface AgentInfo {
  name: string;
  model: string;
  provider: string;
  temperature?: number;
}

export interface AgentTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  prompt: string;
  documentId: string;
  documentTitle: string;
  selection?: TextSelection;
  result?: string;
  error?: string;
  agent: AgentInfo;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
