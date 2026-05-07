import { AgentTeam } from '../types/team';

export const mockTeams: AgentTeam[] = [
  {
    id: 'team-1',
    name: 'Research & Discovery',
    description: 'Agents dedicated to scouring the web for initial research, summarizing papers, and gathering competitive intelligence.',
    createdAt: '2023-11-01T10:00:00Z',
    roles: [
      { id: 'r-1', name: 'Lead Researcher', permissions: ['web_search', 'read_docs', 'write_reports'] },
      { id: 'r-2', name: 'Data Analyzer', permissions: ['read_docs', 'run_analysis'] }
    ],
    members: [
      { agentId: 'a-1', name: 'ResearchBot Alpha', role: 'Lead Researcher', status: 'active' },
      { agentId: 'a-2', name: 'DataCrawler v2', role: 'Data Analyzer', status: 'busy' }
    ]
  },
  {
    id: 'team-2',
    name: 'DevOps & Infra',
    description: 'Autonomous team for managing deployments, monitoring health, and provisioning infrastructure.',
    createdAt: '2023-10-15T10:00:00Z',
    roles: [
      { id: 'r-3', name: 'Infra Lead', permissions: ['provision_server', 'deploy_code', 'read_logs'] },
      { id: 'r-4', name: 'Monitor', permissions: ['read_logs', 'alerting'] }
    ],
    members: [
      { agentId: 'a-3', name: 'InfraAgent 9', role: 'Infra Lead', status: 'active' },
      { agentId: 'a-4', name: 'LogWatcher', role: 'Monitor', status: 'active' }
    ]
  }
];

export const availablePermissions = [
  'web_search',
  'read_docs',
  'write_reports',
  'run_analysis',
  'provision_server',
  'deploy_code',
  'read_logs',
  'alerting',
  'execute_code',
  'manage_database'
];
