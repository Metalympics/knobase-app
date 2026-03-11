export interface AIBlockMeta {
  type: "ai";
  reasoning: string;
  model: string;
  agentId: string;
  agentName: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  blockId: string;
  text: string;
  author: string;
  timestamp: string;
  replies: Comment[];
  resolved?: boolean;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  icon?: string | null;
  contentJson?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  aiBlocks?: AIBlockMeta[];
  tags?: string[];
  parentId?: string;
  position?: number;
  comments?: Comment[];
  wordCount?: number;
}

export type DocumentMeta = Omit<Document, "content" | "aiBlocks" | "comments">;
