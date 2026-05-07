import React, { useState, useEffect, useRef } from "react";
import { Plus, Mic, ArrowUp, Paperclip, ChevronDown, CheckCircle2, Image as ImageIcon, Map, LayoutGrid, Link as LinkIcon, Folder, Music, FileImage, Blocks, Zap, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { useChats, useMessages, useProjects } from "@/lib/db";
import { sendMessage, updateChatProject, createChat, updateChatName } from "@/lib/mutations";
import { GoogleGenAI } from '@google/genai';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chats = useChats();
  const messages = useMessages(activeChatId);
  const projects = useProjects();
  
  const currentChat = activeChatId ? chats.find(c => c.id === activeChatId) : null;
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
    if (!chatInput.trim()) return;
    const content = chatInput;
    setChatInput("");

    let currentChatId = activeChatId;

    if (!currentChatId || currentView !== 'chat') {
      const newChatId = await createChat("New Chat");
      if (newChatId) {
        currentChatId = newChatId;
        setActiveChatId(newChatId);
        setCurrentView('chat');
      } else {
        return;
      }
    }

    await sendMessage(currentChatId, content, 'user');

    // Make an AI call
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
           model: 'gemini-3-flash-preview',
           contents: content,
        });
        if (response.text) {
          await sendMessage(currentChatId, response.text, 'assistant');
        }
      } else {
        setTimeout(async () => {
          if (currentChatId) {
            await sendMessage(currentChatId, "Simulated reply as GEMINI_API_KEY is not defined. I received your message: " + content, 'assistant');
          }
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      await sendMessage(currentChatId, "I'm sorry, I encountered an error communicating with my AI brain. Please make sure the GEMINI_API_KEY is configured.", 'assistant');
    }
  };

  if (currentView === 'teams') {
    return <TeamsWorkspace />;
  }

  if (currentView === 'plugins') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden h-full text-zinc-400">
        <Blocks className="w-8 h-8 mb-4 opacity-50" />
        <p>Plugins workspace coming soon.</p>
      </div>
    );
  }

  if (currentView === 'automations') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden h-full text-zinc-400">
        <Zap className="w-8 h-8 mb-4 opacity-50" />
        <p>Automations workspace coming soon.</p>
      </div>
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
                   onChange={(e) => updateChatProject(activeChatId, e.target.value)}
                 >
                   <option value="">None</option>
                   {projects.map(p => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                 </select>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 py-4 pb-[120px]">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0">
                       <span className="text-sm">🤖</span>
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 text-zinc-200 shadow-sm' 
                      : 'bg-black/40 text-zinc-300 border border-white/5 backdrop-blur-sm leading-relaxed' 
                  }`}>
                    {/* Basic newline rendering for text */}
                    {(msg.content || '').split('\n').map((line: string, i: number) => (
                      <React.Fragment key={i}>
                        {line}
                        {i !== (msg.content || '').split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input box fixed to bottom of workspace view area */}
            <div className="absolute bottom-4 left-0 right-0 w-full bg-[#18181A] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-3 shadow-[0_24px_50px_rgb(0,0,0,0.5)] shrink-0 z-10">
              <textarea 
                placeholder="Reply..."
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
                      <DropdownMenuItem>
                        <FileImage className="w-4 h-4 mr-2" />
                        Add Image
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Music className="w-4 h-4 mr-2" />
                        Add Audio
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Folder className="w-4 h-4 mr-2" />
                          <span>Move to Project</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => updateChatProject(activeChatId, "")}>
                              None
                            </DropdownMenuItem>
                            {projects.map(p => (
                              <DropdownMenuItem key={p.id} onClick={() => updateChatProject(activeChatId, p.id)}>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800">
                    <Mic className="w-[18px] h-[18px]" />
                  </Button>
                  <Button onClick={handleSendMessage} size="icon" className="h-8 w-8 rounded-full bg-zinc-100 text-black hover:bg-white ml-1 shadow-sm transition-transform hover:scale-105">
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </Button>
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

        <h1 className="text-[28px] font-medium tracking-tight text-zinc-100 mb-2 mt-2">What should we work on?</h1>

        {/* Input box */}
        <div className="w-full bg-[#18181A] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <textarea 
            placeholder="Ask anything. I can help with research, planning, analysis, and building."
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
                  <DropdownMenuItem>
                    <FileImage className="w-4 h-4 mr-2" />
                    Add Image
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Music className="w-4 h-4 mr-2" />
                    Add Audio
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
                              const newId = await createChat("New Chat");
                              if (newId) {
                                await updateChatProject(newId, p.id);
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
                <div className="flex -space-x-[5px] mr-1 items-center">
                  <div className="w-[14px] h-[14px] rounded-full bg-[#A855F7] outline outline-[2px] outline-[#18181A] z-10" />
                  <div className="w-[14px] h-[14px] rounded-full bg-[#10B981] outline outline-[2px] outline-[#18181A] z-0" />
                </div>
                Full access <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-[-2px]" />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 font-normal px-2">
                GPT-4.5 <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800">
                <Mic className="w-[18px] h-[18px]" />
              </Button>
              <Button onClick={handleSendMessage} size="icon" className="h-8 w-8 rounded-full bg-zinc-100 text-black hover:bg-white ml-1 shadow-sm transition-transform hover:scale-105">
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Suggestion Cards text needs to wrap. */}
        <div className="flex justify-center gap-3 w-full mt-2 flex-wrap">
          <ActionCard 
            icon={<ImageIcon className="w-5 h-5 text-zinc-400 mb-3 opacity-80" />}
            text="Triage screenshots pile directly"
          />
          <ActionCard 
            icon={<Map className="w-5 h-5 text-zinc-400 mb-3 opacity-80" />}
            text="Map Kevlar docs to the live prototype"
          />
          <ActionCard 
            icon={<LayoutGrid className="w-5 h-5 text-zinc-400 mb-3 opacity-80" />}
            text="Work the canvas UI kit phase 1 brief"
          />
          <ActionCard 
            icon={<LinkIcon className="w-5 h-5 text-zinc-400 mb-3 opacity-80" />}
            text="Connect your favorite apps"
          />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex flex-col p-4 bg-[#18181A]/40 border border-zinc-800/60 rounded-xl hover:bg-zinc-800/40 cursor-pointer transition-colors w-[170px] h-[110px] text-zinc-400 group">
      {icon}
      <span className="text-[13px] font-medium leading-snug group-hover:text-zinc-200 mt-auto opacity-90">{text}</span>
    </div>
  );
}
