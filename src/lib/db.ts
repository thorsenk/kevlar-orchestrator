import {useCallback, useEffect, useState} from 'react';
import type {AgentRunState, Chat, CodexStatus, Message, Project, Task, Team} from '@/shared/types';

type DataScope = 'projects' | 'chats' | 'messages' | 'tasks' | 'teams' | 'sidecar' | 'settings' | 'runs';

function useRemoteList<T>(
  loader: () => Promise<T[]>,
  scopes: DataScope[],
  chatId?: string | null,
): T[] {
  const [items, setItems] = useState<T[]>([]);
  const scopeKey = scopes.join('|');

  const refresh = useCallback(() => {
    loader().then(setItems).catch((error) => {
      console.error(error);
      setItems([]);
    });
  }, [loader]);

  useEffect(() => {
    refresh();
    return window.kevlar.onAgentEvent((event) => {
      if (event.type !== 'data_changed') return;
      if (!scopes.includes(event.scope)) return;
      if (chatId && event.chatId && event.chatId !== chatId) return;
      refresh();
    });
  }, [chatId, refresh, scopeKey]);

  return items;
}

export function useProjects(): Project[] {
  const loader = useCallback(() => window.kevlar.projects.list(), []);
  return useRemoteList(loader, ['projects']);
}

export function useChats(): Chat[] {
  const loader = useCallback(() => window.kevlar.chats.list(), []);
  return useRemoteList(loader, ['chats', 'messages']);
}

export function useMessages(chatId: string | null): Message[] {
  const loader = useCallback(() => (chatId ? window.kevlar.chats.messages(chatId) : Promise.resolve([])), [chatId]);
  return useRemoteList(loader, ['messages'], chatId);
}

export function useTasks(): Task[] {
  const loader = useCallback(() => window.kevlar.tasks.list(), []);
  return useRemoteList(loader, ['tasks']);
}

export function useTeams(): Team[] {
  const loader = useCallback(() => window.kevlar.teams.list(), []);
  return useRemoteList(loader, ['teams']);
}

export function useCodexStatus(): CodexStatus | null {
  const [status, setStatus] = useState<CodexStatus | null>(null);

  const refresh = useCallback(() => {
    window.kevlar.codex.status().then(setStatus).catch((error) => {
      console.error(error);
      setStatus({
        ok: false,
        cliPath: null,
        version: null,
        loginStatus: null,
        defaultModel: 'gpt-5.2',
        defaultSandboxMode: 'workspace-write',
        warnings: [],
        errors: [error instanceof Error ? error.message : String(error)],
      });
    });
  }, []);

  useEffect(() => {
    refresh();
    return window.kevlar.onAgentEvent((event) => {
      if (event.type === 'data_changed' && event.scope === 'settings') refresh();
    });
  }, [refresh]);

  return status;
}

export function useAgentRunState(chatId: string | null): AgentRunState | null {
  const [state, setState] = useState<AgentRunState | null>(null);

  const refresh = useCallback(() => {
    if (!chatId) {
      setState(null);
      return;
    }
    window.kevlar.agent.runState(chatId).then(setState).catch((error) => {
      console.error(error);
      setState({chatId, status: 'failed', error: error instanceof Error ? error.message : String(error)});
    });
  }, [chatId]);

  useEffect(() => {
    refresh();
    return window.kevlar.onAgentEvent((event) => {
      if (event.type === 'run_state' && event.state.chatId === chatId) {
        setState(event.state);
        return;
      }
      if (event.type === 'data_changed' && event.scope === 'runs' && (!event.chatId || event.chatId === chatId)) {
        refresh();
      }
    });
  }, [chatId, refresh]);

  return state;
}
