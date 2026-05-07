import React from "react";
import { 
  Folder, 
  Settings, 
  Search, 
  Blocks, 
  Zap, 
  Plus, 
  ChevronDown,
  SquarePen,
  LayoutDashboard,
  Users,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { ViewState } from "./AppShell";
import { useProjects, useChats } from "@/lib/db";
import { createChat, createProject, updateProjectName, updateChatName, deleteChat, deleteProject } from "@/lib/mutations";

interface SidebarLeftProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  onOpenSettings: () => void;
}

export function SidebarLeft({ currentView, setCurrentView, activeChatId, setActiveChatId, activeProjectId, setActiveProjectId, onOpenSettings }: SidebarLeftProps) {
  const projects = useProjects();
  const chats = useChats();
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleNewChat = async () => {
    const newChatId = await createChat("New Chat", activeProjectId);
    if (newChatId) {
      setActiveChatId(newChatId);
      setCurrentView('chat');
    }
  };

  const handleNewProject = async () => {
    const newProjectId = await createProject("New Project");
    if (newProjectId) {
      setActiveProjectId(newProjectId);
      setCurrentView('board');
    }
  };

  return (
    <div className="flex flex-col h-full text-zinc-300">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md font-bold text-lg tracking-widest text-zinc-100 cursor-pointer">
          KEVLAR
        </div>
      </div>

      <div className="px-3 pb-2 pt-1 flex flex-col gap-1 mt-1">
        <Button
          variant="ghost"
          onClick={handleNewChat}
          className={`w-full justify-start gap-2 h-9 px-3 text-zinc-300 bg-transparent border ${currentView === 'chat' && !activeChatId ? 'border-zinc-500/50 bg-zinc-800/50' : 'border-zinc-700/50 hover:bg-zinc-800/50'}`}
        >
          <SquarePen className="w-4 h-4 text-zinc-400" />
          <span className="font-medium text-sm">New chat</span>
        </Button>
      </div>

      <div className="px-3 pb-4 flex flex-col gap-[2px]">
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <Input 
            placeholder="Search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-3 bg-zinc-800/50 border-transparent text-sm placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-700 shadow-none"
          />
        </div>
        
        <NavItem
          icon={<LayoutDashboard className="w-4 h-4 text-zinc-400" />}
          label="Agent Board"
          active={currentView === 'board'}
          onClick={() => setCurrentView('board')}
        />
        <NavItem
          icon={<Users className="w-4 h-4 text-zinc-400" />}
          label="Teams"
          active={currentView === 'teams'}
          onClick={() => setCurrentView('teams')}
        />
        <NavItem icon={<Blocks className="w-4 h-4 text-zinc-400" />} label="Plugins" active={currentView === 'plugins'} onClick={() => setCurrentView('plugins')} />
        <NavItem icon={<Zap className="w-4 h-4 text-zinc-400" />} label="Automations" active={currentView === 'automations'} onClick={() => setCurrentView('automations')} />
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-2 mb-1">
            <span className="flex items-center gap-1 cursor-pointer hover:text-zinc-300">Projects <ChevronDown className="w-3 h-3" /></span>
            <Plus onClick={handleNewProject} className="w-3.5 h-3.5 cursor-pointer hover:text-zinc-300" />
          </div>
          
          <div className="flex flex-col gap-[1px]">
            {filteredProjects.map(project => (
              <ProjectItem 
                key={project.id}
                label={project.name} 
                time={project.time} 
                isSub={project.isSub} 
                active={activeProjectId === project.id}
                onClick={() => {
                  setActiveProjectId(project.id);
                  setCurrentView('board');
                }}
                onRename={(name) => updateProjectName(project.id, name)}
                onDelete={async () => {
                  await deleteProject(project.id);
                  if (activeProjectId === project.id) {
                    setActiveProjectId(null);
                    setCurrentView('chat');
                  }
                }}
              />
            ))}
            {filteredProjects.length === 0 && searchQuery && (
              <div className="px-2 py-2 text-xs text-zinc-500">No projects found.</div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-2 mb-1">
            <span>Chats</span>
          </div>
          
          <div className="flex flex-col gap-[1px]">
            {filteredChats.map(chat => (
              <ChatItem 
                key={chat.id}
                label={chat.name} 
                time={chat.time} 
                active={currentView === 'chat' && activeChatId === chat.id}
                onClick={() => {
                  setActiveChatId(chat.id);
                  setActiveProjectId(chat.projectId);
                  setCurrentView('chat');
                }}
                onRename={(name) => updateChatName(chat.id, name)}
                onDelete={async () => {
                  await deleteChat(chat.id);
                  if (activeChatId === chat.id) {
                    setActiveChatId(null);
                    setCurrentView('chat');
                  }
                }}
              />
            ))}
            {filteredChats.length === 0 && searchQuery && (
              <div className="px-2 py-2 text-xs text-zinc-500">No chats found.</div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-zinc-800/40">
        <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" onClick={onOpenSettings} />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`w-full justify-start gap-2 h-8 px-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50 transition-none font-normal text-sm ${active ? 'bg-zinc-800/50 text-zinc-100' : ''}`}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}

function ProjectItem({ label, time, active, isSub, onClick, onRename, onDelete }: { label: string, time?: string, active?: boolean, isSub?: boolean, onClick?: () => void, onRename?: (name: string) => void, onDelete?: () => void, key?: React.Key }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(label);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editValue.trim() && editValue !== label) {
        onRename?.(editValue.trim());
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(label);
    }
  };

  return (
    <div className={`flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer text-sm ${active ? 'bg-zinc-800/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}>
      <div className="flex items-center gap-2 overflow-hidden flex-1" onClick={isEditing ? undefined : onClick}>
        {!isSub ? (
          <Folder className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-zinc-400" />
        ) : (
          <div className="w-4 h-4 shrink-0" />
        )}
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (editValue.trim() && editValue !== label) {
                onRename?.(editValue.trim());
              }
              setIsEditing(false);
            }}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-1 py-0.5 rounded text-xs focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{label}</span>
        )}
      </div>
      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {onRename && (
            <SquarePen
              role="button"
              aria-label={`Rename project ${label}`}
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditValue(label); }}
              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-zinc-200 text-zinc-400 block"
            />
          )}
          {onDelete && (
            <Trash2
              role="button"
              aria-label={`Delete project ${label}`}
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete();
              }}
              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-400 block ml-0.5"
            />
          )}
          {time && <span className="text-[10px] text-zinc-600">{time}</span>}
          {!time && !isSub && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 ml-0.5"><polyline points="9 18 15 12 9 6"></polyline></svg>}
        </div>
      )}
    </div>
  );
}

function ChatItem({ label, time, active, onClick, onRename, onDelete }: { label: string, time?: string, active?: boolean, onClick?: () => void, onRename?: (name: string) => void, onDelete?: () => void, key?: React.Key }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(label);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editValue.trim() && editValue !== label) {
        onRename?.(editValue.trim());
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(label);
    }
  };

  return (
    <div className={`flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer text-sm ${active ? 'bg-zinc-800/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}>
      <div className="flex items-center gap-2 overflow-hidden flex-1" onClick={isEditing ? undefined : onClick}>
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (editValue.trim() && editValue !== label) {
                onRename?.(editValue.trim());
              }
              setIsEditing(false);
            }}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-1 py-0.5 rounded text-xs focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{label}</span>
        )}
      </div>
      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {onRename && (
            <SquarePen
              role="button"
              aria-label={`Rename chat ${label}`}
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditValue(label); }}
              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-zinc-200 text-zinc-400"
            />
          )}
          {onDelete && (
            <Trash2
              role="button"
              aria-label={`Delete chat ${label}`}
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete();
              }}
              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-400 ml-0.5 block"
            />
          )}
          {active ? (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] ml-1" />
          ) : (
            time && <span className="text-[10px] text-zinc-600 ml-1">{time}</span>
          )}
        </div>
      )}
    </div>
  );
}
