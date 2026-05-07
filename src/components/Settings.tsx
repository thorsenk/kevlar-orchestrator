import {useEffect, useState} from 'react';
import {AlertCircle, CheckCircle2, RefreshCw, Terminal, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {CodexStatus} from '@/shared/types';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({onClose}: SettingsProps) {
  const [status, setStatus] = useState<CodexStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setStatus(await window.kevlar.codex.status());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-2xl flex flex-col bg-[#111113]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-medium text-zinc-100">Codex CLI</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <StatusPill ok={Boolean(status?.ok)} loading={loading} />
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading} className="bg-white/5 border-white/10 text-zinc-300 hover:text-white">
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <InfoRow label="CLI Path" value={status?.cliPath ?? 'Not found'} />
            <InfoRow label="Version" value={status?.version ?? 'Unknown'} />
            <InfoRow label="Login" value={status?.loginStatus ?? 'Unknown'} />
            <InfoRow label="Default Model" value={status?.defaultModel ?? 'gpt-5.2'} />
            <InfoRow label="Sandbox" value={status?.defaultSandboxMode ?? 'workspace-write'} />
          </div>

          {status?.warnings.map((warning) => (
            <span key={warning}>
              <Notice tone="warning" text={warning} />
            </span>
          ))}
          {status?.errors.map((error) => (
            <span key={error}>
              <Notice tone="error" text={error} />
            </span>
          ))}

          {!loading && status?.ok && (
            <div className="flex items-start gap-2 text-emerald-300 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              Kevlar will use your local Codex login. No Gemini, Firebase, or provider API keys are required.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ok, loading}: {ok: boolean; loading: boolean}) {
  const text = loading ? 'Checking' : ok ? 'Ready' : 'Needs attention';
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
      ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {text}
    </div>
  );
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 text-right truncate max-w-[420px]">{value}</span>
    </div>
  );
}

function Notice({tone, text}: {tone: 'warning' | 'error'; text: string}) {
  const isError = tone === 'error';
  return (
    <div className={`flex items-start gap-2 text-xs rounded-lg p-3 border ${
      isError ? 'text-rose-300 bg-rose-500/10 border-rose-500/20' : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
    }`}>
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
