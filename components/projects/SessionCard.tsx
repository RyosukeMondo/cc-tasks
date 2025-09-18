"use client";

import { useRouter } from "next/navigation";
import { SessionMetadata } from "@/lib/types/project";
import { cardSurface } from "@/lib/ui/layout";
import { SessionStatusIndicator } from "@/components/monitoring/SessionStatusIndicator";
import { SessionControlPanel } from "@/components/monitoring/SessionControlPanel";
import { MonitoringUpdate, SessionControlRequest, SessionControlResult } from "@/lib/types/monitoring";

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

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

type SessionCardProps = {
  session: SessionMetadata;
  projectId?: string;
  onClick?: () => void;
  // Optional monitoring integration
  monitoringData?: MonitoringUpdate;
  onControlAction?: (request: SessionControlRequest) => Promise<SessionControlResult>;
  showControls?: boolean;
};

export function SessionCard({ 
  session, 
  projectId, 
  onClick, 
  monitoringData, 
  onControlAction, 
  showControls = false 
}: SessionCardProps) {
  const router = useRouter();
  const status: SessionStatus = session.isAccessible ? "accessible" : "error";
  
  // Use monitoring data for real-time status if available
  const hasMonitoringData = !!monitoringData;
  const currentSessionState = monitoringData?.state;
  const sessionProgress = monitoringData?.progress;
  const sessionControls = monitoringData
    ? monitoringData.controls ?? {
        sessionId: monitoringData.sessionId,
        projectId: monitoringData.projectId,
        availableActions: ['pause', 'resume', 'terminate', 'restart'] as const,
        canPause: currentSessionState === 'active' || currentSessionState === 'idle',
        canResume: currentSessionState === 'paused',
        canTerminate: currentSessionState !== 'terminated',
        canRestart: true
      }
    : null;

  const handleViewContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (projectId && session.isAccessible) {
      router.push(`/projects/${projectId}/sessions/${session.id}`);
    }
  };
  
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
          {hasMonitoringData && sessionProgress?.currentActivity && (
            <p className="text-xs text-blue-300 truncate mt-1">
              {sessionProgress.currentActivity}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          {hasMonitoringData && currentSessionState ? (
            <SessionStatusIndicator status={currentSessionState} size="sm" />
          ) : (
            <SessionStatusBadge status={status} />
          )}
          {hasMonitoringData && sessionProgress && (
            <div className="text-xs text-slate-400 text-right space-y-1">
              <div>{sessionProgress.tokenUsage.totalTokens.toLocaleString()} tokens</div>
              <div>{formatDuration(sessionProgress.duration)}</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="text-slate-300">
            <span className="font-medium">{formatFileSize(session.fileSize)}</span>
          </div>
          {hasMonitoringData && sessionProgress ? (
            <div className="text-slate-400">
              {sessionProgress.messagesCount} messages
            </div>
          ) : (
            <div className="text-slate-400">
              Modified: {formatLastModified(session.lastModified)}
            </div>
          )}
        </div>
        
        {projectId && session.isAccessible && (
          <button
            onClick={handleViewContent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-200 transition-all duration-200 hover:bg-slate-600/50 hover:text-white focus:bg-slate-600/50 focus:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Content
          </button>
        )}
      </div>
      
      {!session.isAccessible && (
        <div className="mt-2 text-xs text-red-400">
          Unable to access session file
        </div>
      )}
      
      {/* Session Control Panel */}
      {showControls && hasMonitoringData && sessionControls && onControlAction && currentSessionState && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <SessionControlPanel
            sessionId={sessionControls.sessionId}
            projectId={sessionControls.projectId}
            currentState={currentSessionState}
            controls={sessionControls}
            onControlAction={onControlAction}
          />
        </div>
      )}
    </div>
  );
}

