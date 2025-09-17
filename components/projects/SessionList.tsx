"use client";

import { SessionMetadata } from "@/lib/types/project";
import { cardSurface } from "@/lib/ui/layout";
import { SessionCard } from "./SessionCard";

type SessionListProps = {
  sessions: SessionMetadata[];
  projectName?: string;
  onSessionSelect?: (sessionId: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
};

export function SessionList({ 
  sessions, 
  projectName,
  onSessionSelect, 
  isLoading = false, 
  errorMessage = null 
}: SessionListProps) {
  return (
    <section className={`${cardSurface} space-y-4 p-6`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {projectName ? `${projectName} Sessions` : "Project Sessions"}
        </h2>
        <span className="text-xs uppercase tracking-wider text-slate-500">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </span>
      </div>
      
      {isLoading ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
          Loading sessions...
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={onSessionSelect ? () => onSessionSelect(session.id) : undefined}
            />
          ))}
          {!sessions.length && (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
              <div className="space-y-2">
                <p className="font-medium">No sessions found</p>
                <p>This project doesn&apos;t have any Claude Code conversation sessions yet.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
