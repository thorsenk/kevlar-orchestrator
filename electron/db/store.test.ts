import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {closeDB} from './index';
import {
  appendMessage,
  addTeamMember,
  addTeamRole,
  clearSideCarCards,
  createChat,
  createCodexRun,
  createProject,
  createTask,
  createTeam,
  getLatestAgentRunState,
  listCodexEvents,
  listChats,
  listMessages,
  listProjects,
  listTasks,
  persistCodexEvent,
  promoteSideCarCard,
  removeTeamMember,
  removeTeamRole,
  removeProject,
  updateTask,
  replaceSideCarCards,
  updateCodexRun,
} from './store';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kevlar-store-'));
  process.env.KEVLAR_TEST_DB_PATH = path.join(tempDir, 'test.db');
});

afterEach(() => {
  closeDB();
  delete process.env.KEVLAR_TEST_DB_PATH;
  fs.rmSync(tempDir, {recursive: true, force: true});
});

describe('local SQLite store', () => {
  it('creates and lists projects, chats, messages, Codex events, Side-Car cards, and run state', () => {
    const rootPath = fs.mkdtempSync(path.join(tempDir, 'project-'));
    const project = createProject(rootPath);
    expect(listProjects()[0]).toMatchObject({id: project.id, rootPath});

    const chat = createChat('Local run', project.id);
    const userMessage = appendMessage(chat.id, 'user', 'hello', 'complete');
    expect(listMessages(chat.id)).toEqual([expect.objectContaining({id: userMessage.id, content: 'hello'})]);

    persistCodexEvent(chat.id, 'run-1', 'agent_message', {msg: {type: 'agent_message', message: 'hi'}});
    expect(listCodexEvents(chat.id)).toEqual([
      expect.objectContaining({
        chatId: chat.id,
        runId: 'run-1',
        type: 'agent_message',
        payload: {msg: {type: 'agent_message', message: 'hi'}},
      }),
    ]);

    const cards = replaceSideCarCards(chat.id, [
      {kind: 'decision', title: 'Use SQLite', content: 'Keep desktop data local.'},
    ]);
    const promoted = promoteSideCarCard(cards[0].id);
    expect(promoted).toMatchObject({
      chatId: chat.id,
      role: 'user',
      content: 'Side-Car Use SQLite\n\nKeep desktop data local.',
    });
    expect(clearSideCarCards(chat.id).removed).toBe(1);

    const running = createCodexRun(chat.id, 'run-2');
    expect(running).toMatchObject({chatId: chat.id, runId: 'run-2', status: 'running'});

    const completed = updateCodexRun('run-2', {
      status: 'completed',
      tokenCount: 123,
      stderr: 'usage summary',
      completedAt: Date.now(),
    });
    expect(completed).toMatchObject({status: 'completed', tokenCount: 123, stderr: 'usage summary'});
    expect(getLatestAgentRunState(chat.id)).toMatchObject({runId: 'run-2', status: 'completed'});
  });

  it('edits local team members and roles', () => {
    const team = createTeam('Desktop Agents', 'Local team');
    const withMember = addTeamMember(team.id, {name: 'Planner', role: 'Planning'});
    expect(withMember.members).toEqual([
      expect.objectContaining({name: 'Planner', role: 'Planning', status: 'idle'}),
    ]);

    const withRole = addTeamRole(team.id, {name: 'Reviewer', permissions: ['read', 'comment']});
    expect(withRole.roles).toEqual([expect.objectContaining({name: 'Reviewer', permissions: ['read', 'comment']})]);

    const withoutMember = removeTeamMember(team.id, withMember.members[0].agentId);
    expect(withoutMember.members).toEqual([]);

    const withoutRole = removeTeamRole(team.id, withRole.roles[0].id);
    expect(withoutRole.roles).toEqual([]);
  });

  it('keeps chats and tasks readable when a project is removed', () => {
    const rootPath = fs.mkdtempSync(path.join(tempDir, 'project-'));
    const project = createProject(rootPath, 'Remove Me');
    const chat = createChat('Project chat', project.id);
    const task = createTask('Project task', project.id);

    expect(removeProject(project.id)).toEqual({removed: true});
    expect(listChats().find((item) => item.id === chat.id)).toMatchObject({projectId: null});
    expect(listTasks().find((item) => item.id === task.id)).toMatchObject({projectId: null, projectTag: 'Global'});
  });

  it('updates task status, assignment, and title locally', () => {
    const task = createTask('Draft task');
    expect(updateTask(task.id, {status: 'Processing'})).toMatchObject({status: 'Processing'});
    expect(updateTask(task.id, {assignedAgent: 'Planner'})).toMatchObject({assignedAgent: 'Planner'});
    expect(updateTask(task.id, {title: 'Reviewed task'})).toMatchObject({title: 'Reviewed task'});
  });
});
