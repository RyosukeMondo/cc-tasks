"use client";

import { MouseEvent } from "react";

import { Task, TaskStatus } from "@/lib/types/task";
import { cardSurface } from "@/lib/ui/layout";
import { StatusBadge } from "@/components/shared/StatusBadge";

type TaskSessionsPanelProps = {
  task: Task | null;
  onOpenHistory?: (taskId: string) => void;
  onOpenSession?: (sessionId: string) => void;
};

const SESSION_STATUS_LABELS: Record<TaskStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  paused: "Paused",
  aborted: "Aborted",
  completed: "Completed",
};

export function TaskSessionsPanel({ task, onOpenHistory, onOpenSession }: TaskSessionsPanelProps) {
  const handleHistoryClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (task && onOpenHistory) {
      onOpenHistory(task.id);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    if (onOpenSession) {
      onOpenSession(sessionId);
    }
  };

  if (!task) {
    return (
      <section className={`${cardSurface} flex-1 p-8`}>
        <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
          <p className="text-lg font-semibold text-slate-300">Select a task to preview its sessions</p>
          <p className="mt-2 text-sm">The panel updates as soon as you tap an item from the pipeline.</p>
        </div>
      </section>
    );
  }

  const sessionStatusCounts = task.sessions.reduce<Record<TaskStatus, number>>((acc, session) => {
    acc[session.status] += 1;
    return acc;
  }, {
    queued: 0,
    processing: 0,
    paused: 0,
    aborted: 0,
    completed: 0,
  });

  const waitingCount = sessionStatusCounts.queued + sessionStatusCounts.paused;
  const totalTokens = task.sessions.reduce((sum, session) => sum + session.tokenCount, 0);
  const formattedTokens = new Intl.NumberFormat("en-US").format(totalTokens);
  const latestSession = task.sessions[0] ?? null;
  const abortedCount = sessionStatusCounts.aborted;

  const metrics: Array<{ label: string; value: string; emphasize?: boolean }> = [
    { label: "Active sessions", value: sessionStatusCounts.processing.toString() },
    { label: "Waiting", value: waitingCount.toString() },
    { label: "Completed", value: sessionStatusCounts.completed.toString() },
    { label: "Tokens processed", value: formattedTokens, emphasize: true },
  ];

  return (
    <section className={`${cardSurface} flex-1 p-8`}>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-8 border-b border-white/5 pb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{task.id}</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{task.prompt}</h2>
            <p className="mt-3 text-sm text-slate-300">Completion condition: {task.completionCondition}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={task.status} />
            <p className="text-xs text-slate-500">Created {task.createdAt}</p>
            {abortedCount > 0 && (
              <span className="rounded-full bg-rose-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-rose-200">
                {abortedCount} aborted
              </span>
            )}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="rounded-full bg-white/10 px-3 py-1">{task.sessions.length} sessions</span>
            <span className="text-slate-500">Explore the timeline below</span>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 transition hover:border-white/30 hover:bg-white/10"
            onClick={handleHistoryClick}
          >
            View Claude history
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">{metric.label}</p>
              <p
                className={`mt-2 text-xl font-semibold text-white ${
                  metric.emphasize ? "font-mono tracking-wide" : ""
                }`}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Latest activity:{" "}
          {latestSession
            ? `${latestSession.startedAt} - ${SESSION_STATUS_LABELS[latestSession.status]}`
            : "Awaiting first run"}
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {task.sessions.map((session) => (
            <article key={session.id} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{session.startedAt}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{session.summary}</h3>
                </div>
                <StatusBadge status={session.status} />
              </div>
              <p className="text-sm text-slate-300">
                Session ID: <span className="font-mono">{session.id}</span>
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Tokens processed: <span className="text-slate-200">{session.tokenCount}</span>
                </span>
                <button
                  className="rounded-lg border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70 transition hover:border-white/30 hover:bg-white/10"
                  onClick={() => handleSessionClick(session.id)}
                >
                  Open session
                </button>
              </div>
            </article>
          ))}
        </div>
        {!task.sessions.length && (
          <div className="mt-12 flex flex-1 flex-col items-center justify-center text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-300">No sessions yet</p>
            <p className="mt-2 text-sm">Sessions will appear here once Claude Code begins processing this task.</p>
          </div>
        )}
      </div>
    </section>
  );
}

