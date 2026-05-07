import {BrowserWindow, dialog, ipcMain} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type {AgentStreamEvent, MessageRole, TaskStatus} from '../src/shared/types';
import {getCodexStatus, CodexCliService} from './codex';
import {
  appendMessage,
  createChat,
  createProject,
  createTask,
  createTeam,
  listChats,
  listMessages,
  listProjects,
  listSideCarCards,
  listTasks,
  listTeams,
  promoteSideCarCard,
  removeChat,
  removeProject,
  removeTask,
  removeTeam,
  touchProject,
  updateChatName,
  updateChatProject,
  getLatestAgentRunState,
  updateProjectName,
  updateTask,
  updateTeamProfile,
} from './db/store';

const codex = new CodexCliService();

function emit(event: AgentStreamEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('agent:event', event);
  }
}

export function registerIpc(): void {
  ipcMain.handle('codex:status', () => getCodexStatus());

  ipcMain.handle('projects:list', () => listProjects());
  ipcMain.handle('projects:pickFolder', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const result = await dialog.showOpenDialog(win, {
      title: 'Add Project Folder',
      buttonLabel: 'Add Project',
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  ipcMain.handle('projects:create', (_event, input: {name?: string; rootPath?: string | null}) => {
    const root = input.rootPath;
    if (!root) return null;
    const stat = fs.statSync(root);
    if (!stat.isDirectory()) throw new Error(`Path is not a directory: ${root}`);
    const project = createProject(root, input.name || path.basename(root));
    emit({type: 'data_changed', scope: 'projects'});
    return project;
  });
  ipcMain.handle('projects:updateName', (_event, input: {id: string; name: string}) => {
    const project = updateProjectName(input.id, input.name);
    emit({type: 'data_changed', scope: 'projects'});
    return project;
  });
  ipcMain.handle('projects:remove', (_event, id: string) => {
    const result = removeProject(id);
    emit({type: 'data_changed', scope: 'projects'});
    return result;
  });
  ipcMain.handle('projects:touch', (_event, id: string) => {
    const result = touchProject(id);
    emit({type: 'data_changed', scope: 'projects'});
    return result;
  });

  ipcMain.handle('chats:list', () => listChats());
  ipcMain.handle('chats:create', (_event, input?: {name?: string; projectId?: string | null}) => {
    const chat = createChat(input?.name || 'New Chat', input?.projectId ?? null);
    emit({type: 'data_changed', scope: 'chats'});
    return chat;
  });
  ipcMain.handle('chats:updateName', (_event, input: {id: string; name: string}) => {
    const chat = updateChatName(input.id, input.name);
    emit({type: 'data_changed', scope: 'chats'});
    return chat;
  });
  ipcMain.handle('chats:updateProject', (_event, input: {id: string; projectId: string | null}) => {
    const chat = updateChatProject(input.id, input.projectId);
    emit({type: 'data_changed', scope: 'chats'});
    return chat;
  });
  ipcMain.handle('chats:remove', (_event, id: string) => {
    const result = removeChat(id);
    emit({type: 'data_changed', scope: 'chats'});
    return result;
  });
  ipcMain.handle('chats:messages', (_event, chatId: string) => listMessages(chatId));
  ipcMain.handle('chats:appendMessage', (_event, input: {chatId: string; role: MessageRole; content: string}) => {
    const message = appendMessage(input.chatId, input.role, input.content, 'complete');
    emit({type: 'data_changed', scope: 'messages', chatId: input.chatId});
    emit({type: 'data_changed', scope: 'chats'});
    return message;
  });

  ipcMain.handle('tasks:list', () => listTasks());
  ipcMain.handle('tasks:create', (_event, input: {title: string; projectId?: string | null}) => {
    const task = createTask(input.title, input.projectId ?? null);
    emit({type: 'data_changed', scope: 'tasks'});
    return task;
  });
  ipcMain.handle('tasks:updateStatus', (_event, input: {id: string; status: TaskStatus}) => {
    const task = updateTask(input.id, {status: input.status});
    emit({type: 'data_changed', scope: 'tasks'});
    return task;
  });
  ipcMain.handle('tasks:updateTitle', (_event, input: {id: string; title: string}) => {
    const task = updateTask(input.id, {title: input.title});
    emit({type: 'data_changed', scope: 'tasks'});
    return task;
  });
  ipcMain.handle('tasks:updateAssignedAgent', (_event, input: {id: string; assignedAgent: string | null}) => {
    const task = updateTask(input.id, {assignedAgent: input.assignedAgent});
    emit({type: 'data_changed', scope: 'tasks'});
    return task;
  });
  ipcMain.handle('tasks:remove', (_event, id: string) => {
    const result = removeTask(id);
    emit({type: 'data_changed', scope: 'tasks'});
    return result;
  });

  ipcMain.handle('teams:list', () => listTeams());
  ipcMain.handle('teams:create', (_event, input: {name: string; description: string}) => {
    const team = createTeam(input.name, input.description);
    emit({type: 'data_changed', scope: 'teams'});
    return team;
  });
  ipcMain.handle('teams:updateProfile', (_event, input: {id: string; name: string; description: string}) => {
    const team = updateTeamProfile(input.id, input.name, input.description);
    emit({type: 'data_changed', scope: 'teams'});
    return team;
  });
  ipcMain.handle('teams:remove', (_event, id: string) => {
    const result = removeTeam(id);
    emit({type: 'data_changed', scope: 'teams'});
    return result;
  });

  ipcMain.handle('agent:sendMessage', (_event, input: {chatId?: string | null; projectId?: string | null; content: string}) =>
    codex.sendMessage({...input, emit}),
  );
  ipcMain.handle('agent:interrupt', (_event, chatId: string) => codex.interrupt(chatId));
  ipcMain.handle('agent:runState', (_event, chatId: string) => getLatestAgentRunState(chatId));

  ipcMain.handle('sidecar:cards', (_event, chatId: string) => listSideCarCards(chatId));
  ipcMain.handle('sidecar:run', (_event, chatId: string) => codex.runSideCar(chatId, emit));
  ipcMain.handle('sidecar:promote', (_event, cardId: string) => {
    const message = promoteSideCarCard(cardId);
    emit({type: 'data_changed', scope: 'messages', chatId: message.chatId});
    emit({type: 'data_changed', scope: 'sidecar', chatId: message.chatId});
    return message;
  });
}
