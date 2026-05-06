import { useState } from 'react';
import { mockTasks } from '@/data/mockTasks';
import { TaskCard } from './TaskCard';
import { AgentTask, TaskStatus } from '@/types/task';

interface KanbanBoardProps {
  onTaskClick: (task: AgentTask) => void;
}

const COLUMNS: TaskStatus[] = ['Idle', 'Processing', 'Awaiting User', 'Completed'];

export function KanbanBoard({ onTaskClick }: KanbanBoardProps) {
  const [viewScope, setViewScope] = useState<'Global' | 'Local'>('Global');

  // In a real app, this would filter based on the selected project if 'Local'
  const filteredTasks = mockTasks;

  return (
    <div className="flex-1 flex flex-col h-full p-6 w-full animate-in fade-in duration-300">

      {/* Header & Controls */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-xl font-medium tracking-tight text-zinc-100">Agent Orchestration</h2>

        {/* Segmented Control */}
        <div className="flex bg-black/40 backdrop-blur-md border border-white/5 p-1 rounded-lg">
          <button
            onClick={() => setViewScope('Global')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewScope === 'Global'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            Global
          </button>
          <button
            onClick={() => setViewScope('Local')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewScope === 'Local'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            Local
          </button>
        </div>
      </div>

      {/* Board Columns */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(status => {
          const columnTasks = filteredTasks.filter(t => t.status === status);

          return (
            <div key={status} className="flex-1 min-w-[280px] max-w-[320px] flex flex-col h-full bg-black/20 rounded-xl border border-white/5 backdrop-blur-xl">

              {/* Column Header */}
              <div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-medium text-zinc-300">{status}</h3>
                <span className="text-xs font-medium bg-white/5 text-zinc-500 px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                {columnTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                ))}
                {columnTasks.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 font-medium border-2 border-dashed border-white/5 rounded-lg">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
