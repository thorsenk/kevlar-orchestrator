import { AppShell } from "./components/AppShell";
import { ThemeProvider } from "./components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function AuthLoader() {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0F0F11] flex items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full bg-[#0F0F11] flex flex-col items-center justify-center text-zinc-100 p-6">
        <h1 className="text-2xl font-medium tracking-tight mb-2">Welcome to AI Studio</h1>
        <p className="text-zinc-400 mb-6 text-center max-w-sm">Sign in with your Google account to access your agents, teams, and orchestrator.</p>
        <Button onClick={signIn} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-900/20 px-8">
          Sign In
        </Button>
      </div>
    );
  }

  return <AppShell />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="app-ui-theme">
      <AuthProvider>
        <TooltipProvider delay={0}>
          <AuthLoader />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
