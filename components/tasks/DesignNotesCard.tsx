"use client";

import { cardSurface } from "@/lib/ui/layout";

export function DesignNotesCard() {
  return (
    <section className={`${cardSurface} p-6 text-sm text-slate-400`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-200">Implementation notes</p>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] uppercase tracking-widest text-emerald-200">Live prototype</span>
      </div>
      <p className="mt-3 leading-relaxed">
        The queue, metrics, and session drill-down now run on real state backed by the task service. Data is persisted locally for repeat visits; replacing the mock service with the production Claude Code API will route these interactions to live automation.
      </p>
    </section>
  );
}
