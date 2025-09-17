"use client";

import { SessionMetadata } from "@/lib/types/project";
import { cardSurface } from "@/lib/ui/layout";

type SessionStatus = "accessible" | "error";

type StatusToken = {
  label: string;
  hue: string;
  text: string;
};

const SESSION_STATUS_TOKENS: Record<SessionStatus, StatusToken> = {
  accessible: { label: "Available", hue: "bg-emerald-500/20", text: "text-emerald-300" },
  error: { label: "Error", hue: "bg-red-500/20", text: "text-red-300" },
};

function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const token = SESSION_STATUS_TOKENS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${token.hue} ${token.text}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {token.label}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatLastModified(lastModified: string): string {
  const date = new Date(lastModified);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "Yesterday";
  if (daysDiff < 7) return `${daysDiff} days ago`;
  if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`;
  if (daysDiff < 365) return `${Math.floor(daysDiff / 30)} months ago`;
  return `${Math.floor(daysDiff / 365)} years ago`;
}

type SessionCardProps = {
  session: SessionMetadata;
  onClick?: () => void;
};

export function SessionCard({ session, onClick }: SessionCardProps) {
  const status: SessionStatus = session.isAccessible ? "accessible" : "error";
  
  return (
    <div 
      className={`${cardSurface} p-4 transition-all duration-200 hover:bg-slate-800/60 hover:border-white/10 ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-medium text-white truncate">
            {session.fileName}
          </h4>
          <p className="text-xs text-slate-400 truncate mt-1">
            {session.filePath}
          </p>
        </div>
        <SessionStatusBadge status={status} />
      </div>
      
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="text-slate-300">
            <span className="font-medium">{formatFileSize(session.fileSize)}</span>
          </div>
          <div className="text-slate-400">
            Modified: {formatLastModified(session.lastModified)}
          </div>
        </div>
      </div>
      
      {!session.isAccessible && (
        <div className="mt-2 text-xs text-red-400">
          Unable to access session file
        </div>
      )}
    </div>
  );
}