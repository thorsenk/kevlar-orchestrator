import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import type {AgentStreamEvent} from '../src/shared/types';
import {CodexCliService} from './codex';
import {closeDB} from './db';
import {createChat, createProject, getLatestAgentRunState, listCodexEvents, listMessages} from './db/store';

let tempDir: string;
let fakeCodexPath: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kevlar-codex-'));
  fakeCodexPath = path.join(tempDir, 'codex');
  fs.writeFileSync(
    fakeCodexPath,
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.includes('--version')) {
  console.log('codex-cli 0.30.0');
  process.exit(0);
}
if (args[0] === 'login' && args[1] === 'status') {
  console.log('Logged in using ChatGPT');
  process.exit(0);
}
fs.readFileSync(0, 'utf8');
if (process.env.FAKE_CODEX_MODE === 'slow') {
  console.log(JSON.stringify({msg: {type: 'task_started'}}));
  process.on('SIGINT', () => {
    console.error('interrupted by test');
    process.exit(130);
  });
  setInterval(() => {}, 1000);
} else {
  console.error('stderr summary');
  console.log(JSON.stringify({msg: {type: 'agent_message', message: 'fake assistant output'}}));
  console.log(JSON.stringify({msg: {type: 'token_count', total_tokens: 77}}));
  process.exit(0);
}
`,
  );
  fs.chmodSync(fakeCodexPath, 0o755);
  process.env.CODEX_CLI_PATH = fakeCodexPath;
  process.env.KEVLAR_TEST_DB_PATH = path.join(tempDir, 'test.db');
});

afterEach(() => {
  closeDB();
  delete process.env.CODEX_CLI_PATH;
  delete process.env.KEVLAR_TEST_DB_PATH;
  delete process.env.FAKE_CODEX_MODE;
  fs.rmSync(tempDir, {recursive: true, force: true});
});

describe('Codex CLI bridge', () => {
  it('streams and persists assistant output, stderr, token counts, and completion state', async () => {
    const projectRoot = fs.mkdtempSync(path.join(tempDir, 'project-'));
    const project = createProject(projectRoot);
    const chat = createChat('Bridge test', project.id);
    const events: AgentStreamEvent[] = [];
    const service = new CodexCliService();

    const result = await service.sendMessage({
      chatId: chat.id,
      content: 'say hi',
      projectRoot,
      emit: (event) => events.push(event),
    });

    await waitFor(() => events.some((event) => event.type === 'run_complete'));
    expect(result.chatId).toBe(chat.id);
    expect(listMessages(chat.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({role: 'user', content: 'say hi'}),
        expect.objectContaining({role: 'assistant', content: 'fake assistant output', status: 'complete'}),
      ]),
    );
    expect(getLatestAgentRunState(chat.id)).toMatchObject({
      status: 'completed',
      tokenCount: 77,
      stderr: 'stderr summary',
    });
    expect(listCodexEvents(chat.id).map((event) => event.type)).toEqual(
      expect.arrayContaining(['agent_message', 'token_count', 'stderr']),
    );
  });

  it('marks interrupted processes as cancelling and then failed', async () => {
    process.env.FAKE_CODEX_MODE = 'slow';
    const projectRoot = fs.mkdtempSync(path.join(tempDir, 'project-'));
    const project = createProject(projectRoot);
    const chat = createChat('Interrupt test', project.id);
    const events: AgentStreamEvent[] = [];
    const service = new CodexCliService();

    await service.sendMessage({
      chatId: chat.id,
      content: 'keep running',
      projectRoot,
      emit: (event) => events.push(event),
    });

    await waitFor(() => events.some((event) => event.type === 'run_state' && event.state.status === 'running'));
    service.interrupt(chat.id);

    await waitFor(() => events.some((event) => event.type === 'run_state' && event.state.status === 'cancelling'));
    await waitFor(() => events.some((event) => event.type === 'run_complete' && !event.ok));
    const interruptedState = getLatestAgentRunState(chat.id);
    expect(interruptedState.status).toBe('failed');
    expect(interruptedState.error ?? interruptedState.stderr).toContain('Codex exited');
    expect(listMessages(chat.id).at(-1)).toMatchObject({role: 'assistant', status: 'error'});
  });
});

async function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Timed out waiting for condition.');
}
