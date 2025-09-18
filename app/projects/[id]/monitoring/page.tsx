"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { ProjectNavigation } from "@/components/projects/ProjectNavigation";
import { SessionStatusIndicator } from "@/components/monitoring/SessionStatusIndicator";
import { SessionProgressDisplay } from "@/components/monitoring/SessionProgressDisplay";
import { SessionControlPanel } from "@/components/monitoring/SessionControlPanel";
import { useSessionMonitoring } from "@/hooks/useSessionMonitoring";
import { projectService } from "@/lib/services/projectService";
import { Project } from "@/lib/types/project";
import { MonitoringUpdate } from "@/lib/types/monitoring";
import { cardSurface } from "@/lib/ui/layout";

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

type MonitoringMetricProps = {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "positive" | "warning";
};

const CONNECTION_STYLES: Record<ConnectionStatus, { label: string; className: string }> = {
  connected: {
    label: "Live",
    className: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40",
  },
  connecting: {
    label: "Connecting",
    className: "bg-blue-500/15 text-blue-200 border border-blue-500/40",
  },
  disconnected: {
    label: "Paused",
    className: "bg-slate-700/60 text-slate-200 border border-slate-600/60",
  },
  error: {
    label: "Degraded",
    className: "bg-amber-500/15 text-amber-100 border border-amber-500/40",
  },
};

function formatRelativeTime(timestamp?: string | null): string {
  if (!timestamp) return "?";
  const target = new Date(timestamp);
  if (Number.isNaN(target.getTime())) return "?";

  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes <= 0) return "moments ago";
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function formatTimestamp(timestamp?: string | null): string {
  if (!timestamp) return "?";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "?";
  return date.toLocaleTimeString();
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "?";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function MonitoringMetric({ label, value, helper, tone = "default" }: MonitoringMetricProps) {
  const toneClasses = {
    default: "text-slate-300",
    positive: "text-emerald-300",
    warning: "text-amber-300",
  } as const;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClasses[tone]}`}>{value}</div>
      {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
    </div>
  );
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const config = CONNECTION_STYLES[status] ?? CONNECTION_STYLES.disconnected;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
      role="status"
    >
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function SessionHealthQuickFacts({ session }: { session: MonitoringUpdate }) {
  const { health } = session;

  return (
    <div className={`${cardSurface} p-4`}>
      <h3 className="text-sm font-semibold text-white">Session Health</h3>
      <dl className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Last activity</dt>
          <dd className="font-mono text-slate-200">{formatRelativeTime(health.lastActivityAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Response time</dt>
          <dd className={health.responseTime && health.responseTime > 5000 ? "text-amber-300" : "text-slate-200"}>
            {health.responseTime ? `${Math.round(health.responseTime)} ms` : "?"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Memory usage</dt>
          <dd>{formatBytes(health.memoryUsage)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">CPU</dt>
          <dd className={health.cpuUsage && health.cpuUsage > 60 ? "text-amber-300" : "text-slate-200"}>
            {typeof health.cpuUsage === "number" ? `${health.cpuUsage.toFixed(1)}%` : "?"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Errors</dt>
          <dd className={health.errorCount > 0 ? "text-rose-300" : "text-slate-200"}>{health.errorCount}</dd>
        </div>
      </dl>

      {health.warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-amber-300">Warnings</div>
          {health.warnings.slice(0, 3).map((warning, index) => (
            <div
              key={`${session.sessionId}-warning-${index}`}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
            >
              {warning}
            </div>
          ))}
          {health.warnings.length > 3 && (
            <div className="text-xs text-slate-500">+{health.warnings.length - 3} more warning(s)</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MonitoringDashboardPage() {
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const {
    monitoringData,
    sessions,
    selectedSession,
    selectedSessionId,
    selectSession,
    executeControl,
    startMonitoring,
    stopMonitoring,
    refresh,
    retryOperation,
    clearError,
    isMonitoring,
    isLoading,
    error: monitoringError,
    errorInfo,
    connectionStatus,
  } = useSessionMonitoring(projectId || "");

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setProjectError("Invalid project ID");
        setIsLoadingProject(false);
        return;
      }

      try {
        setIsLoadingProject(true);
        setProjectError(null);

        const projectList = await projectService.listProjects();
        const foundProject = projectList.find((item) => item.id === projectId);

        if (!foundProject) {
          setProjectError(`Project "${projectId}" not found`);
          setIsLoadingProject(false);
          return;
        }

        setProject(foundProject);
      } catch (err) {
        console.error("Failed to load project:", err);
        setProjectError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setIsLoadingProject(false);
      }
    };

    void loadProject();
  }, [projectId]);

  useEffect(() => {
    if (projectId && !isMonitoring && !isLoading) {
      void startMonitoring({ pollInterval: 2000 });
    }
  }, [projectId, isMonitoring, isLoading, startMonitoring]);

  const handleToggleMonitoring = useCallback(async () => {
    if (!projectId) return;

    try {
      if (isMonitoring) {
        await stopMonitoring();
      } else {
        await startMonitoring({ pollInterval: 2000 });
      }
    } catch (err) {
      console.error("Failed to toggle monitoring:", err);
    }
  }, [isMonitoring, projectId, startMonitoring, stopMonitoring]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const metrics = useMemo(() => {
    if (!monitoringData) return [] as MonitoringMetricProps[];

    const { activeSessions, totalSessions, averageResponseTime, systemLoad } = monitoringData.overallStats;
    const responseTone: MonitoringMetricProps["tone"] = averageResponseTime > 2000 ? "warning" : averageResponseTime > 1000 ? "default" : "positive";
    const loadTone: MonitoringMetricProps["tone"] = systemLoad > 80 ? "warning" : systemLoad > 50 ? "default" : "positive";

    return [
      {
        label: "Active Sessions",
        value: activeSessions.toString(),
        helper: `${totalSessions} tracked`,
        tone: activeSessions > 0 ? "positive" : "default",
      },
      {
        label: "Average Response",
        value: averageResponseTime ? `${Math.round(averageResponseTime)} ms` : "No data",
        helper: averageResponseTime ? formatRelativeTime(monitoringData.lastUpdated) : undefined,
        tone: responseTone,
      },
      {
        label: "System Load",
        value: `${Math.round(systemLoad)}%`,
        helper: systemLoad > 90 ? "Consider reducing concurrency" : "",
        tone: loadTone,
      },
      {
        label: "Last Updated",
        value: formatTimestamp(monitoringData.lastUpdated),
        helper: formatRelativeTime(monitoringData.lastUpdated),
      },
    ];
  }, [monitoringData]);

  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
            Loading project details...
          </div>
        </div>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
          <ProjectNavigation currentProjectName="Error" />

          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
            <h1 className="mb-2 text-xl font-bold text-rose-200">Project Not Found</h1>
            <p className="text-sm text-rose-300">{projectError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const hasLiveData = Boolean(monitoringData && sessions.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
        <ProjectNavigation
          currentProjectName={project.name}
          currentProjectId={project.id}
          showBackButton
        />

        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="uppercase tracking-widest text-xs text-slate-500">Monitoring</span>
              <ConnectionBadge status={connectionStatus} />
            </div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Project ID:</span>
                <code className="rounded bg-slate-900 px-2 py-1 text-slate-300">{project.id}</code>
              </div>
              <div className="flex items-center gap-2">
                <span>Latest update:</span>
                <span className="font-mono text-slate-300">{formatTimestamp(monitoringData?.lastUpdated)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleMonitoring}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
                isMonitoring
                  ? "border border-white/10 bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "bg-emerald-600/80 text-white hover:bg-emerald-500"
              }`}
            >
              {isMonitoring ? "Pause Monitoring" : "Start Monitoring"}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || !isMonitoring}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </header>

        {monitoringError && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="font-semibold">Live updates interrupted</div>
            <p className="mt-1 text-amber-100/80">
              {monitoringError.message}
              {errorInfo?.operation && ` (${errorInfo.operation})`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {errorInfo?.retryable && (
                <button
                  type="button"
                  onClick={() => void retryOperation()}
                  className="rounded-lg bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-400/25"
                >
                  Retry operation
                </button>
              )}
              <button
                type="button"
                onClick={() => clearError()}
                className="rounded-lg border border-amber-300/40 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-400/10"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {metrics.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MonitoringMetric key={metric.label} {...metric} />
            ))}
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
          <aside className={`${cardSurface} flex flex-col gap-4 p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Sessions</h2>
                <p className="text-xs text-slate-500">{sessions.length} tracked</p>
              </div>
              {isMonitoring && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Auto-refresh {monitoringData ? "on" : "pending"}
                </span>
              )}
            </div>

            {!isMonitoring && (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-xs text-slate-400">
                <p className="font-medium text-slate-200">Monitoring paused</p>
                <p className="mt-1">
                  Start monitoring to capture live session activity, token usage, and health signals for this project.
                </p>
              </div>
            )}

            {isMonitoring && !hasLiveData && (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-xs text-slate-400">
                <p className="font-medium text-slate-200">No active sessions yet</p>
                <p className="mt-1">Sessions will appear here as soon as Claude Code activity starts for this project.</p>
              </div>
            )}

            <div className="space-y-2">
              {sessions.map((session) => (
                <MonitoringSessionRow
                  key={session.sessionId}
                  session={session}
                  isSelected={selectedSessionId === session.sessionId}
                  onSelect={() => selectSession(session.sessionId)}
                />
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            {selectedSession ? (
              <div className={`${cardSurface} flex flex-col gap-4 p-5`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <SessionStatusIndicator status={selectedSession.state} size="md" />
                      <h2 className="text-lg font-semibold text-white">Session {selectedSession.sessionId}</h2>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Updated {formatRelativeTime(selectedSession.timestamp)}</span>
                      {selectedSession.metadata.startedAt && (
                        <span>Started {formatRelativeTime(selectedSession.metadata.startedAt)}</span>
                      )}
                      {selectedSession.metadata.processId && (
                        <span>PID {selectedSession.metadata.processId}</span>
                      )}
                    </div>
                    {selectedSession.progress.currentActivity && (
                      <div className="mt-3 text-sm text-slate-300">
                        {selectedSession.progress.currentActivity}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end text-right text-xs text-slate-500">
                    <span>Total tokens</span>
                    <span className="font-mono text-sm text-slate-200">
                      {selectedSession.progress.tokenUsage.totalTokens.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <SessionProgressDisplay sessionData={selectedSession} className="lg:col-span-2" />

                  <SessionControlPanel
                    sessionId={selectedSession.sessionId}
                    projectId={projectId || ""}
                    currentState={selectedSession.state}
                    controls={selectedSession.controls ?? {
                      sessionId: selectedSession.sessionId,
                      projectId: selectedSession.projectId,
                      availableActions: ['pause', 'resume', 'terminate', 'restart'] as const,
                      canPause: selectedSession.state === 'active' || selectedSession.state === 'idle',
                      canResume: selectedSession.state === 'paused',
                      canTerminate: selectedSession.state !== 'terminated',
                      canRestart: true,
                    }}
                    onControlAction={executeControl}
                  />

                  <SessionHealthQuickFacts session={selectedSession} />
                </div>
              </div>
            ) : (
              <div className={`${cardSurface} flex h-full min-h-[280px] items-center justify-center p-10 text-center text-sm text-slate-400`}>
                Select a session to inspect live progress, token usage, and control options.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

type MonitoringSessionRowProps = {
  session: MonitoringUpdate;
  isSelected: boolean;
  onSelect: () => void;
};

function MonitoringSessionRow({ session, isSelected, onSelect }: MonitoringSessionRowProps) {
  const { progress, health } = session;
  const attention = session.state === "error" || session.state === "stalled" || health.errorCount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/20 ${
        isSelected
          ? "border-white/20 bg-white/10 shadow-inner"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <SessionStatusIndicator status={session.state} size="sm" />
            <span className="truncate text-sm text-slate-200">{session.metadata.environment ?? session.sessionId}</span>
          </div>
          {progress.currentActivity && (
            <div className="truncate text-xs text-slate-500">{progress.currentActivity}</div>
          )}
          <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-wider text-slate-500">
            <span className="text-slate-300">
              Tokens {progress.tokenUsage.totalTokens.toLocaleString()}
            </span>
            <span>
              Messages {progress.messagesCount}
            </span>
            <span>{Math.round(progress.duration / 60000)} min</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
          <span>{formatRelativeTime(session.timestamp)}</span>
          {attention && (
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
              Attention
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
