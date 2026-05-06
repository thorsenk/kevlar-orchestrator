import { SidebarLeft } from "./SidebarLeft";
import { MainWorkspace } from "./MainWorkspace";
import { SidebarRight } from "./SidebarRight";

export function AppShell() {
  return (
    <div className="h-screen w-full bg-[#0F0F11] font-sans overflow-hidden text-foreground relative z-0 flex">
      {/* Ambient background for the entire scene. Extends under the right panel. */}
      <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden">
         <div className="absolute top-[-10%] right-[5%] w-[800px] h-[800px] rounded-full bg-purple-500/10 blur-[130px]" />
         <div className="absolute bottom-[-15%] right-[15%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
         <div className="absolute top-[40%] left-[20%] w-[500px] h-[500px] rounded-full bg-zinc-700/10 blur-[100px]" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="w-[260px] flex-shrink-0 bg-[#161618] flex flex-col border-r border-white/[0.04] z-20 relative shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        <SidebarLeft />
      </div>

      {/* Main Workspace: background is transparent so the ambient blur hits the right panel. Content is padded relative to absolute sidebar. */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 pr-[340px]">
        <MainWorkspace />
      </div>

      {/* True Spatial Glass Right Panel (VisionOS Volumetric Material) */}
      <div className="absolute top-0 right-0 bottom-0 w-[340px] bg-white/[0.04] backdrop-blur-[70px] backdrop-saturate-[180%] flex flex-col z-40 shadow-[-30px_0_60px_rgba(0,0,0,0.5)]">
         {/* Specular Edge Lighting */}
         <div className="absolute inset-0 border-l border-white/[0.15] pointer-events-none z-50 mix-blend-plus-lighter" />
         <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-white/[0.4] to-transparent pointer-events-none z-50 mix-blend-plus-lighter" />
         
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.06] mix-blend-overlay pointer-events-none z-0" />
         
         <div className="relative z-10 flex flex-col w-full h-full">
            <SidebarRight />
         </div>
      </div>
    </div>
  );
}
