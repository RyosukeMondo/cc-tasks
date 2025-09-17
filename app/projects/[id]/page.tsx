"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { SessionList } from "@/components/projects/SessionList";
import { sessionService } from "@/lib/services/sessionService";
import { projectService } from "@/lib/services/projectService";
import { SessionMetadata, Project } from "@/lib/types/project";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
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
          sessionService.listSessionsForProject(projectId)
        ]);

        // Find the specific project
        const foundProject = projectList.find(p => p.id === projectId);
        if (!foundProject) {
          setError(`Project "${projectId}" not found`);
          setIsLoading(false);
          return;
        }

        setProject(foundProject);
        setSessions(sessionList);
      } catch (err) {
        console.error('Failed to load project details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project details');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectAndSessions();
  }, [projectId]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    // For now, we'll log the session selection
    // In the future, this could navigate to a session detail view
    console.log(`Selected session: ${sessionId} in project: ${projectId}`);
  }, [projectId]);

  const handleBackToProjects = useCallback(() => {
    router.push('/projects');
  }, [router]);

  if (isLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
          <nav className="flex items-center gap-2 text-sm">
            <Link 
              href="/projects" 
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Projects
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">Error</span>
          </nav>

          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
            <h1 className="text-xl font-bold text-rose-200 mb-2">Project Not Found</h1>
            <p className="text-sm text-rose-300 mb-4">{error}</p>
            <button
              onClick={handleBackToProjects}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Back to Projects
            </button>
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
        {/* Navigation breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          <Link 
            href="/projects" 
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Projects
          </Link>
          <span className="text-slate-500">/</span>
          <span className="text-white font-medium">{project.name}</span>
        </nav>

        {/* Project header */}
        <header className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <p className="text-sm text-slate-400">
                {project.description || "Claude Code project sessions and conversations"}
              </p>
            </div>
            <button
              onClick={handleBackToProjects}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700"
            >
              Back to Projects
            </button>
          </div>

          {/* Project metadata */}
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-medium">Project ID:</span>
              <code className="px-2 py-1 bg-slate-800 rounded text-slate-300">
                {project.id}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Sessions:</span>
              <span className="text-slate-300">{sessions.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Last Activity:</span>
              <span className="text-slate-300">
                {project.lastActivity 
                  ? new Date(project.lastActivity).toLocaleDateString()
                  : "No activity"
                }
              </span>
            </div>
          </div>
        </header>
        
        {/* Sessions list */}
        <main className="flex-1">
          <SessionList
            sessions={sessions}
            projectName={project.name}
            onSessionSelect={handleSessionSelect}
            isLoading={false}
            errorMessage={null}
          />
        </main>
      </div>
    </div>
  );
}