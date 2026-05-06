import { AgentTask } from '../types/task';

export const mockTasks: AgentTask[] = [
  {
    id: 't-001',
    title: 'Analyze competitor pricing models',
    projectTag: 'Market Research',
    status: 'Idle',
    creatorType: 'User',
    assignedAgent: 'ResearchBot Alpha',
    payloadType: 'none',
    metadata: { createdAt: '2023-10-27T10:00:00Z', priority: 'medium' }
  },
  {
    id: 't-002',
    title: 'Provision new staging environment',
    projectTag: 'DevOps',
    status: 'Processing',
    creatorType: 'User',
    assignedAgent: 'InfraAgent 9',
    payloadType: 'none',
    metadata: { createdAt: '2023-10-27T11:30:00Z', priority: 'high' }
  },
  {
    id: 't-003',
    title: 'Scrape latest API documentation',
    projectTag: 'Integrations',
    status: 'Processing',
    creatorType: 'Agent',
    assignedAgent: 'DataCrawler v2',
    payloadType: 'none',
    metadata: { createdAt: '2023-10-27T12:15:00Z', priority: 'low' }
  },
  {
    id: 't-004',
    title: 'Review proposed database schema changes',
    projectTag: 'Backend Arch',
    status: 'Awaiting User',
    creatorType: 'Agent',
    assignedAgent: 'DB-Architect-AI',
    payloadType: 'diff',
    metadata: { createdAt: '2023-10-27T09:00:00Z', priority: 'high' },
    payload: {
      content: 'Please review the index optimizations.',
      oldContent: 'CREATE TABLE users (id INT, name VARCHAR(255));\n',
      newContent: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));\nCREATE INDEX idx_name ON users(name);\n'
    }
  },
  {
    id: 't-005',
    title: 'Approve drafted release notes for v2.4',
    projectTag: 'Marketing',
    status: 'Awaiting User',
    creatorType: 'Agent',
    assignedAgent: 'Copywriter GPT',
    payloadType: 'markdown',
    metadata: { createdAt: '2023-10-27T13:00:00Z', priority: 'medium' },
    payload: {
      content: '# Release Notes v2.4\n\n## Exciting New Features\n* **Orchestration Board**: Monitor all active agents in a new Kanban view.\n* **Performance Improvements**: Vite build times reduced by 40%.\n\nPlease review and approve before we publish.'
    }
  },
  {
    id: 't-006',
    title: 'Refactor old utility functions',
    projectTag: 'Tech Debt',
    status: 'Completed',
    creatorType: 'User',
    assignedAgent: 'CodeRefactor Bot',
    payloadType: 'none',
    metadata: { createdAt: '2023-10-26T14:20:00Z', priority: 'low' }
  },
  {
    id: 't-007',
    title: 'Generate unit tests for auth module',
    projectTag: 'QA',
    status: 'Completed',
    creatorType: 'Agent',
    assignedAgent: 'TestGenie',
    payloadType: 'none',
    metadata: { createdAt: '2023-10-26T16:45:00Z', priority: 'medium' }
  }
];
