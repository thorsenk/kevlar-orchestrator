import { 
  Folder, 
  Settings, 
  Search, 
  Blocks, 
  Zap, 
  Plus, 
  ChevronDown,
  SquarePen,
  Filter,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { ViewState } from "./AppShell";

interface SidebarLeftProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
}

export function SidebarLeft({ currentView, setCurrentView }: SidebarLeftProps) {
  return (
    <div className="flex flex-col h-full text-zinc-300">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-900 cursor-pointer">
          <div className="w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-red-900/50" />
          </div>
          <div className="w-4 h-4 rounded-full bg-yellow-500/80 mx-1" />
          <div className="w-4 h-4 rounded-full bg-green-500/80" />
        </div>
      </div>

      <div className="px-3 pb-2 pt-1 flex flex-col gap-1 mt-1">
        <Button
          variant="ghost"
          onClick={() => setCurrentView('chat')}
          className={`w-full justify-start gap-2 h-9 px-3 text-zinc-300 bg-transparent border ${currentView === 'chat' ? 'border-zinc-500/50 bg-zinc-800/50' : 'border-zinc-700/50 hover:bg-zinc-800/50'}`}
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
            className="h-9 pl-9 bg-transparent border-none text-sm placeholder:text-zinc-500 focus-visible:ring-0 shadow-none px-3"
          />
        </div>
        
        <NavItem
          icon={<LayoutDashboard className="w-4 h-4 text-zinc-400" />}
          label="Agent Board"
          active={currentView === 'board'}
          onClick={() => setCurrentView('board')}
        />
        <NavItem icon={<Blocks className="w-4 h-4 text-zinc-400" />} label="Plugins" />
        <NavItem icon={<Zap className="w-4 h-4 text-zinc-400" />} label="Automations" />
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-2 mb-1">
            <span className="flex items-center gap-1 cursor-pointer hover:text-zinc-300">Projects <ChevronDown className="w-3 h-3" /></span>
            <Plus className="w-3.5 h-3.5 cursor-pointer hover:text-zinc-300" />
          </div>
          
          <div className="flex flex-col gap-[1px]">
            <ProjectItem label="thorsenk-pkm" time="~" />
            <ProjectItem label="Evaluate project" time="1d" isSub />
            <ProjectItem label="Save raw note" time="3d" isSub />
            <ProjectItem label="Create trip summary f..." time="1mo" isSub />
            <ProjectItem label="Document family trav..." time="1mo" isSub />
            <ProjectItem label="s4d-xd" />
            <ProjectItem label="rffl" />
            <ProjectItem label="mental-model-docs" />
            <ProjectItem label="rffl-tools" />
            <ProjectItem label="02-rffl" />
            <ProjectItem label="kyle-thorsen-nxs" />
            <ProjectItem label="code" />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-2 mb-1">
            <span>Chats</span>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 cursor-pointer transition-opacity">
            <Filter className="w-3.5 h-3.5" />
          </div>
          </div>
          
          <div className="flex flex-col gap-[1px]">
            <ChatItem label="Generate community c..." active />
            <ChatItem label="Check mom's IMessages" time="1d" />
            <ChatItem label="Find Linear connection ..." time="3d" />
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-zinc-800/40">
        <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" />
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

function ProjectItem({ label, time, active, isSub }: { label: string, time?: string, active?: boolean, isSub?: boolean }) {
  return (
    <div className={`flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer text-sm ${active ? 'bg-zinc-800/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}>
      <div className="flex items-center gap-2 overflow-hidden">
        {!isSub ? (
          <Folder className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-zinc-400" />
        ) : (
          <div className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </div>
      {time && <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{time}</span>}
      {!time && !isSub && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><polyline points="9 18 15 12 9 6"></polyline></svg>}
    </div>
  );
}

function ChatItem({ label, time, active }: { label: string, time?: string, active?: boolean }) {
  return (
    <div className={`flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer text-sm ${active ? 'bg-zinc-800/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}>
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="truncate">{label}</span>
      </div>
      {active ? (
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ml-2 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
      ) : (
        time && <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{time}</span>
      )}
    </div>
  );
}
