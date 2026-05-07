import type {SideCarKind} from '../src/shared/types';

export type JsonLine = Record<string, unknown>;

export function parseJsonLine(line: string): JsonLine | null {
  try {
    return JSON.parse(line) as JsonLine;
  } catch {
    return null;
  }
}

export function extractAgentText(event: JsonLine): string | null {
  const msg = event.msg as Record<string, unknown> | undefined;
  if (!msg) return null;
  if (msg.type === 'agent_message' && typeof msg.message === 'string') return msg.message;
  if (msg.type === 'assistant_message' && typeof msg.message === 'string') return msg.message;
  if (msg.type === 'output_text_delta' && typeof msg.delta === 'string') return msg.delta;
  if (msg.type === 'message_delta' && typeof msg.delta === 'string') return msg.delta;
  return null;
}

export function parseSideCarCards(output: string): Array<{kind: SideCarKind; title: string; content: string}> {
  const fallback = [{kind: 'summary' as const, title: 'Side-Car Summary', content: output || 'No Side-Car notes generated.'}];
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallback;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {cards?: Array<{kind?: string; title?: string; content?: string}>};
    const cards = (parsed.cards ?? [])
      .filter((card) => isSideCarKind(card.kind) && card.title && card.content)
      .map((card) => ({
        kind: card.kind as SideCarKind,
        title: card.title!,
        content: card.content!,
      }));
    return cards.length > 0 ? cards : fallback;
  } catch {
    return fallback;
  }
}

function isSideCarKind(kind: unknown): kind is SideCarKind {
  return kind === 'summary' || kind === 'decision' || kind === 'open_question' || kind === 'next_step';
}
