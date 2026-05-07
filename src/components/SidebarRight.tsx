import React from "react";
import { 
  Settings2, 
  Video, 
  FileText, 
  Wand2, 
  BarChart2, 
  CheckCircle2, 
  HelpCircle, 
  Rocket, 
  Lock, 
  Share,
  User,
  ListTodo,
  Pause,
  Play,
  Square,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { sendMessage, createChat } from "@/lib/mutations";
import type { ViewState } from "./AppShell";

export function SidebarRight({ 
  activeChatId, 
  setActiveChatId, 
  setCurrentView 
}: { 
  activeChatId: string | null; 
  setActiveChatId: (id: string | null) => void;
  setCurrentView: (view: ViewState) => void;
}) {
  const [activePrimaryTab, setActivePrimaryTab] = React.useState('Capture');
  const [activeSubTab, setActiveSubTab] = React.useState('Meeting Notes');
  const [isSending, setIsSending] = React.useState(false);

  const handleSendToPrimary = async () => {
    try {
      setIsSending(true);
      let targetChatId = activeChatId;
      if (!targetChatId) {
        const newChatId = await createChat("Meeting context");
        if (newChatId) {
          targetChatId = newChatId;
          setActiveChatId(newChatId);
        } else {
          return;
        }
      }
      
      setCurrentView('chat');
      
      const payload = `=== Hand-off from Side-Car ===\nTab: ${activeSubTab}\nPayload sent from isolated side-car container.`;
      
      await sendMessage(targetChatId, payload, 'user');
      setTimeout(async () => {
        if (targetChatId) {
          await sendMessage(targetChatId, `I received the side-car data for ${activeSubTab}. How would you like to process this context?`, 'assistant');
        }
      }, 1000);

    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white/80">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 relative z-10">
        <h2 className="text-[15px] font-semibold text-white/90 tracking-wide mix-blend-plus-lighter">Side-Car Agent</h2>
        <Badge variant="outline" className="bg-white/[0.04] text-white/70 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-full px-2 py-0 h-[22px] font-medium text-[11px] mix-blend-plus-lighter">Isolated</Badge>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-5 border-b border-white/[0.04] shadow-[0_1px_0_rgba(0,0,0,0.3)] relative z-10">
        <div className="flex items-center gap-2">
          <Select defaultValue="observer">
            <SelectTrigger className="w-full bg-black/20 backdrop-blur-md border border-black/40 shadow-[inset_0_1px_4px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)] rounded-xl h-9 hover:bg-black/30 transition-all text-white/80">
              <div className="flex items-center gap-2 font-medium mix-blend-plus-lighter">
                <User className="w-4 h-4 text-white/60" />
                <SelectValue placeholder="Select mode" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#1C1C1E]/90 backdrop-blur-3xl border border-white/[0.08] text-white/90">
              <SelectItem value="observer">Observer</SelectItem>
              <SelectItem value="participant">Participant</SelectItem>
              <SelectItem value="facilitator">Facilitator</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/60 bg-black/20 border border-black/40 shadow-[inset_0_1px_4px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)] hover:bg-black/30 hover:text-white shrink-0 rounded-xl transition-all mix-blend-plus-lighter">
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Primary Tabs */}
        <div className="grid grid-cols-4 gap-2 bg-black/20 p-1.5 rounded-2xl shadow-[inset_0_1px_6px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.03)] border border-white/[0.02]">
          <TabButton icon={<Video className="w-4 h-4" />} label="Capture" active={activePrimaryTab === 'Capture'} onClick={() => setActivePrimaryTab('Capture')} />
          <TabButton icon={<FileText className="w-4 h-4" />} label="Review" active={activePrimaryTab === 'Review'} onClick={() => setActivePrimaryTab('Review')} />
          <TabButton icon={<Wand2 className="w-4 h-4" />} label="Assist" active={activePrimaryTab === 'Assist'} onClick={() => setActivePrimaryTab('Assist')} />
          <TabButton icon={<BarChart2 className="w-4 h-4" />} label="Visualize" active={activePrimaryTab === 'Visualize'} onClick={() => setActivePrimaryTab('Visualize')} />
        </div>

        {/* Sub Navigation */}
        <div className="flex justify-between px-2 pt-1 text-[13px] font-medium border-b border-black/40 shadow-[0_1px_0_rgba(255,255,255,0.03)] relative">
          <div onClick={() => setActiveSubTab('Meeting Notes')} className={`pb-2.5 cursor-pointer relative mix-blend-plus-lighter transition-colors ${activeSubTab === 'Meeting Notes' ? 'text-white/90' : 'text-white/40 hover:text-white/70'}`}>
            Meeting Notes
            {activeSubTab === 'Meeting Notes' && <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white/40 rounded-t-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />}
          </div>
          <div onClick={() => setActiveSubTab('Decisions')} className={`pb-2.5 cursor-pointer relative mix-blend-plus-lighter transition-colors ${activeSubTab === 'Decisions' ? 'text-white/90' : 'text-white/40 hover:text-white/70'}`}>
            Decisions
            {activeSubTab === 'Decisions' && <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white/40 rounded-t-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />}
          </div>
          <div onClick={() => setActiveSubTab('Timeline')} className={`pb-2.5 cursor-pointer relative mix-blend-plus-lighter transition-colors ${activeSubTab === 'Timeline' ? 'text-white/90' : 'text-white/40 hover:text-white/70'}`}>
            Timeline
            {activeSubTab === 'Timeline' && <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white/40 rounded-t-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />}
          </div>
        </div>
      </div>

      {/* Stream Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white/90 mix-blend-plus-lighter">{activeSubTab}</h3>
          <div className="flex items-center gap-1.5 opacity-80 mix-blend-plus-lighter">
             <div className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
            <span className="text-[10px] font-medium text-white/60 uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Agent Controls */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/[0.04] shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]">
             <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:bg-white/[0.1] hover:text-white rounded-lg transition-all mix-blend-plus-lighter" title="Pause">
               <Pause className="w-3.5 h-3.5" fill="currentColor" />
             </Button>
             <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:bg-white/[0.1] hover:text-white rounded-lg transition-all mix-blend-plus-lighter" title="Resume">
               <Play className="w-3.5 h-3.5" fill="currentColor" />
             </Button>
             <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all mix-blend-plus-lighter" title="Stop">
               <Square className="w-3.5 h-3.5" fill="currentColor" />
             </Button>
          </div>
          
          <Button variant="ghost" size="sm" className="h-8 text-[11px] font-medium text-white/50 border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06] hover:text-white/90 rounded-xl transition-all mix-blend-plus-lighter px-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <Trash2 className="w-3 h-3 mr-1.5" />
            Clear History
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {activeSubTab === 'Meeting Notes' && (
            <>
              <StreamCard 
                icon={<FileText className="w-3.5 h-3.5 text-white" />}
                title="Summary"
                items={[
                  "Reviewed Q2 roadmap and priorities",
                  "Discussed user feedback on onboarding",
                  "Aligned on resourcing for analytics work"
                ]}
              />
              <StreamCard 
                icon={<HelpCircle className="w-3.5 h-3.5 text-white" />}
                title="Open Questions"
                items={[
                  "What's the scope for SSO integration?",
                  "Do we need a dedicated PM for analytics?"
                ]}
              />
            </>
          )}

          {activeSubTab === 'Decisions' && (
            <>
              <StreamCard 
                icon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                title="Decisions"
                items={[
                  "Ship improvements to onboarding flow",
                  "Prioritize analytics dashboard MVP",
                  "Defer legacy data migration"
                ]}
              />
              <StreamCard 
                icon={<Rocket className="w-3.5 h-3.5 text-white" />}
                title="Next Steps"
                items={[
                  "[ ] Share onboarding designs by Fri",
                  "[ ] Draft analytics MVP spec",
                  "[ ] Sync with infra on data pipeline"
                ]}
                isTasks
              />
            </>
          )}

          {activeSubTab === 'Timeline' && (
            <>
              <StreamCard 
                icon={<FileText className="w-3.5 h-3.5 text-white" />}
                title="10:05 AM"
                items={[
                  "Meeting started",
                  "Everyone joined the call"
                ]}
              />
              <StreamCard 
                icon={<FileText className="w-3.5 h-3.5 text-white" />}
                title="10:15 AM"
                items={[
                  "Discussed Q2 roadmap",
                  "Agreed on onboarding priorities"
                ]}
              />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-black/40 shadow-[0_-1px_0_rgba(255,255,255,0.03),0_-10px_30px_rgba(0,0,0,0.4)] bg-transparent flex flex-col gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex-1 bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:text-white transition-all duration-300 h-10 font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-xl mix-blend-plus-lighter">
            <Lock className="w-4 h-4 mr-2" />
            Keep Isolated
          </Button>
          <Button 
            onClick={handleSendToPrimary}
            disabled={isSending}
            className="flex-1 bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.2)] font-medium h-10 rounded-xl transition-all duration-300 mix-blend-plus-lighter"
          >
            <Share className="w-4 h-4 mr-2" />
            {isSending ? "Sending..." : "Send to Primary"}
          </Button>
        </div>
        <p className="text-[11px] text-white/40 text-center tracking-wide mix-blend-plus-lighter">
          Side-Car is isolated and does not affect your main session until shared.
        </p>
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`flex flex-col items-center justify-center py-2.5 flex-1 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden mix-blend-plus-lighter ${active ? 'bg-white/[0.12] shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] text-white' : 'text-white/50 bg-transparent hover:text-white/80 hover:bg-white/[0.04]'}`}>
      <div className={`mb-1.5 ${active ? 'opacity-100' : 'opacity-80'}`}>{icon}</div>
      <span className="text-[11px] font-medium leading-none tracking-wide">{label}</span>
      </div>
  );
}

function StreamCard({ 
  icon, 
  title, 
  items, 
  isTasks 
}: { 
  icon: React.ReactNode, 
  title: string, 
  items: string[], 
  isTasks?: boolean
}) {
  return (
    <Card className="p-4 bg-white/[0.04] backdrop-blur-xl border-white/[0.08] rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.2)] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.04] before:to-transparent before:pointer-events-none">
      
      {/* Specular highlight border for 3D card affect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.2] to-transparent pointer-events-none mix-blend-plus-lighter" />
      
      <div className="flex items-center gap-2.5 mb-3 relative z-10 mix-blend-plus-lighter">
        <div className="p-1.5 rounded-lg bg-black/30 backdrop-blur-md border border-black/40 block w-fit shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.06)] text-white/80">
          {icon}
        </div>
        <h4 className="font-semibold text-[13px] text-white/95 tracking-wide drop-shadow-sm">{title}</h4>
      </div>
      <ul className={`text-[13px] text-white/60 flex flex-col gap-2 relative z-10 mix-blend-plus-lighter ${isTasks ? '' : 'pl-1 space-y-1'}`}>
        {items.map((item, i) => (
          <li key={i} className={`leading-snug ${isTasks ? '' : 'flex items-start before:content-["•"] before:mr-2 before:text-white/30 before:font-bold'}`}>
            {isTasks ? (
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <div className="w-4 h-4 border-[1.5px] border-white/20 bg-black/20 rounded-[4px] mt-[1px] flex shrink-0 items-center justify-center group-hover:border-white/40 transition-colors shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                  {/* Pseudo transparent checkbox empty state */}
                </div>
                <span className="flex-1 group-hover:text-white/90 transition-colors drop-shadow-sm">{item.replace('[ ] ', '')}</span>
              </label>
            ) : (
              <span className="drop-shadow-sm">{item}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
