"use client";

import { Task, TaskStatus } from "@/lib/types/task";
import { cardSurface } from "@/lib/ui/layout";
import { StatusBadge } from "@/components/shared/StatusBadge";

type TaskPipelineProps = {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  paused: "Paused",
  aborted: "Aborted",
  completed: "Completed",
};

const STATUS_ORDER: TaskStatus[] = ["processing", "queued", "paused", "completed", "aborted"];

export function TaskPipeline({
  tasks,
  selectedTaskId,
  onSelect,
  isLoading = false,
  errorMessage = null,
}: TaskPipelineProps) {
  const statusCounts = tasks.reduce<Record<TaskStatus, number>>((acc, task) => {
    acc[task.status] += 1;
    return acc;
  }, {
    queued: 0,
    processing: 0,
    paused: 0,
    aborted: 0,
    completed: 0,
  });

  const statusesWithCount = STATUS_ORDER.filter((status) => statusCounts[status] > 0);

  return (
    <section className={`${cardSurface} space-y-4 p-6`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Task pipeline</h2>
        <span className="text-xs uppercase tracking-wider text-slate-500">{tasks.length} tasks</span>
      </div>
      {isLoading ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
          Loading pipeline...
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : (
        <>
          {statusesWithCount.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-slate-400">
              {statusesWithCount.map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1"
                >
                  <span className="font-semibold text-slate-200">{STATUS_LABELS[status]}</span>
                  <span className="font-mono text-xs text-white/80">{statusCounts[status]}</span>
                </span>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;

              return (
                <button
                  key={task.id}
                  onClick={() => onSelect(task.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    isSelected
                      ? "border-white/40 bg-white/10"
                      : "border-white/5 hover:border-white/20 hover:bg-white/5"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{task.createdAt}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">{task.prompt}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-slate-400">
                    Completion: {task.completionCondition}
                  </p>
                </button>
              );
            })}
            {!tasks.length && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
                Nothing in queue yet. Add a task to populate the pipeline.
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
