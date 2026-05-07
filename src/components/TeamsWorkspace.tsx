import React, { useState, useEffect } from 'react';
import { Users, Plus, Settings2, Shield, MoreVertical, UserPlus, Search, Trash2, Edit2 } from 'lucide-react';
import { useTeams } from '@/lib/db';
import { addTeamMember, addTeamRole, createTeam, deleteTeam, removeTeamMember, removeTeamRole, updateTeamProfile } from '@/lib/mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export function TeamsWorkspace() {
  const teams = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("Contributor");
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState("read, comment");

  const filteredTeams = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    return teams.filter(t => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
  }, [searchQuery, teams]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;

  useEffect(() => {
    if (selectedTeamId && !teams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(null);
    }
  }, [selectedTeamId, teams]);

  useEffect(() => {
    if (filteredTeams.length > 0 && selectedTeamId === null && !searchQuery) {
      setSelectedTeamId(filteredTeams[0].id);
    }
  }, [filteredTeams, searchQuery, selectedTeamId]);

  const handleNewTeam = async () => {
    const newTeamId = await createTeam("New Team", "A powerful agent team");
    if (newTeamId) {
      setSelectedTeamId(newTeamId);
      setSearchQuery("");
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    if (selectedTeam) {
      setEditName(selectedTeam.name);
      setEditDesc(selectedTeam.description);
    }
  }, [selectedTeam?.name, selectedTeam?.description]);

  const handleSaveEdit = async () => {
    if (selectedTeam && editName.trim()) {
      await updateTeamProfile(selectedTeam.id, editName.trim(), editDesc.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (selectedTeam) {
      setEditName(selectedTeam.name);
      setEditDesc(selectedTeam.description);
    }
    setIsEditing(false);
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !memberName.trim()) return;
    await addTeamMember(selectedTeam.id, memberName.trim(), memberRole.trim() || 'Contributor');
    setMemberName("");
    setMemberRole("Contributor");
    setMemberFormOpen(false);
  };

  const handleAddRole = async () => {
    if (!selectedTeam || !roleName.trim()) return;
    await addTeamRole(
      selectedTeam.id,
      roleName.trim(),
      rolePermissions
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean),
    );
    setRoleName("");
    setRolePermissions("read, comment");
    setRoleFormOpen(false);
  };

  return (
    <div className="flex-1 flex w-full h-full animate-in fade-in duration-300">
      {/* Sidebar: Team List */}
      <div className="w-[280px] border-r border-white/5 flex flex-col h-full bg-black/10">
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-medium tracking-tight text-zinc-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            Agent Teams
          </h2>
          <Button onClick={handleNewTeam} variant="ghost" size="icon" aria-label="Create team" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-3 border-b border-white/5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <Input 
              placeholder="Search teams..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 bg-white/5 border-white/10 text-xs placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20 shadow-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 custom-scrollbar">
          {filteredTeams.map(team => (
            <div 
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedTeamId === team.id 
                  ? 'bg-white/10 border border-white/10 shadow-sm' 
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="font-medium text-sm text-zinc-200 mb-1">{team.name}</div>
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                <span>{team.members.length} members</span>
                <span>•</span>
                <span>{team.roles.length} roles</span>
              </div>
            </div>
          ))}
          {filteredTeams.length === 0 && searchQuery && (
            <div className="text-xs text-zinc-500 text-center mt-4">No teams found.</div>
          )}
        </div>
      </div>

      {/* Main Area: Team Details */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedTeam ? (
          <>
            <div className="p-6 border-b border-white/5 shrink-0 bg-gradient-to-b from-white/[0.02] to-transparent">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 mr-4">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                       <input
                         autoFocus
                         aria-label="Team name"
                         value={editName}
                         onChange={(e) => setEditName(e.target.value)}
                         className="text-2xl font-medium tracking-tight bg-zinc-900 border border-zinc-700 text-zinc-100 px-2 py-0.5 rounded focus:outline-none w-full max-w-md"
                         placeholder="Team Name"
                       />
                       <textarea
                         aria-label="Team description"
                         value={editDesc}
                         onChange={(e) => setEditDesc(e.target.value)}
                         className="text-sm text-zinc-300 leading-relaxed bg-zinc-900 border border-zinc-700 px-2 py-1 rounded focus:outline-none w-full max-w-2xl resize-none h-20"
                         placeholder="Team Description"
                       />
                       <div className="flex gap-2 mt-2">
                         <Button onClick={handleSaveEdit} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">Save</Button>
                         <Button onClick={handleCancelEdit} size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 hover:text-white">Cancel</Button>
                       </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-medium text-zinc-100 tracking-tight mb-2">{selectedTeam.name}</h1>
                      <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">{selectedTeam.description}</p>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" aria-label="Open team settings" className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">
                        <Settings2 className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Team Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-400 focus:bg-red-500/10 focus:text-red-500"
                        onClick={async () => {
                          await deleteTeam(selectedTeam.id);
                          setSelectedTeamId(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-8">
              
              {/* Members Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                     Members
                    <span className="text-xs bg-white/10 text-zinc-400 px-2 py-0.5 rounded-full">{selectedTeam.members.length}</span>
                  </h3>
                  <Button onClick={() => setMemberFormOpen(true)} variant="ghost" size="sm" className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/10">
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Add Member
                  </Button>
                </div>
                {memberFormOpen && (
                  <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3 flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Agent name" className="bg-white/5 border-white/10 text-sm" />
                      <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} placeholder="Role" className="bg-white/5 border-white/10 text-sm" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setMemberFormOpen(false)} className="h-8 text-xs text-zinc-400">Cancel</Button>
                      <Button size="sm" onClick={handleAddMember} disabled={!memberName.trim()} className="h-8 text-xs bg-zinc-100 text-black hover:bg-white disabled:opacity-40">Add Member</Button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTeam.members.map(member => (
                    <div key={member.agentId} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors group">
                      <div className="flex items-center gap-3 w-full min-w-0">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-purple-300">{member.name.substring(0,2).toUpperCase()}</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-medium text-zinc-200 truncate">{member.name}</span>
                             <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${member.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : member.status === 'busy' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-zinc-600'}`} />
                          </div>
                          <span className="text-xs text-zinc-500">{member.role}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open member actions for ${member.name}`} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="text-red-400 focus:bg-red-500/10 focus:text-red-500"
                            onClick={() => removeTeamMember(selectedTeam.id, member.agentId)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {selectedTeam.members.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">
                      No members added.
                    </div>
                  )}
                </div>
              </section>

              {/* Roles & Permissions Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                     Roles & Permissions
                  </h3>
                  <Button onClick={() => setRoleFormOpen(true)} variant="ghost" size="sm" className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/10">
                    <Shield className="w-3.5 h-3.5 mr-1.5" />
                    New Role
                  </Button>
                </div>
                {roleFormOpen && (
                  <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3 flex flex-col gap-3">
                    <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Role name" className="bg-white/5 border-white/10 text-sm" />
                    <Input value={rolePermissions} onChange={(e) => setRolePermissions(e.target.value)} placeholder="Permissions, comma separated" className="bg-white/5 border-white/10 text-sm" />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setRoleFormOpen(false)} className="h-8 text-xs text-zinc-400">Cancel</Button>
                      <Button size="sm" onClick={handleAddRole} disabled={!roleName.trim()} className="h-8 text-xs bg-zinc-100 text-black hover:bg-white disabled:opacity-40">Add Role</Button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {selectedTeam.roles.map(role => (
                    <div key={role.id} className="flex flex-col p-4 rounded-xl bg-black/20 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-zinc-200">{role.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeamRole(selectedTeam.id, role.id)}
                          aria-label={`Delete role ${role.name}`}
                          className="h-6 px-2 text-[10px] text-zinc-500 hover:text-red-300 hover:bg-red-500/10 uppercase tracking-wider font-semibold"
                        >
                          Delete
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map(perm => (
                          <div key={perm} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-zinc-400">
                            {perm}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedTeam.roles.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">
                      No roles added.
                    </div>
                  )}
                </div>
              </section>

            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a team to view details
          </div>
        )}
      </div>
    </div>
  );
}
