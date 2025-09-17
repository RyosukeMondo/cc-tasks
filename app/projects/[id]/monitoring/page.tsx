"use client";

import { useCallback, useEffect, useState } from "react";
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
    isMonitoring,
    isLoading,
    error: monitoringError,
  } = useSessionMonitoring(projectId || "");

  // Load project metadata
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

  // Auto-start monitoring when component mounts
  useEffect(() => {
    if (projectId && !isMonitoring && !isLoading) {
      void startMonitoring({ pollInterval: 2000 });
    }
  }, [projectId, isMonitoring, isLoading, startMonitoring]);

  const handleToggleMonitoring = useCallback(async () => {
    try {
      if (isMonitoring) {
        await stopMonitoring();
      } else {
        await startMonitoring({ pollInterval: 2000 });
      }
    } catch (err) {
      console.error("Failed to toggle monitoring:", err);
    }
  }, [isMonitoring, startMonitoring, stopMonitoring]);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
        <ProjectNavigation
          currentProjectName={project.name}
          currentProjectId={project.id}
          showBackButton={true}
        />

        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">Session Monitoring</h1>
              <p className="text-sm text-slate-400">
                Real-time monitoring for all active Claude Code sessions in {project.name}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={refresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700/50 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600/50 focus:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                aria-label="Refresh monitoring data"
              >
                <svg 
                  className={`size-4 ${isLoading ? "animate-spin" : ""}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                Refresh
              </button>
              
              <button
                onClick={handleToggleMonitoring}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 ${
                  isMonitoring
                    ? "bg-red-600/20 text-red-300 hover:bg-red-600/30"
                    : "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
                }`}
              >
                <div 
                  className={`size-2 rounded-full ${
                    isMonitoring ? "bg-red-400 animate-pulse" : "bg-slate-400"
                  }`} 
                />
                {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
              </button>
            </div>
          </div>

          {/* Monitoring Status */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <span className={isMonitoring ? "text-emerald-300" : "text-slate-300"}>
                {isMonitoring ? "Active" : "Inactive"}
              </span>
            </div>
            {monitoringData && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Active Sessions:</span>
                <span className="text-white">{sessions.length}</span>
              </div>
            )}
            {monitoringData?.lastUpdate && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Last Update:</span>
                <span className="font-mono text-slate-300">
                  {new Date(monitoringData.lastUpdate).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {monitoringError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4">
              <div className="flex items-start gap-3">
                <svg className="size-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-rose-200">Monitoring Error</h3>
                  <p className="text-sm text-rose-300 mt-1">{monitoringError.message}</p>
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 space-y-6">
          {!isMonitoring && !monitoringError && (
            <div className={`text-center py-12 ${cardSurface}`}>
              <div className="space-y-4">
                <div className="mx-auto size-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                  <svg className="size-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Monitoring Inactive</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Start monitoring to view real-time session data and controls
                  </p>
                  <button
                    onClick={handleToggleMonitoring}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    Start Monitoring
                  </button>
                </div>
              </div>
            </div>
          )}

          {isMonitoring && sessions.length === 0 && !isLoading && (
            <div className={`text-center py-12 ${cardSurface}`}>
              <div className="space-y-4">
                <div className="mx-auto size-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                  <svg className="size-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">No Active Sessions</h3>
                  <p className="text-sm text-slate-400">
                    No Claude Code sessions are currently running for this project
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sessions Grid */}
          {sessions.length > 0 && (
            <div className="space-y-6">
              {/* Session List */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Active Sessions ({sessions.length})</h2>
                
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <SessionCard
                      key={session.sessionId}
                      session={session}
                      isSelected={selectedSessionId === session.sessionId}
                      onSelect={() => selectSession(session.sessionId)}
                    />
                  ))}
                </div>
              </div>

              {/* Selected Session Details */}
              {selectedSession && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Session Details</h2>
                    <code className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                      {selectedSession.sessionId}
                    </code>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Progress Display */}
                    <SessionProgressDisplay 
                      sessionData={selectedSession}
                      className="lg:col-span-1"
                    />

                    {/* Control Panel */}
                    <div className={`${cardSurface} p-4`}>
                      <h3 className="text-sm font-semibold text-white mb-4">Session Controls</h3>
                      <SessionControlPanel
                        sessionId={selectedSession.sessionId}
                        projectId={projectId || ""}
                        currentState={selectedSession.sessionState}
                        controls={selectedSession.controls}
                        onControlAction={executeControl}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

type SessionCardProps = {
  session: MonitoringUpdate;
  isSelected: boolean;
  onSelect: () => void;
};

function SessionCard({ session, isSelected, onSelect }: SessionCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 ${
        isSelected
          ? "border-white/20 bg-white/5"
          : "border-white/5 bg-white/2 hover:border-white/10 hover:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <SessionStatusIndicator 
              status={session.sessionState} 
              size="sm"
            />
            <span className="text-sm text-slate-300 truncate">
              {session.metadata.name || "Unnamed Session"}
            </span>
          </div>
          
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>
                <span className="text-slate-500">Tokens:</span>{" "}
                <span className="text-slate-300 font-mono">
                  {session.progress.tokenUsage.totalTokens.toLocaleString()}
                </span>
              </span>
              <span>
                <span className="text-slate-500">Messages:</span>{" "}
                <span className="text-slate-300">{session.progress.messagesCount}</span>
              </span>
            </div>
            {session.progress.currentActivity && (
              <div className="truncate">
                <span className="text-slate-500">Activity:</span>{" "}
                <span className="text-slate-300">{session.progress.currentActivity}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="text-xs text-slate-500">
            Updated {new Date(session.timestamp).toLocaleTimeString()}
          </div>
          {session.health.errorCount > 0 && (
            <div className="text-xs text-rose-300">
              {session.health.errorCount} error{session.health.errorCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}