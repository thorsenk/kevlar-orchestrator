import {randomUUID} from 'node:crypto';
import path from 'node:path';
import type {
  AgentRunState,
  AgentRunStatus,
  Chat,
  CodexEvent,
  CreatorType,
  Message,
  MessageRole,
  MessageStatus,
  PayloadType,
  Project,
  SideCarCard,
  SideCarKind,
  Task,
  TaskStatus,
  Team,
  TeamMember,
  TeamRole,
} from '../../src/shared/types';
import {getDB} from './index';

type ProjectRow = {
  id: string;
  name: string;
  root_path: string;
  created_at: number;
  last_opened_at: number | null;
};

type ChatRow = {
  id: string;
  name: string;
  project_id: string | null;
  created_at: number;
  updated_at: number;
};

type MessageRow = {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  created_at: number;
  updated_at: number;
};

type TaskRow = {
  id: string;
  project_id: string | null;
  title: string;
  status: TaskStatus;
  creator_type: CreatorType;
  assigned_agent: string | null;
  payload_type: PayloadType;
  payload: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
};

type TeamRow = {
  id: string;
  name: string;
  description: string;
  members: string;
  roles: string;
  created_at: number;
  updated_at: number;
};

type SideCarRow = {
  id: string;
  chat_id: string;
  kind: SideCarKind;
  title: string;
  content: string;
  promoted_at: number | null;
  created_at: number;
  updated_at: number;
};

type CodexEventRow = {
  id: number;
  chat_id: string | null;
  run_id: string;
  type: string;
  payload: string;
  created_at: number;
};

type CodexRunRow = {
  run_id: string;
  chat_id: string;
  status: Exclude<AgentRunStatus, 'idle'>;
  error: string | null;
  stderr: string | null;
  token_count: number | null;
  started_at: number;
  completed_at: number | null;
};

function now(): number {
  return Date.now();
}

function timeAgo(ts: number | null): string {
  if (!ts) return '';
  const diff = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    rootPath: row.root_path,
    createdAt: row.created_at,
    lastOpenedAt: row.last_opened_at,
    time: timeAgo(row.last_opened_at ?? row.created_at),
    isSub: false,
  };
}

function chatFromRow(row: ChatRow): Chat {
  return {
    id: row.id,
    name: row.name,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    time: timeAgo(row.updated_at),
  };
}

function messageFromRow(row: MessageRow): Message {
  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskFromRow(row: TaskRow): Task {
  const metadata = parseJson<Task['metadata']>(row.metadata, undefined);
  return {
    id: row.id,
    projectId: row.project_id,
    projectTag: row.project_id ?? 'Global',
    title: row.title,
    status: row.status,
    creatorType: row.creator_type,
    assignedAgent: row.assigned_agent,
    payloadType: row.payload_type,
    payload: parseJson<Task['payload']>(row.payload, undefined),
    metadata: metadata ?? {
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function teamFromRow(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    members: parseJson(row.members, []),
    roles: parseJson(row.roles, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sideCarFromRow(row: SideCarRow): SideCarCard {
  return {
    id: row.id,
    chatId: row.chat_id,
    kind: row.kind,
    title: row.title,
    content: row.content,
    promotedAt: row.promoted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function codexEventFromRow(row: CodexEventRow): CodexEvent {
  return {
    id: row.id,
    chatId: row.chat_id,
    runId: row.run_id,
    type: row.type,
    payload: parseJson<unknown>(row.payload, row.payload),
    createdAt: row.created_at,
  };
}

function runStateFromRow(row: CodexRunRow): AgentRunState {
  return {
    chatId: row.chat_id,
    runId: row.run_id,
    status: row.status,
    error: row.error,
    stderr: row.stderr,
    tokenCount: row.token_count,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export function listProjects(): Project[] {
  const rows = getDB()
    .prepare(
      `SELECT id, name, root_path, created_at, last_opened_at
       FROM projects
       ORDER BY COALESCE(last_opened_at, created_at) DESC`,
    )
    .all() as ProjectRow[];
  return rows.map(projectFromRow);
}

export function createProject(rootPath: string, name?: string): Project {
  const abs = path.resolve(rootPath);
  const id = randomUUID();
  const ts = now();
  getDB()
    .prepare(
      `INSERT INTO projects (id, name, root_path, created_at, last_opened_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(root_path) DO UPDATE SET
         name = excluded.name,
         last_opened_at = excluded.last_opened_at`,
    )
    .run(id, name?.trim() || path.basename(abs), abs, ts, ts);
  const row = getDB()
    .prepare(`SELECT id, name, root_path, created_at, last_opened_at FROM projects WHERE root_path = ?`)
    .get(abs) as ProjectRow;
  return projectFromRow(row);
}

export function updateProjectName(id: string, name: string): Project {
  getDB().prepare(`UPDATE projects SET name = ? WHERE id = ?`).run(name, id);
  const row = getDB()
    .prepare(`SELECT id, name, root_path, created_at, last_opened_at FROM projects WHERE id = ?`)
    .get(id) as ProjectRow | undefined;
  if (!row) throw new Error(`Project not found: ${id}`);
  return projectFromRow(row);
}

export function removeProject(id: string): {removed: boolean} {
  const result = getDB().prepare(`DELETE FROM projects WHERE id = ?`).run(id);
  return {removed: result.changes > 0};
}

export function touchProject(id: string): {ok: true} {
  getDB().prepare(`UPDATE projects SET last_opened_at = ? WHERE id = ?`).run(now(), id);
  return {ok: true};
}

export function listChats(): Chat[] {
  const rows = getDB()
    .prepare(`SELECT id, name, project_id, created_at, updated_at FROM chats ORDER BY updated_at DESC`)
    .all() as ChatRow[];
  return rows.map(chatFromRow);
}

export function createChat(name = 'New Chat', projectId: string | null = null): Chat {
  const id = randomUUID();
  const ts = now();
  getDB()
    .prepare(
      `INSERT INTO chats (id, name, project_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, name, projectId, ts, ts);
  return getChat(id);
}

export function getChat(id: string): Chat {
  const row = getDB()
    .prepare(`SELECT id, name, project_id, created_at, updated_at FROM chats WHERE id = ?`)
    .get(id) as ChatRow | undefined;
  if (!row) throw new Error(`Chat not found: ${id}`);
  return chatFromRow(row);
}

export function updateChatName(id: string, name: string): Chat {
  getDB().prepare(`UPDATE chats SET name = ?, updated_at = ? WHERE id = ?`).run(name, now(), id);
  return getChat(id);
}

export function updateChatProject(id: string, projectId: string | null): Chat {
  getDB().prepare(`UPDATE chats SET project_id = ?, updated_at = ? WHERE id = ?`).run(projectId || null, now(), id);
  return getChat(id);
}

export function removeChat(id: string): {removed: boolean} {
  const result = getDB().prepare(`DELETE FROM chats WHERE id = ?`).run(id);
  return {removed: result.changes > 0};
}

export function listMessages(chatId: string): Message[] {
  const rows = getDB()
    .prepare(
      `SELECT id, chat_id, role, content, status, created_at, updated_at
       FROM messages WHERE chat_id = ? ORDER BY created_at ASC`,
    )
    .all(chatId) as MessageRow[];
  return rows.map(messageFromRow);
}

export function appendMessage(chatId: string, role: MessageRole, content: string, status: MessageStatus = 'stored'): Message {
  const id = randomUUID();
  const ts = now();
  getDB()
    .prepare(
      `INSERT INTO messages (id, chat_id, role, content, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, chatId, role, content, status, ts, ts);
  getDB().prepare(`UPDATE chats SET updated_at = ? WHERE id = ?`).run(ts, chatId);
  return getMessage(id);
}

export function getMessage(id: string): Message {
  const row = getDB()
    .prepare(`SELECT id, chat_id, role, content, status, created_at, updated_at FROM messages WHERE id = ?`)
    .get(id) as MessageRow | undefined;
  if (!row) throw new Error(`Message not found: ${id}`);
  return messageFromRow(row);
}

export function updateMessage(id: string, content: string, status: MessageStatus): Message {
  const ts = now();
  getDB().prepare(`UPDATE messages SET content = ?, status = ?, updated_at = ? WHERE id = ?`).run(content, status, ts, id);
  return getMessage(id);
}

export function listTasks(): Task[] {
  const rows = getDB()
    .prepare(
      `SELECT id, project_id, title, status, creator_type, assigned_agent, payload_type, payload, metadata, created_at, updated_at
       FROM tasks ORDER BY updated_at DESC`,
    )
    .all() as TaskRow[];
  return rows.map(taskFromRow);
}

export function createTask(title: string, projectId: string | null = null): Task {
  const id = randomUUID();
  const ts = now();
  const metadata = {createdAt: new Date(ts).toISOString()};
  getDB()
    .prepare(
      `INSERT INTO tasks (id, project_id, title, status, creator_type, assigned_agent, payload_type, payload, metadata, created_at, updated_at)
       VALUES (?, ?, ?, 'Idle', 'User', NULL, 'none', NULL, ?, ?, ?)`,
    )
    .run(id, projectId, title, JSON.stringify(metadata), ts, ts);
  return getTask(id);
}

export function getTask(id: string): Task {
  const row = getDB()
    .prepare(
      `SELECT id, project_id, title, status, creator_type, assigned_agent, payload_type, payload, metadata, created_at, updated_at
       FROM tasks WHERE id = ?`,
    )
    .get(id) as TaskRow | undefined;
  if (!row) throw new Error(`Task not found: ${id}`);
  return taskFromRow(row);
}

export function updateTask(id: string, fields: {title?: string; status?: TaskStatus; assignedAgent?: string | null}): Task {
  const current = getTask(id);
  const ts = now();
  const metadata = {...current.metadata, updatedAt: new Date(ts).toISOString()};
  getDB()
    .prepare(
      `UPDATE tasks
       SET title = ?, status = ?, assigned_agent = ?, metadata = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      fields.title ?? current.title,
      fields.status ?? current.status,
      fields.assignedAgent === undefined ? current.assignedAgent ?? null : fields.assignedAgent,
      JSON.stringify(metadata),
      ts,
      id,
    );
  return getTask(id);
}

export function removeTask(id: string): {removed: boolean} {
  const result = getDB().prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  return {removed: result.changes > 0};
}

export function listTeams(): Team[] {
  const rows = getDB()
    .prepare(`SELECT id, name, description, members, roles, created_at, updated_at FROM teams ORDER BY updated_at DESC`)
    .all() as TeamRow[];
  return rows.map(teamFromRow);
}

export function createTeam(name: string, description: string): Team {
  const id = randomUUID();
  const ts = now();
  getDB()
    .prepare(
      `INSERT INTO teams (id, name, description, members, roles, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, name, description, '[]', '[]', ts, ts);
  return getTeam(id);
}

export function getTeam(id: string): Team {
  const row = getDB()
    .prepare(`SELECT id, name, description, members, roles, created_at, updated_at FROM teams WHERE id = ?`)
    .get(id) as TeamRow | undefined;
  if (!row) throw new Error(`Team not found: ${id}`);
  return teamFromRow(row);
}

export function updateTeamProfile(id: string, name: string, description: string): Team {
  getDB().prepare(`UPDATE teams SET name = ?, description = ?, updated_at = ? WHERE id = ?`).run(name, description, now(), id);
  return getTeam(id);
}

export function addTeamMember(teamId: string, input: {name: string; role: string}): Team {
  const team = getTeam(teamId);
  const member: TeamMember = {
    agentId: randomUUID(),
    name: input.name,
    role: input.role,
    status: 'idle',
  };
  getDB()
    .prepare(`UPDATE teams SET members = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify([...team.members, member]), now(), teamId);
  return getTeam(teamId);
}

export function removeTeamMember(teamId: string, agentId: string): Team {
  const team = getTeam(teamId);
  getDB()
    .prepare(`UPDATE teams SET members = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(team.members.filter((member) => member.agentId !== agentId)), now(), teamId);
  return getTeam(teamId);
}

export function addTeamRole(teamId: string, input: {name: string; permissions: string[]}): Team {
  const team = getTeam(teamId);
  const role: TeamRole = {
    id: randomUUID(),
    name: input.name,
    permissions: input.permissions,
  };
  getDB()
    .prepare(`UPDATE teams SET roles = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify([...team.roles, role]), now(), teamId);
  return getTeam(teamId);
}

export function removeTeamRole(teamId: string, roleId: string): Team {
  const team = getTeam(teamId);
  getDB()
    .prepare(`UPDATE teams SET roles = ?, updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(team.roles.filter((role) => role.id !== roleId)), now(), teamId);
  return getTeam(teamId);
}

export function removeTeam(id: string): {removed: boolean} {
  const result = getDB().prepare(`DELETE FROM teams WHERE id = ?`).run(id);
  return {removed: result.changes > 0};
}

export function listSideCarCards(chatId: string): SideCarCard[] {
  const rows = getDB()
    .prepare(
      `SELECT id, chat_id, kind, title, content, promoted_at, created_at, updated_at
       FROM sidecar_cards WHERE chat_id = ? ORDER BY created_at DESC`,
    )
    .all(chatId) as SideCarRow[];
  return rows.map(sideCarFromRow);
}

export function replaceSideCarCards(chatId: string, cards: Array<{kind: SideCarKind; title: string; content: string}>): SideCarCard[] {
  const ts = now();
  const db = getDB();
  const insert = db.prepare(
    `INSERT INTO sidecar_cards (id, chat_id, kind, title, content, promoted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
  );
  const transaction = db.transaction(() => {
    db.prepare(`DELETE FROM sidecar_cards WHERE chat_id = ? AND promoted_at IS NULL`).run(chatId);
    for (const card of cards) {
      insert.run(randomUUID(), chatId, card.kind, card.title, card.content, ts, ts);
    }
  });
  transaction();
  return listSideCarCards(chatId);
}

export function clearSideCarCards(chatId: string): {removed: number} {
  const result = getDB().prepare(`DELETE FROM sidecar_cards WHERE chat_id = ?`).run(chatId);
  return {removed: result.changes};
}

export function promoteSideCarCard(cardId: string): Message {
  const row = getDB()
    .prepare(`SELECT id, chat_id, kind, title, content, promoted_at, created_at, updated_at FROM sidecar_cards WHERE id = ?`)
    .get(cardId) as SideCarRow | undefined;
  if (!row) throw new Error(`Side-Car card not found: ${cardId}`);
  const ts = now();
  getDB().prepare(`UPDATE sidecar_cards SET promoted_at = ?, updated_at = ? WHERE id = ?`).run(ts, ts, cardId);
  return appendMessage(row.chat_id, 'user', `Side-Car ${row.title}\n\n${row.content}`, 'stored');
}

export function persistCodexEvent(chatId: string | null, runId: string, type: string, payload: unknown): void {
  getDB()
    .prepare(`INSERT INTO codex_events (chat_id, run_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(chatId, runId, type, JSON.stringify(payload), now());
}

export function listCodexEvents(chatId?: string | null): CodexEvent[] {
  const rows = chatId
    ? (getDB()
        .prepare(`SELECT id, chat_id, run_id, type, payload, created_at FROM codex_events WHERE chat_id = ? ORDER BY id ASC`)
        .all(chatId) as CodexEventRow[])
    : (getDB()
        .prepare(`SELECT id, chat_id, run_id, type, payload, created_at FROM codex_events ORDER BY id ASC`)
        .all() as CodexEventRow[]);
  return rows.map(codexEventFromRow);
}

export function createCodexRun(chatId: string, runId: string): AgentRunState {
  const ts = now();
  getDB()
    .prepare(
      `INSERT INTO codex_runs (run_id, chat_id, status, error, stderr, token_count, started_at, completed_at)
       VALUES (?, ?, 'running', NULL, NULL, NULL, ?, NULL)`,
    )
    .run(runId, chatId, ts);
  return getCodexRun(runId);
}

export function getCodexRun(runId: string): AgentRunState {
  const row = getDB()
    .prepare(
      `SELECT run_id, chat_id, status, error, stderr, token_count, started_at, completed_at
       FROM codex_runs WHERE run_id = ?`,
    )
    .get(runId) as CodexRunRow | undefined;
  if (!row) throw new Error(`Codex run not found: ${runId}`);
  return runStateFromRow(row);
}

export function updateCodexRun(
  runId: string,
  fields: {
    status?: Exclude<AgentRunStatus, 'idle'>;
    error?: string | null;
    stderr?: string | null;
    tokenCount?: number | null;
    completedAt?: number | null;
  },
): AgentRunState {
  const current = getCodexRun(runId);
  getDB()
    .prepare(
      `UPDATE codex_runs
       SET status = ?, error = ?, stderr = ?, token_count = ?, completed_at = ?
       WHERE run_id = ?`,
    )
    .run(
      fields.status ?? current.status,
      fields.error === undefined ? current.error ?? null : fields.error,
      fields.stderr === undefined ? current.stderr ?? null : fields.stderr,
      fields.tokenCount === undefined ? current.tokenCount ?? null : fields.tokenCount,
      fields.completedAt === undefined ? current.completedAt ?? null : fields.completedAt,
      runId,
    );
  return getCodexRun(runId);
}

export function getLatestAgentRunState(chatId: string): AgentRunState {
  const row = getDB()
    .prepare(
      `SELECT run_id, chat_id, status, error, stderr, token_count, started_at, completed_at
       FROM codex_runs WHERE chat_id = ? ORDER BY started_at DESC LIMIT 1`,
    )
    .get(chatId) as CodexRunRow | undefined;
  if (!row) return {chatId, status: 'idle'};
  return runStateFromRow(row);
}

export function getProjectRootForChat(chatId: string): string | null {
  const row = getDB()
    .prepare(
      `SELECT p.root_path AS root_path
       FROM chats c
       LEFT JOIN projects p ON p.id = c.project_id
       WHERE c.id = ?`,
    )
    .get(chatId) as {root_path?: string | null} | undefined;
  return row?.root_path ?? null;
}
