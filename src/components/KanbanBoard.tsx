import { useState, useEffect } from 'react';
import { useTasks, useProjects } from '@/lib/db';
import { createTask, updateProjectName } from '@/lib/mutations';
import { TaskCard } from './TaskCard';
import { AgentTask, TaskStatus } from '@/types/task';
import { Plus, SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanBoardProps {
  onTaskClick: (task: AgentTask) => void;
  activeProjectId: string | null;
}

const COLUMNS: TaskStatus[] = ['Idle', 'Processing', 'Awaiting User', 'Completed'];

export function KanbanBoard({ onTaskClick, activeProjectId }: KanbanBoardProps) {
  const [viewScope, setViewScope] = useState<'Global' | 'Local'>(activeProjectId ? 'Local' : 'Global');
  
  useEffect(() => {
    if (activeProjectId) {
      setViewScope('Local');
    } else {
      setViewScope('Global');
    }
  }, [activeProjectId]);

  const tasks = useTasks();
  const projects = useProjects();
  const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;

  const filteredTasks = viewScope === 'Global' 
    ? tasks 
    : tasks.filter(t => t.projectTag === activeProjectId);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");

  const handleNewTask = async () => {
    // Default task creation
    await createTask("New Agent Task", activeProjectId || "Global");
  };

  useEffect(() => {
    if (activeProject) {
      setEditTitleValue(activeProject.name);
    }
  }, [activeProject?.name]);

  return (
    <div className="flex-1 flex flex-col h-full p-6 w-full animate-in fade-in duration-300">

      {/* Header & Controls */}
      <div className="flex items-center justify-between mb-6 shrink-0 mt-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group">
            {isEditingTitle && viewScope === 'Local' && activeProject ? (
               <input
                 autoFocus
                 value={editTitleValue}
                 onChange={(e) => setEditTitleValue(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     if (editTitleValue.trim() && editTitleValue !== activeProject.name) {
                       updateProjectName(activeProject.id, editTitleValue.trim());
                     }
                     setIsEditingTitle(false);
                   } else if (e.key === 'Escape') {
                     setIsEditingTitle(false);
                     setEditTitleValue(activeProject.name);
                   }
                 }}
                 onBlur={() => {
                    if (editTitleValue.trim() && editTitleValue !== activeProject.name) {
                      updateProjectName(activeProject.id, editTitleValue.trim());
                    }
                    setIsEditingTitle(false);
                 }}
                 className="text-xl font-medium bg-zinc-900 border border-zinc-700 text-zinc-100 px-2 py-0.5 rounded focus:outline-none"
               />
            ) : (
               <>
                 <h2 className="text-xl font-medium tracking-tight text-zinc-100">
                   {viewScope === 'Local' && activeProject ? activeProject.name : 'Agent Orchestration'}
                 </h2>
                 {viewScope === 'Local' && activeProject && (
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
                     onClick={() => {
                       setIsEditingTitle(true);
                       setEditTitleValue(activeProject.name);
                     }}
                   >
                     <SquarePen className="w-3.5 h-3.5" />
                   </Button>
                 )}
               </>
            )}
          </div>
          <Button onClick={handleNewTask} variant="outline" size="sm" className="bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Task
          </Button>
        </div>

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
