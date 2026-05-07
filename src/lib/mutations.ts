import type {MessageRole, TaskStatus} from '@/shared/types';

export async function createChat(name: string, projectId: string | null = null) {
  const chat = await window.kevlar.chats.create({name, projectId});
  return chat.id;
}

export async function updateChatProject(chatId: string, projectId: string | null) {
  return window.kevlar.chats.updateProject({id: chatId, projectId: projectId || null});
}

export async function updateChatName(chatId: string, name: string) {
  return window.kevlar.chats.updateName({id: chatId, name});
}

export async function sendMessage(chatId: string, content: string, role: MessageRole = 'user') {
  return window.kevlar.chats.appendMessage({chatId, content, role});
}

export async function sendAgentMessage(input: {chatId?: string | null; projectId?: string | null; content: string}) {
  return window.kevlar.agent.sendMessage(input);
}

export async function createProject(name?: string) {
  const rootPath = await window.kevlar.projects.pickFolder();
  if (!rootPath) return undefined;
  const project = await window.kevlar.projects.create({name, rootPath});
  return project?.id;
}

export async function updateProjectName(projectId: string, name: string) {
  return window.kevlar.projects.updateName({id: projectId, name});
}

export async function createTeam(name: string, description: string) {
  const team = await window.kevlar.teams.create({name, description});
  return team.id;
}

export async function createTask(title: string, projectTag: string) {
  const task = await window.kevlar.tasks.create({
    title,
    projectId: projectTag === 'Global' ? null : projectTag,
  });
  return task.id;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  return window.kevlar.tasks.updateStatus({id: taskId, status});
}

export async function updateTaskAssignedAgent(taskId: string, assignedAgent: string | null) {
  return window.kevlar.tasks.updateAssignedAgent({id: taskId, assignedAgent});
}

export async function deleteTask(taskId: string) {
  return window.kevlar.tasks.remove(taskId);
}

export async function deleteChat(chatId: string) {
  return window.kevlar.chats.remove(chatId);
}

export async function deleteProject(projectId: string) {
  return window.kevlar.projects.remove(projectId);
}

export async function deleteTeam(teamId: string) {
  return window.kevlar.teams.remove(teamId);
}

export async function updateTeamProfile(teamId: string, name: string, description: string) {
  return window.kevlar.teams.updateProfile({id: teamId, name, description});
}

export async function addTeamMember(teamId: string, name: string, role: string) {
  return window.kevlar.teams.addMember({teamId, name, role});
}

export async function removeTeamMember(teamId: string, agentId: string) {
  return window.kevlar.teams.removeMember({teamId, agentId});
}

export async function addTeamRole(teamId: string, name: string, permissions: string[]) {
  return window.kevlar.teams.addRole({teamId, name, permissions});
}

export async function removeTeamRole(teamId: string, roleId: string) {
  return window.kevlar.teams.removeRole({teamId, roleId});
}

export async function updateTaskTitle(taskId: string, title: string) {
  return window.kevlar.tasks.updateTitle({id: taskId, title});
}

export async function runSideCar(chatId: string) {
  return window.kevlar.sideCar.run(chatId);
}

export async function promoteSideCarCard(cardId: string) {
  return window.kevlar.sideCar.promote(cardId);
}

export async function clearSideCarCards(chatId: string) {
  return window.kevlar.sideCar.clear(chatId);
}
