export type TaskStatus = 'Idle' | 'Processing' | 'Awaiting User' | 'Completed';
export type CreatorType = 'User' | 'Agent';
export type PayloadType = 'markdown' | 'diff' | 'none';

export interface AgentTask {
  id: string;
  title: string;
  projectTag: string;
  status: TaskStatus;
  creatorType: CreatorType;
  assignedAgent?: string;
  payloadType: PayloadType;
  metadata?: {
    createdAt: string;
    updatedAt?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  payload?: {
    content: string;
    oldContent?: string; // For diffs
    newContent?: string; // For diffs
  };
}
