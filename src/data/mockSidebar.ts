export interface Project {
  id: string;
  name: string;
  time?: string;
  isSub?: boolean;
}

export interface ChatSession {
  id: string;
  name: string;
  time?: string;
}

export const mockProjects: Project[] = [
  { id: 'p1', name: 'thorsenk-pkm', time: '~' },
  { id: 'p2', name: 'Evaluate project', time: '1d', isSub: true },
  { id: 'p3', name: 'Save raw note', time: '3d', isSub: true },
  { id: 'p4', name: 'Create trip summary', time: '1mo', isSub: true },
  { id: 'p5', name: 'Document family travel', time: '1mo', isSub: true },
  { id: 'p6', name: 's4d-xd' },
  { id: 'p7', name: 'rffl' },
  { id: 'p8', name: 'mental-model-docs' },
  { id: 'p9', name: 'rffl-tools' },
  { id: 'p10', name: '02-rffl' },
  { id: 'p11', name: 'kyle-thorsen-nxs' },
  { id: 'p12', name: 'code' },
];

export const mockChats: ChatSession[] = [
  { id: 'c1', name: 'Generate community config', time: 'Just now' },
  { id: 'c2', name: "Check mom's IMessages", time: '1d' },
  { id: 'c3', name: 'Find Linear connection', time: '3d' },
];

export const mockChatMessages: Record<string, { role: 'user' | 'assistant', content: string }[]> = {
  'c1': [
    { role: 'user', content: 'Generate community config for the orchestrator.' },
    { role: 'assistant', content: 'I can help with that. Here is a starting template for the community config, which defines the rules, permissions, and basic structure for the new repo.' }
  ],
  'c2': [
    { role: 'user', content: "Check mom's iMessages." },
    { role: 'assistant', content: 'You have 3 unread messages from Mom: \n1. "Call me when you can" (received 2 hours ago)\n2. "Are you coming for dinner?" (received 1 hour ago)\n3. "I made your favorite!" (received 5 mins ago)' }
  ],
  'c3': [
    { role: 'user', content: 'Find Linear connection details.' },
    { role: 'assistant', content: 'The Linear integration is currently configured with the workspace ID `thorsenk`. Sync is active. The last successful sync occurred 14 minutes ago.' }
  ]
};
