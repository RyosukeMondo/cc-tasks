"use client";

import { TaskStatus } from "@/lib/types/task";

type StatusToken = {
  label: string;
  hue: string;
  text: string;
};

const STATUS_TOKENS: Record<TaskStatus, StatusToken> = {
  queued: { label: "Queued", hue: "bg-blue-500/20", text: "text-blue-300" },
  processing: { label: "Processing", hue: "bg-amber-500/20", text: "text-amber-300" },
  pause: { label: "Paused", hue: "bg-slate-500/20", text: "text-slate-200" },
  aborted: { label: "Aborted", hue: "bg-rose-500/20", text: "text-rose-300" },
  completed: { label: "Completed", hue: "bg-emerald-500/20", text: "text-emerald-300" },
};

type StatusBadgeProps = {
  status: TaskStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const token = STATUS_TOKENS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${token.hue} ${token.text}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {token.label}
    </span>
  );
}
