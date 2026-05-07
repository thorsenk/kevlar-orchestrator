import {describe, expect, it} from 'vitest';
import {extractAgentText, parseJsonLine, parseSideCarCards} from './codexEvents';

describe('Codex JSONL event helpers', () => {
  it('parses valid JSONL and ignores non-JSON log lines', () => {
    expect(parseJsonLine('{"id":"0","msg":{"type":"task_started"}}')).toEqual({
      id: '0',
      msg: {type: 'task_started'},
    });
    expect(parseJsonLine('2026-05-07 WARN retrying')).toBeNull();
  });

  it('extracts assistant text from Codex agent events', () => {
    expect(extractAgentText({msg: {type: 'agent_message', message: 'OK'}})).toBe('OK');
    expect(extractAgentText({msg: {type: 'task_started'}})).toBeNull();
  });

  it('parses Side-Car cards with a safe fallback', () => {
    expect(
      parseSideCarCards('{"cards":[{"kind":"decision","title":"Use local storage","content":"SQLite stays local."}]}'),
    ).toEqual([{kind: 'decision', title: 'Use local storage', content: 'SQLite stays local.'}]);

    expect(parseSideCarCards('not json')[0]).toMatchObject({
      kind: 'summary',
      title: 'Side-Car Summary',
    });
  });
});
