import Link from "next/link";

import { cardSurface } from "@/lib/ui/layout";

const NAV_LINKS = [
  {
    title: "Project Session Viewer",
    description: "Browse Claude Code projects detected on this machine and open their JSONL conversation history.",
    href: "/projects",
    cta: "Browse projects",
    highlights: [
      "Detects sessions in ~/.claude/projects",
      "Opens conversations with rich viewer",
      "Shows metadata like last activity"
    ],
  },
  {
    title: "Task Queue Manager",
    description: "Experiment with the managed task queue experience and review recent Claude automation runs.",
    href: "/tasks",
    cta: "Open task queue",
    highlights: [
      "Draft and enqueue synthetic tasks",
      "Monitor session state by status",
      "Review design guidance notes"
    ],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 pb-24 pt-16">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Claude control workspace</p>
          <h1 className="text-3xl font-semibold text-white">Choose where to start</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Explore existing Claude Code projects or continue with the task orchestration sandbox. You can always return here from the Projects breadcrumb.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${cardSurface} group flex h-full flex-col gap-5 p-6 transition-colors hover:border-blue-400/40 hover:bg-slate-900/80`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-widest text-slate-300">
                  {item.cta}
                </span>
              </div>

              <ul className="space-y-2 text-sm text-slate-300">
                {item.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center gap-2 text-sm font-medium text-blue-300">
                <span>{item.cta}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

