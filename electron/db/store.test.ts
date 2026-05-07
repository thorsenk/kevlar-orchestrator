import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {closeDB} from './index';
import {
  appendMessage,
  createChat,
  createCodexRun,
  createProject,
  getLatestAgentRunState,
  listCodexEvents,
  listMessages,
  listProjects,
  persistCodexEvent,
  promoteSideCarCard,
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
});
