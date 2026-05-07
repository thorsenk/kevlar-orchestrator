import React from "react";
import { 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  Rocket, 
  Lock, 
  Share,
  User,
  Play,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

import {clearSideCarCards, promoteSideCarCard, runSideCar} from "@/lib/mutations";
import type { ViewState } from "./AppShell";
import type {SideCarCard as SideCarCardType} from "@/shared/types";

export function SidebarRight({ 
  activeChatId, 
  setActiveChatId, 
  setCurrentView 
}: { 
  activeChatId: string | null; 
  setActiveChatId: (id: string | null) => void;
  setCurrentView: (view: ViewState) => void;
}) {
  const [activeSubTab, setActiveSubTab] = React.useState<'Summary' | 'Decisions' | 'Questions' | 'Next Steps'>('Summary');
  const [isSending, setIsSending] = React.useState(false);
  const [isRunning, setIsRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cards, setCards] = React.useState<SideCarCardType[]>([]);
  const visibleCards = cards.filter((card) => {
    if (activeSubTab === 'Summary') return card.kind === 'summary';
    if (activeSubTab === 'Decisions') return card.kind === 'decision';
    if (activeSubTab === 'Questions') return card.kind === 'open_question';
    return card.kind === 'next_step';
  });

  React.useEffect(() => {
    if (!activeChatId) {
      setCards([]);
      return;
    }
    window.kevlar.sideCar.cards(activeChatId).then(setCards).catch(console.error);
    return window.kevlar.onAgentEvent((event) => {
      if (event.type === 'data_changed' && event.scope === 'sidecar' && event.chatId === activeChatId) {
        window.kevlar.sideCar.cards(activeChatId).then(setCards).catch(console.error);
      }
    });
  }, [activeChatId]);

  const handleRunSideCar = async () => {
    if (!activeChatId || isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      setCards(await runSideCar(activeChatId));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSendToPrimary = async () => {
    if (!activeChatId || cards.length === 0) return;
    await handlePromoteCard(cards[0].id);
  };

  const handlePromoteCard = async (cardId: string) => {
    if (!activeChatId) return;
    try {
      setIsSending(true);
      setActiveChatId(activeChatId);
      setCurrentView('chat');
      await promoteSideCarCard(cardId);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleClearCards = async () => {
    if (!activeChatId || cards.length === 0) return;
    await clearSideCarCards(activeChatId);
    setCards([]);
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white/80">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 relative z-10">
        <h2 className="text-[15px] font-semibold text-white/90 tracking-wide mix-blend-plus-lighter">Side-Car Agent</h2>
        <Badge variant="outline" className="bg-white/[0.04] text-white/70 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-full px-2 py-0 h-[22px] font-medium text-[11px] mix-blend-plus-lighter">Isolated</Badge>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-5 border-b border-white/[0.04] shadow-[0_1px_0_rgba(0,0,0,0.3)] relative z-10">
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md border border-black/40 shadow-[inset_0_1px_4px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)] rounded-xl h-9 px-3 text-white/80">
          <User className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium mix-blend-plus-lighter">Observer mode</span>
        </div>

        <div className="grid grid-cols-4 gap-1 px-1 pt-1 text-[12px] font-medium border-b border-black/40 shadow-[0_1px_0_rgba(255,255,255,0.03)] relative">
          {(['Summary', 'Decisions', 'Questions', 'Next Steps'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`pb-2.5 cursor-pointer relative mix-blend-plus-lighter transition-colors text-center ${activeSubTab === tab ? 'text-white/90' : 'text-white/40 hover:text-white/70'}`}
            >
              {tab}
              {activeSubTab === tab && <div className="absolute -bottom-[1px] left-1 right-1 h-[2px] bg-white/40 rounded-t-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Stream Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white/90 mix-blend-plus-lighter">{activeSubTab}</h3>
          <div className="flex items-center gap-1.5 opacity-80 mix-blend-plus-lighter">
             <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.8)] animate-pulse' : 'bg-white/25'}`} />
            <span className="text-[10px] font-medium text-white/60 uppercase tracking-widest">{isRunning ? 'Running' : 'Local'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/[0.04] shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]">
             <Button onClick={handleRunSideCar} disabled={!activeChatId || isRunning} variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:bg-white/[0.1] hover:text-white rounded-lg transition-all mix-blend-plus-lighter disabled:opacity-40" title="Run Side-Car">
               <Play className="w-3.5 h-3.5" fill="currentColor" />
             </Button>
          </div>
          
          <Button onClick={handleClearCards} disabled={!activeChatId || cards.length === 0} variant="ghost" size="sm" className="h-8 text-[11px] font-medium text-white/50 border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06] hover:text-white/90 rounded-xl transition-all mix-blend-plus-lighter px-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] disabled:opacity-40">
            <Trash2 className="w-3 h-3 mr-1.5" />
            Clear History
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {visibleCards.length > 0 ? (
            visibleCards.map((card) => (
              <React.Fragment key={card.id}>
                <StreamCard
                  icon={iconForKind(card.kind)}
                  title={card.title}
                  items={card.content.split('\n').filter(Boolean)}
                  isTasks={card.kind === 'next_step'}
                  promoted={Boolean(card.promotedAt)}
                  onPromote={() => handlePromoteCard(card.id)}
                />
              </React.Fragment>
            ))
          ) : cards.length > 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/60">
              No {activeSubTab.toLowerCase()} cards in the latest Side-Car run.
            </div>
          ) : (
            <EmptySideCarState activeChatId={activeChatId} isRunning={isRunning} error={error} />
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-black/40 shadow-[0_-1px_0_rgba(255,255,255,0.03),0_-10px_30px_rgba(0,0,0,0.4)] bg-transparent flex flex-col gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <Button disabled variant="outline" className="flex-1 bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:text-white transition-all duration-300 h-10 font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-xl mix-blend-plus-lighter disabled:opacity-60">
            <Lock className="w-4 h-4 mr-2" />
            Keep Isolated
          </Button>
          <Button 
            onClick={handleSendToPrimary}
            disabled={!activeChatId || cards.length === 0 || isSending}
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

function EmptySideCarState({activeChatId, isRunning, error}: {activeChatId: string | null; isRunning: boolean; error: string | null}) {
  if (isRunning) {
    return (
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
        Side-Car is reading the current chat with a read-only Codex run.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
        <p className="font-medium">Side-Car run failed</p>
        <p className="mt-1 text-xs text-rose-200/80 line-clamp-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/60">
      <p className="font-medium text-white/80">{activeChatId ? 'No Side-Car cards yet' : 'No chat selected'}</p>
      <p className="mt-1 text-xs text-white/45">
        {activeChatId ? 'Run Side-Car to create local summary, decision, question, and next-step cards.' : 'Open a chat before running Side-Car.'}
      </p>
    </div>
  );
}

function iconForKind(kind: SideCarCardType['kind']) {
  switch (kind) {
    case 'decision':
      return <CheckCircle2 className="w-3.5 h-3.5 text-white" />;
    case 'open_question':
      return <HelpCircle className="w-3.5 h-3.5 text-white" />;
    case 'next_step':
      return <Rocket className="w-3.5 h-3.5 text-white" />;
    default:
      return <FileText className="w-3.5 h-3.5 text-white" />;
  }
}

function StreamCard({ 
  icon, 
  title, 
  items, 
  isTasks,
  promoted,
  onPromote,
}: { 
  icon: React.ReactNode, 
  title: string, 
  items: string[], 
  isTasks?: boolean,
  promoted?: boolean,
  onPromote: () => void,
}) {
  return (
    <Card className="p-4 bg-white/[0.04] backdrop-blur-xl border-white/[0.08] rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.2)] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.04] before:to-transparent before:pointer-events-none">
      
      {/* Specular highlight border for 3D card affect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.2] to-transparent pointer-events-none mix-blend-plus-lighter" />
      
      <div className="flex items-start justify-between gap-2 mb-3 relative z-10 mix-blend-plus-lighter">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-black/30 backdrop-blur-md border border-black/40 block w-fit shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.06)] text-white/80 shrink-0">
            {icon}
          </div>
          <h4 className="font-semibold text-[13px] text-white/95 tracking-wide drop-shadow-sm truncate">{title}</h4>
        </div>
        <Button
          onClick={onPromote}
          disabled={promoted}
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-white/55 hover:text-white hover:bg-white/10 shrink-0 disabled:opacity-40"
        >
          {promoted ? 'Promoted' : 'Promote'}
        </Button>
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
