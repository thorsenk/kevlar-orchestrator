import React, { useState, useEffect, useRef } from "react";
import { Plus, ArrowUp, ChevronDown, Image as ImageIcon, Map, LayoutGrid, Link as LinkIcon, Folder, Blocks, Zap, SquarePen, Bot, AlertTriangle, Loader2, Square, FolderPlus, Terminal, CalendarClock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { InfinityParticles } from "./InfinityParticles";
import { KanbanBoard } from "./KanbanBoard";
import { TaskDetailModal } from "./TaskDetailModal";
import { TeamsWorkspace } from "./TeamsWorkspace";
import { AgentTask } from "@/types/task";
import type { ViewState } from "./AppShell";
import { useAgentRunState, useChats, useCodexStatus, useMessages, useProjects } from "@/lib/db";
import { sendAgentMessage, updateChatProject, createChat, updateChatName, createProject } from "@/lib/mutations";
import type {AgentRunState, CodexStatus} from "@/shared/types";

interface MainWorkspaceProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

export function MainWorkspace({ currentView, setCurrentView, activeChatId, setActiveChatId, activeProjectId, setActiveProjectId }: MainWorkspaceProps) {
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chats = useChats();
  const messages = useMessages(activeChatId);
  const projects = useProjects();
  const codexStatus = useCodexStatus();
  const runState = useAgentRunState(activeChatId);
  
  const currentChat = activeChatId ? chats.find(c => c.id === activeChatId) : null;
  const selectedProjectId = currentChat ? currentChat.projectId : activeProjectId ?? null;
  const selectedProject = selectedProjectId ? projects.find((project) => project.id === selectedProjectId) : null;
  const runStatus = runState?.status ?? 'idle';
  const runIsActive = runStatus === 'running' || runStatus === 'cancelling';
  const canSend = Boolean(chatInput.trim() && codexStatus?.ok && selectedProjectId && !isSending && !runIsActive);
  const inputNotice = getInputNotice({
    codexStatus,
    hasProjects: projects.length > 0,
    hasSelectedProject: Boolean(selectedProjectId),
    runState,
  });
  const [isEditingChatName, setIsEditingChatName] = useState(false);
  const [editChatNameValue, setEditChatNameValue] = useState("");

  // Update edit value when chat changes
  useEffect(() => {
    setEditChatNameValue(currentChat?.name || "");
  }, [currentChat?.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!canSend) return;
    const content = chatInput;
    setChatInput("");
    setIsSending(true);

    try {
      const result = await sendAgentMessage({
        chatId: currentView === 'chat' ? activeChatId : null,
        projectId: selectedProjectId,
        content,
      });
      if (!activeChatId || currentView !== 'chat') {
        setActiveChatId(result.chatId);
        setCurrentView('chat');
      }
    } catch (error) {
      console.error(error);
      const fallbackChatId = activeChatId || await createChat("New Chat", selectedProjectId);
      if (fallbackChatId) {
        setActiveChatId(fallbackChatId);
        setCurrentView('chat');
        await window.kevlar.chats.appendMessage({
          chatId: fallbackChatId,
          role: 'assistant',
          content: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleInterrupt = async () => {
    if (!activeChatId || !runIsActive) return;
    try {
      await window.kevlar.agent.interrupt(activeChatId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateProject = async () => {
    const projectId = await createProject();
    if (!projectId) return;
    setActiveProjectId(projectId);
  };

  if (currentView === 'teams') {
    return <TeamsWorkspace />;
  }

  if (currentView === 'plugins') {
    return (
      <LocalStatusWorkspace
        icon={<Blocks className="w-5 h-5" />}
        title="Codex Runtime"
        description="Local tools are resolved from this Mac and exposed to the renderer only through preload IPC."
        items={[
          {label: 'CLI', value: codexStatus?.cliPath ?? 'Checking'},
          {label: 'Version', value: codexStatus?.version ?? 'Unknown'},
          {label: 'Login', value: codexStatus?.loginStatus ?? 'Unknown'},
          {label: 'Model', value: codexStatus?.defaultModel ?? 'gpt-5.2'},
          {label: 'Sandbox', value: codexStatus?.defaultSandboxMode ?? 'workspace-write'},
        ]}
        notices={[...(codexStatus?.errors ?? []), ...(codexStatus?.warnings ?? [])]}
      />
    );
  }

  if (currentView === 'automations') {
    return (
      <LocalStatusWorkspace
        icon={<Zap className="w-5 h-5" />}
        title="Local Run Queue"
        description="This checkpoint supports foreground Codex chat runs and read-only Side-Car passes. Background jobs are intentionally not scheduled in the renderer."
        items={[
          {label: 'Active chat', value: activeChatId ?? 'None'},
          {label: 'Project', value: selectedProject?.name ?? 'None selected'},
          {label: 'Run state', value: runStatus},
          {label: 'Storage', value: 'SQLite in Electron userData'},
        ]}
        notices={runState?.error ? [runState.error] : []}
      />
    );
  }

  if (currentView === 'board') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden h-full">
        <KanbanBoard activeProjectId={activeProjectId} onTaskClick={(task) => setSelectedTask(task)} />
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    );
  }

  if (currentView === 'chat' && activeChatId) {
    const chat = currentChat;

    return (
      <div className="flex-1 flex flex-col items-center p-8 relative h-full">
         <div className="max-w-3xl w-full flex flex-col h-full gap-4 relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0 mt-5">
               <div className="flex items-center gap-2 group">
                 {isEditingChatName ? (
                   <input
                     autoFocus
                     value={editChatNameValue}
                     onChange={(e) => setEditChatNameValue(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         if (editChatNameValue.trim() && editChatNameValue !== chat?.name) {
                           updateChatName(chat!.id, editChatNameValue.trim());
                         }
                         setIsEditingChatName(false);
                       } else if (e.key === 'Escape') {
                         setIsEditingChatName(false);
                         setEditChatNameValue(chat?.name || "");
                       }
                     }}
                     onBlur={() => {
                        if (editChatNameValue.trim() && editChatNameValue !== chat?.name) {
                          updateChatName(chat!.id, editChatNameValue.trim());
                        }
                        setIsEditingChatName(false);
                     }}
                     className="text-xl font-medium bg-zinc-900 border border-zinc-700 text-zinc-100 px-2 py-0.5 rounded focus:outline-none"
                   />
                 ) : (
                   <>
                     <h2 className="text-xl font-medium text-zinc-100">{chat?.name || "Loading..."}</h2>
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
                       onClick={() => {
                         if (!chat) return;
                         setIsEditingChatName(true);
                         setEditChatNameValue(chat.name);
                       }}
                     >
                       <SquarePen className="w-3.5 h-3.5" />
                     </Button>
                   </>
                 )}
               </div>
               <div className="flex items-center gap-2">
                 <div className="text-sm text-zinc-400 font-medium">Project:</div>
                 <select 
                   className="bg-[#18181A] border border-zinc-800 text-sm text-zinc-200 rounded-md py-1 px-2 focus:outline-none"
                   value={chat?.projectId || ""}
                   onChange={(e) => {
                     const nextProjectId = e.target.value || null;
                     updateChatProject(activeChatId, nextProjectId);
                     setActiveProjectId(nextProjectId);
                   }}
                 >
                   <option value="">None</option>
                   {projects.map(p => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                 </select>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 py-4 pb-[120px]">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center text-zinc-500 py-16">
                  <Bot className="w-8 h-8 mb-3 text-zinc-600" />
                  <p className="text-sm text-zinc-300">No Codex messages yet</p>
                  <p className="text-xs mt-1 max-w-sm">Send a prompt after selecting a local project folder.</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0">
                       <Bot className="w-4 h-4 text-purple-200" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 text-zinc-200 shadow-sm' 
                      : 'bg-black/40 text-zinc-300 border border-white/5 backdrop-blur-sm leading-relaxed' 
                  }`}>
                    {msg.status === 'streaming' && !msg.content ? (
                      <span className="inline-flex items-center gap-2 text-zinc-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Codex is working
                      </span>
                    ) : (msg.content || '').split('\n').map((line: string, i: number) => (
                      <React.Fragment key={i}>
                        {line}
                        {i !== (msg.content || '').split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                    {msg.status === 'error' && (
                      <div className="mt-3 text-xs text-rose-300 border-t border-rose-500/20 pt-2">Run failed</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input box fixed to bottom of workspace view area */}
            <div className="absolute bottom-4 left-0 right-0 w-full bg-[#18181A] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-3 shadow-[0_24px_50px_rgb(0,0,0,0.5)] shrink-0 z-10">
              {inputNotice && <InputNotice notice={inputNotice} onAddProject={handleCreateProject} />}
              <textarea 
                placeholder={selectedProject ? `Message Codex in ${selectedProject.name}` : "Select a project before sending to Codex"}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full bg-transparent border-none resize-none focus:outline-none text-zinc-200 placeholder:text-zinc-500 min-h-[48px] p-1 font-normal"
              />
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                      <Plus className="w-5 h-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                      <DropdownMenuItem onClick={handleCreateProject}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Add Project Folder
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Folder className="w-4 h-4 mr-2" />
                          <span>Move to Project</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => {
                              updateChatProject(activeChatId, "");
                              setActiveProjectId(null);
                            }}>
                              None
                            </DropdownMenuItem>
                            {projects.map(p => (
                              <DropdownMenuItem key={p.id} onClick={() => {
                                updateChatProject(activeChatId, p.id);
                                setActiveProjectId(p.id);
                              }}>
                                {p.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-1">
                  {runIsActive ? (
                    <Button
                      onClick={handleInterrupt}
                      disabled={runStatus === 'cancelling'}
                      size="icon"
                      aria-label="Stop Codex run"
                      className="h-8 w-8 rounded-full bg-rose-500/90 text-white hover:bg-rose-400 ml-1 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Stop Codex run"
                    >
                      {runStatus === 'cancelling' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSendMessage}
                      disabled={!canSend}
                      size="icon"
                      aria-label="Send message to Codex"
                      title="Send message to Codex"
                      className="h-8 w-8 rounded-full bg-zinc-100 text-black hover:bg-white ml-1 shadow-sm transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative h-full">
      <div className="max-w-3xl w-full flex flex-col items-center gap-4">
        
        {/* Animated Premium Infinity Particles */}
        <InfinityParticles />

        <h1 className="text-[28px] font-medium tracking-tight text-zinc-100 mb-2 mt-2">Run Codex locally</h1>

        {projects.length === 0 && (
          <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FolderPlus className="w-5 h-5 mt-0.5 text-amber-300 shrink-0" />
              <div>
                <p className="font-medium text-amber-100">Add a local project folder</p>
                <p className="text-xs text-amber-200/80 mt-1">Codex runs against a workspace on this Mac and stores chats in local SQLite.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleCreateProject} className="bg-black/20 border-amber-500/30 text-amber-100 hover:bg-amber-500/10 shrink-0">
              Add Project
            </Button>
          </div>
        )}

        {/* Input box */}
        <div className="w-full bg-[#18181A] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          {inputNotice && <InputNotice notice={inputNotice} onAddProject={handleCreateProject} />}
          <textarea 
            placeholder={selectedProject ? `Ask Codex to work in ${selectedProject.name}` : "Choose a project folder before sending to Codex"}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="w-full bg-transparent border-none resize-none focus:outline-none text-zinc-200 placeholder:text-zinc-400 min-h-[64px] p-1 font-normal"
          />
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                  <Plus className="w-5 h-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  <DropdownMenuItem onClick={handleCreateProject}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Add Project Folder
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Folder className="w-4 h-4 mr-2" />
                      <span>Start in Project</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {projects.map(p => (
                          <DropdownMenuItem 
                            key={p.id}
                            onClick={async () => {
                              const newId = await createChat("New Chat", p.id);
                              if (newId) {
                                setActiveChatId(newId);
                                setActiveProjectId(p.id);
                                setCurrentView('chat');
                              }
                            }}
                          >
                            {p.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="h-8 bg-zinc-900/40 border-zinc-800/60 text-zinc-300 hover:text-white rounded-full gap-2 px-3 font-normal">
                <Folder className="w-3.5 h-3.5" />
                {selectedProject?.name ?? 'No project'} <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-[-2px]" />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 font-normal px-2">
                Codex gpt-5.2 <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1" />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!canSend}
                size="icon"
                aria-label="Send message to Codex"
                title="Send message to Codex"
                className="h-8 w-8 rounded-full bg-zinc-100 text-black hover:bg-white ml-1 shadow-sm transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Suggestion Cards text needs to wrap. */}
        <div className="flex justify-center gap-3 w-full mt-2 flex-wrap">
          <ActionCard 
            icon={<ImageIcon className="w-5 h-5 text-zinc-400 mb-3 opacity-80" />}
            text="Summarize local repo state"
            onClick={() => setChatInput("Summarize the current repository state and call out the highest-risk unfinished areas.")}
          />
          <ActionCard 
            icon={<Map className="w-5 h-5 text-zinc-400 mb-3 opacity-80" />}
            text="Map desktop follow-up work"
            onClick={() => setChatInput("Map the next desktop stabilization tasks for this project with concrete acceptance checks.")}
          />
          <ActionCard 
            icon={<LayoutGrid className="w-5 h-5 text-zinc-400 mb-3 opacity-80" />}
            text="Draft a small implementation plan"
            onClick={() => setChatInput("Draft a small implementation plan for the next safe, testable improvement.")}
          />
          <ActionCard 
            icon={<LinkIcon className="w-5 h-5 text-zinc-400 mb-3 opacity-80" />}
            text="Inspect package readiness"
            onClick={() => setChatInput("Inspect package readiness and list any issues before distribution.")}
          />
        </div>
      </div>
    </div>
  );
}

function LocalStatusWorkspace({
  icon,
  title,
  description,
  items,
  notices,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: Array<{label: string; value: string}>;
  notices: string[];
}) {
  return (
    <div className="flex-1 flex flex-col h-full p-8">
      <div className="max-w-3xl w-full mt-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              {icon}
            </div>
            <div>
              <h2 className="text-xl font-medium text-zinc-100">{title}</h2>
              <p className="text-sm text-zinc-500 mt-1 max-w-xl">{description}</p>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-400 mt-1" />
        </div>

        <div className="grid grid-cols-1 gap-2 mt-5">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
              <span className="text-zinc-500">{item.label}</span>
              <span className="text-zinc-200 text-right truncate max-w-[520px]">{item.value}</span>
            </div>
          ))}
        </div>

        {notices.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {notices.map((notice) => (
              <div key={notice} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {notice}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Terminal className="w-4 h-4 text-zinc-400 mb-3" />
            <p className="text-sm font-medium text-zinc-200">Renderer boundary</p>
            <p className="text-xs text-zinc-500 mt-1">No direct filesystem or process APIs are exposed outside `window.kevlar`.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <CalendarClock className="w-4 h-4 text-zinc-400 mb-3" />
            <p className="text-sm font-medium text-zinc-200">Foreground execution</p>
            <p className="text-xs text-zinc-500 mt-1">Runs are explicit per-chat Codex CLI processes with persisted status.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, text, onClick }: { icon: React.ReactNode, text: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col p-4 bg-[#18181A]/40 border border-zinc-800/60 rounded-xl hover:bg-zinc-800/40 cursor-pointer transition-colors w-[170px] h-[110px] text-zinc-400 group text-left">
      {icon}
      <span className="text-[13px] font-medium leading-snug group-hover:text-zinc-200 mt-auto opacity-90">{text}</span>
    </button>
  );
}

type InputNoticeState = {
  tone: 'warning' | 'error' | 'info' | 'success';
  title: string;
  detail?: string;
  action?: 'add-project';
};

function getInputNotice({
  codexStatus,
  hasProjects,
  hasSelectedProject,
  runState,
}: {
  codexStatus: CodexStatus | null;
  hasProjects: boolean;
  hasSelectedProject: boolean;
  runState: AgentRunState | null;
}): InputNoticeState | null {
  if (!codexStatus) {
    return {tone: 'info', title: 'Checking Codex CLI', detail: 'Kevlar is verifying your local Codex login.'};
  }
  if (!codexStatus.ok) {
    return {
      tone: 'error',
      title: 'Codex unavailable',
      detail: codexStatus.errors[0] ?? 'Open Settings and refresh Codex status.',
    };
  }
  if (!hasProjects) {
    return {
      tone: 'warning',
      title: 'No project folder added',
      detail: 'Add a local folder before starting a Codex run.',
      action: 'add-project',
    };
  }
  if (!hasSelectedProject) {
    return {tone: 'warning', title: 'No project selected', detail: 'Select a local project for this chat.'};
  }
  if (runState?.status === 'running') {
    return {tone: 'info', title: 'Run in progress', detail: 'Codex output will stream into this chat.'};
  }
  if (runState?.status === 'cancelling') {
    return {tone: 'warning', title: 'Stopping run', detail: 'Kevlar sent an interrupt to the Codex process.'};
  }
  if (runState?.status === 'failed') {
    return {
      tone: 'error',
      title: 'Last run failed',
      detail: runState.error ?? runState.stderr ?? 'Open Settings if Codex CLI status needs attention.',
    };
  }
  if (runState?.status === 'completed' && runState.tokenCount) {
    return {tone: 'success', title: 'Last run complete', detail: `${runState.tokenCount.toLocaleString()} tokens reported by Codex.`};
  }
  if (codexStatus.warnings.length > 0) {
    return {tone: 'warning', title: 'Codex config warning', detail: codexStatus.warnings[0]};
  }
  return null;
}

function InputNotice({notice, onAddProject}: {notice: InputNoticeState; onAddProject: () => void}) {
  const toneClass = {
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    error: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
    info: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  }[notice.tone];

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${toneClass}`}>
      <div className="flex items-start gap-2 min-w-0">
        {notice.tone === 'info' ? <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        <div className="min-w-0">
          <p className="font-medium">{notice.title}</p>
          {notice.detail && <p className="mt-0.5 opacity-80 line-clamp-2">{notice.detail}</p>}
        </div>
      </div>
      {notice.action === 'add-project' && (
        <Button size="sm" variant="ghost" onClick={onAddProject} className="h-7 px-2 text-xs text-current hover:bg-white/10 shrink-0">
          Add Project
        </Button>
      )}
    </div>
  );
}
