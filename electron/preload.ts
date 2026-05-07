import {contextBridge, ipcRenderer} from 'electron';
import type {AgentStreamEvent, KevlarApi} from '../src/shared/types';

const api: KevlarApi = {
  codex: {
    status: () => ipcRenderer.invoke('codex:status'),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    pickFolder: () => ipcRenderer.invoke('projects:pickFolder'),
    create: (input) => ipcRenderer.invoke('projects:create', input),
    updateName: (input) => ipcRenderer.invoke('projects:updateName', input),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
    touch: (id) => ipcRenderer.invoke('projects:touch', id),
  },
  chats: {
    list: () => ipcRenderer.invoke('chats:list'),
    create: (input) => ipcRenderer.invoke('chats:create', input),
    updateName: (input) => ipcRenderer.invoke('chats:updateName', input),
    updateProject: (input) => ipcRenderer.invoke('chats:updateProject', input),
    remove: (id) => ipcRenderer.invoke('chats:remove', id),
    messages: (chatId) => ipcRenderer.invoke('chats:messages', chatId),
    appendMessage: (input) => ipcRenderer.invoke('chats:appendMessage', input),
  },
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    create: (input) => ipcRenderer.invoke('tasks:create', input),
    updateStatus: (input) => ipcRenderer.invoke('tasks:updateStatus', input),
    updateTitle: (input) => ipcRenderer.invoke('tasks:updateTitle', input),
    updateAssignedAgent: (input) => ipcRenderer.invoke('tasks:updateAssignedAgent', input),
    remove: (id) => ipcRenderer.invoke('tasks:remove', id),
  },
  teams: {
    list: () => ipcRenderer.invoke('teams:list'),
    create: (input) => ipcRenderer.invoke('teams:create', input),
    updateProfile: (input) => ipcRenderer.invoke('teams:updateProfile', input),
    remove: (id) => ipcRenderer.invoke('teams:remove', id),
  },
  agent: {
    sendMessage: (input) => ipcRenderer.invoke('agent:sendMessage', input),
    interrupt: (chatId) => ipcRenderer.invoke('agent:interrupt', chatId),
    runState: (chatId) => ipcRenderer.invoke('agent:runState', chatId),
  },
  sideCar: {
    cards: (chatId) => ipcRenderer.invoke('sidecar:cards', chatId),
    run: (chatId) => ipcRenderer.invoke('sidecar:run', chatId),
    promote: (cardId) => ipcRenderer.invoke('sidecar:promote', cardId),
  },
  onAgentEvent: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: AgentStreamEvent) => listener(payload);
    ipcRenderer.on('agent:event', wrapped);
    return () => ipcRenderer.off('agent:event', wrapped);
  },
};

contextBridge.exposeInMainWorld('kevlar', api);
