import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFile, execFileSync} from 'node:child_process';
import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import type {AgentRunState, AgentStreamEvent, CodexStatus, SideCarCard} from '../src/shared/types';
import {extractAgentText, parseJsonLine, parseSideCarCards} from './codexEvents';
import {
  appendMessage,
  createCodexRun,
  createChat,
  getChat,
  getLatestAgentRunState,
  getProjectRootForChat,
  listMessages,
  persistCodexEvent,
  replaceSideCarCards,
  updateCodexRun,
  updateMessage,
} from './db/store';

const CONFIG_OVERRIDES = ['-c', 'mcp_servers={}', '-c', 'model_reasoning_effort=high'];
const DEFAULT_MODEL = 'gpt-5.2';
const STATUS_TIMEOUT_MS = 8000;
const MAX_STORED_STDERR = 4000;

export interface AgentRunInput {
  chatId?: string | null;
  projectId?: string | null;
  content: string;
  projectRoot?: string | null;
  emit: (event: AgentStreamEvent) => void;
}

export interface AgentRunResult {
  chatId: string;
  userMessageId: string;
  assistantMessageId: string;
}

interface RunningRun {
  child: ChildProcessWithoutNullStreams;
  runId: string;
  assistantMessageId: string;
  emit: (event: AgentStreamEvent) => void;
}

function execFilePromise(file: string, args: string[], timeout = STATUS_TIMEOUT_MS): Promise<{stdout: string; stderr: string}> {
  return new Promise((resolve, reject) => {
    execFile(file, args, {timeout}, (error, stdout, stderr) => {
      if (error) {
        const err = error as Error & {stdout?: string; stderr?: string};
        err.message = [err.message, stdout, stderr].filter(Boolean).join('\n');
        reject(err);
        return;
      }
      resolve({stdout: String(stdout), stderr: String(stderr)});
    });
  });
}

function isExecutable(candidate: string): boolean {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveCodexCli(): string | null {
  const candidates = [
    process.env.CODEX_CLI_PATH,
    safeWhich('codex'),
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find(isExecutable) ?? null;
}

function safeWhich(command: string): string | null {
  try {
    return execFileSync('which', [command], {encoding: 'utf8'}).trim() || null;
  } catch {
    return null;
  }
}

function readConfigWarnings(): string[] {
  const configPath = path.join(os.homedir(), '.codex', 'config.toml');
  if (!fs.existsSync(configPath)) return [];
  const warnings: string[] = [];
  const config = fs.readFileSync(configPath, 'utf8');
  if (/model_reasoning_effort\s*=\s*"xhigh"/.test(config)) {
    warnings.push('Global Codex config uses model_reasoning_effort = "xhigh", which codex-cli 0.30.0 rejects. Kevlar overrides it to high per process.');
  }
  if (/\[mcp_servers\.linear\][\s\S]*?\nurl\s*=/.test(config) && !/\[mcp_servers\.linear\][\s\S]*?\ncommand\s*=/.test(config)) {
    warnings.push('Global Codex config has mcp_servers.linear with a URL but no command. Kevlar disables MCP server loading per process.');
  }
  if (/model\s*=\s*"gpt-5\.5"/.test(config)) {
    warnings.push('Global Codex config uses model = "gpt-5.5", which this installed CLI reports as too new. Kevlar uses gpt-5.2 by default.');
  }
  return warnings;
}

function getFallbackProjectRoot(): string {
  try {
    const require = createRequire(import.meta.url);
    const electron = require('electron') as {app?: {getPath(name: string): string}} | string;
    if (typeof electron === 'object' && electron.app) {
      return electron.app.getPath('home');
    }
  } catch {
    // Unit tests import this service outside Electron.
  }
  return os.homedir();
}

function compactStderr(current: string | null | undefined, line: string): string {
  const next = [current, line].filter(Boolean).join('\n');
  return next.length > MAX_STORED_STDERR ? next.slice(next.length - MAX_STORED_STDERR) : next;
}

function eventSummary(payload: unknown): string {
  if (payload instanceof Error) return payload.message;
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const msg = record.msg;
    if (msg && typeof msg === 'object') {
      const nested = msg as Record<string, unknown>;
      for (const key of ['message', 'error', 'reason']) {
        if (typeof nested[key] === 'string') return nested[key] as string;
      }
    }
    for (const key of ['message', 'error', 'reason']) {
      if (typeof record[key] === 'string') return record[key] as string;
    }
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function extractTokenCount(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const stack: unknown[] = [payload];
  while (stack.length > 0) {
    const value = stack.pop();
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    for (const key of ['total_tokens', 'totalTokens', 'tokens_total', 'tokenCount']) {
      if (typeof record[key] === 'number' && Number.isFinite(record[key])) return record[key];
    }
    for (const child of Object.values(record)) {
      if (child && typeof child === 'object') stack.push(child);
    }
  }
  return null;
}

export async function getCodexStatus(): Promise<CodexStatus> {
  const cliPath = resolveCodexCli();
  const warnings = readConfigWarnings();
  const errors: string[] = [];
  let version: string | null = null;
  let loginStatus: string | null = null;

  if (!cliPath) {
    return {
      ok: false,
      cliPath: null,
      version: null,
      loginStatus: null,
      defaultModel: DEFAULT_MODEL,
      defaultSandboxMode: 'workspace-write',
      warnings,
      errors: ['Codex CLI was not found. Install it with Homebrew or set CODEX_CLI_PATH.'],
    };
  }

  try {
    const result = await execFilePromise(cliPath, ['--version']);
    version = result.stdout.trim() || result.stderr.trim();
  } catch (error) {
    errors.push(`Could not run codex --version: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const result = await execFilePromise(cliPath, [
      'login',
      'status',
      ...CONFIG_OVERRIDES,
      '-c',
      `model=${DEFAULT_MODEL}`,
    ]);
    loginStatus = result.stdout.trim() || result.stderr.trim();
  } catch (error) {
    errors.push(`Codex login status failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    ok: errors.length === 0,
    cliPath,
    version,
    loginStatus,
    defaultModel: DEFAULT_MODEL,
    defaultSandboxMode: 'workspace-write',
    warnings,
    errors,
  };
}

function buildTranscript(chatId: string): string {
  const messages = listMessages(chatId).slice(-20);
  if (messages.length === 0) return 'No prior messages.';
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n');
}

function buildPrompt(transcript: string, userMessage: string): string {
  return [
    'You are Codex running inside Kevlar Codex Desktop.',
    'Work in the selected project directory. Be concise in chat output, and use repository files when needed.',
    'Recent transcript:',
    transcript,
    'New user message:',
    userMessage,
  ].join('\n\n');
}

function lineBuffer(onLine: (line: string) => void): (chunk: Buffer) => void {
  let buffered = '';
  return (chunk) => {
    buffered += chunk.toString('utf8');
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) onLine(line);
    }
  };
}

export class CodexCliService {
  private running = new Map<string, RunningRun>();

  getRunState(chatId: string): AgentRunState {
    return getLatestAgentRunState(chatId);
  }

  async sendMessage(input: AgentRunInput): Promise<AgentRunResult> {
    const status = await getCodexStatus();
    if (!status.cliPath || !status.ok) throw new Error(status.errors.join('\n') || 'Codex CLI not available.');

    const chat = input.chatId ? getChat(input.chatId) : createChat('New Chat', input.projectId ?? null);
    const projectRoot = input.projectRoot ?? getProjectRootForChat(chat.id) ?? getFallbackProjectRoot();
    const transcript = buildTranscript(chat.id);
    const userMessage = appendMessage(chat.id, 'user', input.content, 'complete');
    const assistant = appendMessage(chat.id, 'assistant', '', 'streaming');
    const runId = randomUUID();
    let runState = createCodexRun(chat.id, runId);
    const prompt = buildPrompt(transcript, input.content);
    const args = [
      '--ask-for-approval',
      'never',
      'exec',
      '--json',
      '-C',
      projectRoot,
      '--skip-git-repo-check',
      '--sandbox',
      'workspace-write',
      '-m',
      DEFAULT_MODEL,
      ...CONFIG_OVERRIDES,
      '-',
    ];

    const child = spawn(status.cliPath, args, {
      cwd: projectRoot,
      env: {...process.env, CODEX_MANAGED_BY_KEVLAR: '1'},
      stdio: 'pipe',
    });
    this.running.set(chat.id, {child, runId, assistantMessageId: assistant.id, emit: input.emit});

    let content = '';
    let stderrSummary = '';
    let finalized = false;
    const emitDataChanged = () => input.emit({type: 'data_changed', scope: 'messages', chatId: chat.id});
    const emitRunState = (state: AgentRunState) => {
      runState = state;
      input.emit({type: 'run_state', state});
      input.emit({type: 'data_changed', scope: 'runs', chatId: chat.id});
    };
    emitRunState(runState);

    child.stdout.on(
      'data',
      lineBuffer((line) => {
        const parsed = parseJsonLine(line);
        if (!parsed) {
          persistCodexEvent(chat.id, runId, 'stdout', {line});
          return;
        }
        const msg = parsed.msg as Record<string, unknown> | undefined;
        const eventType = typeof msg?.type === 'string' ? msg.type : 'event';
        persistCodexEvent(chat.id, runId, eventType, parsed);
        input.emit({type: 'run_event', chatId: chat.id, runId, eventType, payload: parsed});
        const tokenCount = extractTokenCount(parsed);
        if (tokenCount !== null) {
          emitRunState(updateCodexRun(runId, {tokenCount}));
        }
        if (eventType === 'error') {
          emitRunState(updateCodexRun(runId, {error: eventSummary(parsed)}));
        }
        const text = extractAgentText(parsed);
        if (text) {
          content = content ? `${content}\n${text}` : text;
          updateMessage(assistant.id, content, 'streaming');
          input.emit({type: 'message_delta', chatId: chat.id, messageId: assistant.id, content});
          emitDataChanged();
        }
      }),
    );

    child.stderr.on(
      'data',
      lineBuffer((line) => {
        stderrSummary = compactStderr(stderrSummary, line);
        persistCodexEvent(chat.id, runId, 'stderr', {line});
        emitRunState(updateCodexRun(runId, {stderr: stderrSummary}));
      }),
    );

    child.stdin.end(prompt);

    const finalize = (ok: boolean, error?: string) => {
      if (finalized) return;
      finalized = true;
      this.running.delete(chat.id);
      const failureText = error ?? runState.error ?? 'Codex run failed.';
      const finalContent = ok ? content : content ? `${content}\n\n${failureText}` : failureText;
      updateMessage(assistant.id, finalContent, ok ? 'complete' : 'error');
      emitRunState(
        updateCodexRun(runId, {
          status: ok ? 'completed' : 'failed',
          error: ok ? runState.error ?? null : error ?? runState.error ?? finalContent,
          stderr: stderrSummary || runState.stderr || null,
          completedAt: Date.now(),
        }),
      );
      input.emit({
        type: 'run_complete',
        chatId: chat.id,
        messageId: assistant.id,
        ok,
        error: ok ? undefined : error ?? finalContent,
      });
      emitDataChanged();
      input.emit({type: 'data_changed', scope: 'chats'});
    };

    child.on('close', (code, signal) => {
      const ok = code === 0 && !signal;
      const error = ok ? undefined : `Codex exited ${signal ? `with signal ${signal}` : `with code ${code}`}.`;
      finalize(ok, error);
    });

    child.on('error', (error) => {
      persistCodexEvent(chat.id, runId, 'process_error', {message: error.message});
      finalize(false, error.message);
    });

    input.emit({type: 'data_changed', scope: 'messages', chatId: chat.id});
    input.emit({type: 'data_changed', scope: 'chats'});

    return {
      chatId: chat.id,
      userMessageId: userMessage.id,
      assistantMessageId: assistant.id,
    };
  }

  interrupt(chatId: string): {ok: true} {
    const run = this.running.get(chatId);
    if (run) {
      const state = updateCodexRun(run.runId, {status: 'cancelling'});
      run.emit({type: 'run_state', state});
      run.emit({type: 'data_changed', scope: 'runs', chatId});
      run.child.kill('SIGINT');
      setTimeout(() => {
        if (run.child.exitCode === null && run.child.signalCode === null) run.child.kill('SIGTERM');
      }, 1500);
    }
    return {ok: true};
  }

  async runSideCar(chatId: string, emit: (event: AgentStreamEvent) => void): Promise<SideCarCard[]> {
    const status = await getCodexStatus();
    if (!status.cliPath || !status.ok) throw new Error(status.errors.join('\n') || 'Codex CLI not available.');
    const projectRoot = getProjectRootForChat(chatId) ?? getFallbackProjectRoot();
    const runId = randomUUID();
    const prompt = [
      'You are the Kevlar Side-Car observer. You are read-only.',
      'Analyze the transcript and return concise notes as JSON only.',
      'Schema: {"cards":[{"kind":"summary|decision|open_question|next_step","title":"short title","content":"markdown content"}]}',
      'Transcript:',
      buildTranscript(chatId),
    ].join('\n\n');
    const args = [
      '--ask-for-approval',
      'never',
      'exec',
      '--json',
      '-C',
      projectRoot,
      '--skip-git-repo-check',
      '--sandbox',
      'read-only',
      '-m',
      DEFAULT_MODEL,
      ...CONFIG_OVERRIDES,
      '-',
    ];

    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(status.cliPath!, args, {cwd: projectRoot, env: process.env, stdio: 'pipe'});
      let content = '';
      child.stdout.on(
        'data',
        lineBuffer((line) => {
          const parsed = parseJsonLine(line);
          persistCodexEvent(chatId, runId, 'sidecar', parsed ?? {line});
          if (parsed) {
            const text = extractAgentText(parsed);
            if (text) content = content ? `${content}\n${text}` : text;
          }
        }),
      );
      child.stderr.on('data', lineBuffer((line) => persistCodexEvent(chatId, runId, 'sidecar_stderr', {line})));
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) resolve(content);
        else reject(new Error(`Side-Car Codex run exited with code ${code}`));
      });
      child.stdin.end(prompt);
    });

    const cards = parseSideCarCards(output);
    const stored = replaceSideCarCards(chatId, cards);
    emit({type: 'data_changed', scope: 'sidecar', chatId});
    return stored;
  }
}
