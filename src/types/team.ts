export interface TeamMember {
  agentId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  status: 'active' | 'offline' | 'busy';
}

export interface TeamRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface AgentTeam {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  roles: TeamRole[];
  createdAt: string;
}
