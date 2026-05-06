import { AgentTask } from '@/types/task';
import { Bot, User, CircleDashed } from 'lucide-react';
import React from 'react';

export interface TaskCardProps {
  task: AgentTask;
  onClick: (task: AgentTask) => void;
  key?: React.Key;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <div
      onClick={() => onClick(task)}
      className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 cursor-pointer transition-colors flex flex-col gap-2 group backdrop-blur-md shadow-sm"
    >
      <div className="flex justify-between items-start gap-2">
        <h4 className="text-sm font-medium text-zinc-200 leading-snug group-hover:text-white transition-colors">
          {task.title}
        </h4>
        {task.status === 'Processing' && (
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        )}
        {task.status === 'Awaiting User' && (
          <CircleDashed className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0 animate-[spin_4s_linear_infinite]" />
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/40 border border-white/5 text-zinc-400">
          {task.projectTag}
        </span>

        <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
          {task.creatorType === 'User' ? (
            <div className="w-4 h-4 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center" title="Created by User">
              <User className="w-2.5 h-2.5 text-zinc-400" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center" title={`Assigned to ${task.assignedAgent}`}>
              <Bot className="w-2.5 h-2.5 text-purple-400" />
            </div>
          )}
          <span className="text-[10px] text-zinc-500 truncate max-w-[80px]">
            {task.assignedAgent || 'Unassigned'}
          </span>
        </div>
      </div>
    </div>
  );
}
