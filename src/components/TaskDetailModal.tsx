import { X, Check, FileText, Code2, AlertCircle, Trash2, Edit2, SquarePen } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AgentTask } from '@/types/task';
import { updateTaskStatus, deleteTask, updateTaskTitle } from '@/lib/mutations';
import type {TaskStatus} from '@/shared/types';

interface TaskDetailModalProps {
  task: AgentTask;
  onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(task.title);

  const handleApprove = async () => {
    await updateTaskStatus(task.id, 'Completed');
    onClose();
  };

  const handleReject = async () => {
    await updateTaskStatus(task.id, 'Idle');
    onClose();
  };

  const handleRequestChanges = async () => {
    await updateTaskStatus(task.id, 'Processing');
    onClose();
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onClose();
  };

  const handleSaveTitle = async () => {
    if (editTitleValue.trim() && editTitleValue !== task.title) {
      await updateTaskTitle(task.id, editTitleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleSetStatus = async (status: TaskStatus) => {
    await updateTaskStatus(task.id, status);
    onClose();
  };
  return (
    // Absolute positioning to fill ONLY the MainWorkspace canvas
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">

      {/* Subtle dark glass backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Modal Window */}
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#111113]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex flex-col gap-1 w-full mr-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/40 border border-white/5 text-zinc-400">
                   {task.projectTag}
                 </span>
                 <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                   {task.status}
                 </span>
               </div>
               <Button onClick={handleDelete} variant="ghost" size="icon" title="Delete task" aria-label={`Delete task ${task.title}`} className="h-6 w-6 text-zinc-500 hover:text-red-400">
                 <Trash2 className="w-3.5 h-3.5" />
               </Button>
            </div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2 mt-1">
                 <input
                   autoFocus
                   aria-label="Task title"
                   value={editTitleValue}
                   onChange={(e) => setEditTitleValue(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') handleSaveTitle();
                     if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitleValue(task.title); }
                   }}
                   onBlur={handleSaveTitle}
                   className="flex-1 text-lg font-medium bg-black/40 border border-zinc-700 text-zinc-100 px-2 py-0.5 rounded focus:outline-none min-w-0"
                 />
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1 group">
                 <h2 className="text-lg font-medium text-zinc-100 truncate">{task.title}</h2>
                 <Button onClick={() => setIsEditingTitle(true)} variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-zinc-500 hover:text-zinc-300">
                   <span className="sr-only">Rename task {task.title}</span>
                   <SquarePen className="w-3.5 h-3.5" />
                 </Button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close task details"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="mb-5 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Status</div>
            <div className="flex flex-wrap gap-2">
              {(['Idle', 'Processing', 'Awaiting User', 'Completed'] as TaskStatus[]).map((status) => (
                <Button
                  key={status}
                  onClick={() => handleSetStatus(status)}
                  disabled={task.status === status}
                  aria-label={`Set task status ${status}`}
                  size="sm"
                  variant="outline"
                  className="h-8 bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {task.payloadType === 'none' && (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-3">
              <AlertCircle className="w-8 h-8 opacity-50" />
              <p className="text-sm">No detailed payload available for this task.</p>
            </div>
          )}

          {task.payloadType === 'markdown' && task.payload && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-zinc-400 text-sm pb-2 border-b border-white/5">
                <FileText className="w-4 h-4" />
                <span>Generated Document</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-zinc-300 bg-black/20 p-4 rounded-xl border border-white/5">
                {/* Extremely basic markdown rendering for prototype phase */}
                {task.payload.content.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-medium text-white mb-3 mt-1">{line.slice(2)}</h1>;
                  if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-medium text-white mb-2 mt-4">{line.slice(3)}</h2>;
                  if (line.startsWith('* ')) return <li key={i} className="ml-4 mb-1">{line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')}</li>;
                  if (line.trim() === '') return <br key={i} />;
                  return <p key={i} className="mb-2 leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
          )}

          {task.payloadType === 'diff' && task.payload && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-zinc-400 text-sm pb-2 border-b border-white/5">
                <Code2 className="w-4 h-4" />
                <span>Proposed Code Changes</span>
              </div>
              <p className="text-sm text-zinc-300">{task.payload.content}</p>

              <div className="mt-2 rounded-xl border border-white/10 overflow-hidden bg-[#0D0D0E] font-mono text-[13px] leading-relaxed">
                <div className="px-4 py-2 bg-red-500/10 text-red-400 border-b border-white/5 flex items-start gap-3">
                  <span className="opacity-50 select-none">-</span>
                  <pre className="whitespace-pre-wrap font-inherit m-0 break-all">{task.payload.oldContent}</pre>
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 flex items-start gap-3">
                  <span className="opacity-50 select-none">+</span>
                  <pre className="whitespace-pre-wrap font-inherit m-0 break-all">{task.payload.newContent}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {task.status === 'Awaiting User' && (
          <div className="p-4 border-t border-white/10 bg-white/[0.02] shrink-0 flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              onClick={handleReject}
            >
              Reject
            </Button>
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              onClick={handleRequestChanges}
            >
              Request Changes
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400/20 shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
              onClick={handleApprove}
            >
              <Check className="w-4 h-4 mr-2" />
              Approve & Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
