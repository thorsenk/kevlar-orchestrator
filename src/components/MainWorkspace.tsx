import { Plus, Mic, ArrowUp, Paperclip, ChevronDown, CheckCircle2, Image as ImageIcon, Map, LayoutGrid, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfinityParticles } from "./InfinityParticles";

export function MainWorkspace() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
      <div className="max-w-3xl w-full flex flex-col items-center gap-4">
        
        {/* Animated Premium Infinity Particles */}
        <InfinityParticles />

        <h1 className="text-[28px] font-medium tracking-tight text-zinc-100 mb-2 mt-2">What should we work on?</h1>

        {/* Input box */}
        <div className="w-full bg-[#18181A] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <textarea 
            placeholder="Ask anything. I can help with research, planning, analysis, and building."
            className="w-full bg-transparent border-none resize-none focus:outline-none text-zinc-200 placeholder:text-zinc-400 min-h-[64px] p-1 font-normal"
          />
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                <Plus className="w-5 h-5" />
              </Button>
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
              <Button size="icon" className="h-8 w-8 rounded-full bg-zinc-100 text-black hover:bg-white ml-1 shadow-sm transition-transform hover:scale-105">
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
