"use client";

import { cardSurface } from "@/lib/ui/layout";

export function DesignNotesCard() {
  return (
    <section className={`${cardSurface} p-6 text-sm text-slate-400`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-200">Design notes</p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-widest text-white/60">Prototype only</span>
      </div>
      <p className="mt-3 leading-relaxed">
        This screen mocks the Claude Code management console. Queue new automation tasks in the left column, monitor pipeline health, and dive into per-session history. Wire up actual task orchestration by following the specs in how_to_manage_claude_code.md when ready.
      </p>
    </section>
  );
}
