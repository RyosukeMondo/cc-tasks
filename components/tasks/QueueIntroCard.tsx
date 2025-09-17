"use client";

import { cardSurface } from "@/lib/ui/layout";

export function QueueIntroCard() {
  return (
    <header className={`${cardSurface} p-6 shadow-lg shadow-slate-950/40`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Claude Code</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Queue new task</h1>
        </div>
        <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
          Mock
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-400">
        Define a prompt and completion condition to stage a Claude Code automation. Nothing is sent yet &mdash; this is a clickable prototype.
      </p>
    </header>
  );
}
