"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { SessionList } from "@/components/projects/SessionList";
import { sessionService } from "@/lib/services/sessionService";
import { projectService } from "@/lib/services/projectService";
import { SessionMetadata, Project } from "@/lib/types/project";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjectAndSessions = async () => {
      if (!projectId) {
        setError("Invalid project ID");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load project metadata and sessions in parallel
        const [projectList, sessionList] = await Promise.all([
          projectService.listProjects(),
          sessionService.listSessionsForProject(projectId),
        ]);

        const foundProject = projectList.find((item) => item.id === projectId);
        if (!foundProject) {
          setError(`Project "${projectId}" not found`);
          setIsLoading(false);
          return;
        }

        setProject(foundProject);
        setSessions(sessionList);
      } catch (err) {
        console.error("Failed to load project details:", err);
        setError(err instanceof Error ? err.message : "Failed to load project details");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjectAndSessions();
  }, [projectId]);

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      console.log(`Selected session: ${sessionId} in project: ${projectId}`);
    },
    [projectId],
  );

  const projectDescription = useMemo(() => {
    if (!project) {
      return "";
    }

    return (
      project.description ?? project.meta.description ?? "Claude Code project sessions and conversations"
    );
  }, [project]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
        Loading project details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
        <h1 className="mb-2 text-xl font-bold text-rose-200">Project Not Found</h1>
        <p className="text-sm text-rose-300">{error}</p>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const sessionsRecorded = sessions.length;
  const metadataSessions = project.sessionCount;
  const metadataStatusLabel = project.hasValidMeta ? "meta.json detected" : "meta.json missing";

  return (
    <>
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-sm text-slate-400">{projectDescription}</p>
          <p className="font-mono text-xs text-slate-500">{project.path}</p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-medium">Project ID:</span>
            <code className="rounded bg-slate-800 px-2 py-1 text-slate-300">{project.id}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Sessions:</span>
            <span className="text-slate-300">
              {sessionsRecorded}
              {metadataSessions !== sessionsRecorded && ` (catalogued ${metadataSessions})`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Last activity:</span>
            <span className="text-slate-300">
              {project.lastActivity ? new Date(project.lastActivity).toLocaleString() : "No activity"}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest ${
              project.hasValidMeta ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"
            }`}
          >
            {metadataStatusLabel}
          </span>
        </div>
      </header>

      <main className="flex-1">
        <SessionList
          sessions={sessions}
          projectId={projectId}
          projectName={project.name}
          onSessionSelect={handleSessionSelect}
          isLoading={false}
          errorMessage={null}
        />
      </main>
    </>
  );
}


