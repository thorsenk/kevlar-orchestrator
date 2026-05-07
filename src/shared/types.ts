export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'stored' | 'streaming' | 'complete' | 'error';

export interface Project {
  id: string;
  name: string;
  rootPath: string;
  createdAt: number;
  lastOpenedAt: number | null;
  time?: string;
  isSub?: boolean;
}

export interface Chat {
  id: string;
  name: string;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
  time?: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: number;
  updatedAt: number;
}

export type TaskStatus = 'Idle' | 'Processing' | 'Awaiting User' | 'Completed';
export type CreatorType = 'User' | 'Agent';
export type PayloadType = 'markdown' | 'diff' | 'none';

export interface Task {
  id: string;
  projectId: string | null;
  projectTag: string;
  title: string;
  status: TaskStatus;
  creatorType: CreatorType;
  assignedAgent?: string | null;
  payloadType: PayloadType;
  payload?: {
    content: string;
    oldContent?: string;
    newContent?: string;
  };
  metadata?: {
    createdAt: string;
    updatedAt?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  agentId: string;
  name: string;
  role: string;
  status: 'active' | 'busy' | 'idle';
}

export interface TeamRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  roles: TeamRole[];
  createdAt: number;
  updatedAt: number;
}

export type SideCarKind = 'summary' | 'decision' | 'open_question' | 'next_step';

export interface SideCarCard {
  id: string;
  chatId: string;
  kind: SideCarKind;
  title: string;
  content: string;
  promotedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CodexStatus {
  ok: boolean;
  cliPath: string | null;
  version: string | null;
  loginStatus: string | null;
  defaultModel: string;
  defaultSandboxMode: 'workspace-write';
  warnings: string[];
  errors: string[];
}

export type AgentRunStatus = 'idle' | 'running' | 'cancelling' | 'completed' | 'failed';

export interface AgentRunState {
  chatId: string;
  runId?: string;
  status: AgentRunStatus;
  error?: string | null;
  stderr?: string | null;
  tokenCount?: number | null;
  startedAt?: number;
  completedAt?: number | null;
}

export interface CodexEvent {
  id: number;
  chatId: string | null;
  runId: string;
  type: string;
  payload: unknown;
  createdAt: number;
}

export type AgentStreamEvent =
  | {
      type: 'message_delta';
      chatId: string;
      messageId: string;
      content: string;
    }
  | {
      type: 'run_event';
      chatId: string;
      runId: string;
      eventType: string;
      payload: unknown;
    }
  | {
      type: 'run_complete';
      chatId: string;
      messageId: string;
      ok: boolean;
      error?: string;
    }
  | {
      type: 'run_state';
      state: AgentRunState;
    }
  | {
      type: 'data_changed';
      scope: 'projects' | 'chats' | 'messages' | 'tasks' | 'teams' | 'sidecar' | 'settings' | 'runs';
      chatId?: string;
    };

export interface CreateChatInput {
  name?: string;
  projectId?: string | null;
}

export interface SendAgentMessageInput {
  chatId?: string | null;
  projectId?: string | null;
  content: string;
}

export interface SendAgentMessageResult {
  chatId: string;
  userMessageId: string;
  assistantMessageId: string;
}

export interface KevlarApi {
  codex: {
    status(): Promise<CodexStatus>;
  };
  projects: {
    list(): Promise<Project[]>;
    pickFolder(): Promise<string | null>;
    create(input: {name?: string; rootPath?: string | null}): Promise<Project | null>;
    updateName(input: {id: string; name: string}): Promise<Project>;
    remove(id: string): Promise<{removed: boolean}>;
    touch(id: string): Promise<{ok: true}>;
  };
  chats: {
    list(): Promise<Chat[]>;
    create(input?: CreateChatInput): Promise<Chat>;
    updateName(input: {id: string; name: string}): Promise<Chat>;
    updateProject(input: {id: string; projectId: string | null}): Promise<Chat>;
    remove(id: string): Promise<{removed: boolean}>;
    messages(chatId: string): Promise<Message[]>;
    appendMessage(input: {chatId: string; role: MessageRole; content: string}): Promise<Message>;
  };
  tasks: {
    list(): Promise<Task[]>;
    create(input: {title: string; projectId?: string | null}): Promise<Task>;
    updateStatus(input: {id: string; status: TaskStatus}): Promise<Task>;
    updateTitle(input: {id: string; title: string}): Promise<Task>;
    updateAssignedAgent(input: {id: string; assignedAgent: string | null}): Promise<Task>;
    remove(id: string): Promise<{removed: boolean}>;
  };
  teams: {
    list(): Promise<Team[]>;
    create(input: {name: string; description: string}): Promise<Team>;
    updateProfile(input: {id: string; name: string; description: string}): Promise<Team>;
    remove(id: string): Promise<{removed: boolean}>;
  };
  agent: {
    sendMessage(input: SendAgentMessageInput): Promise<SendAgentMessageResult>;
    interrupt(chatId: string): Promise<{ok: true}>;
    runState(chatId: string): Promise<AgentRunState>;
  };
  sideCar: {
    cards(chatId: string): Promise<SideCarCard[]>;
    run(chatId: string): Promise<SideCarCard[]>;
    promote(cardId: string): Promise<Message>;
  };
  onAgentEvent(listener: (event: AgentStreamEvent) => void): () => void;
}
