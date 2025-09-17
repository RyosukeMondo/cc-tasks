"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";

import { ProjectNavigation } from "@/components/projects/ProjectNavigation";
import { projectService } from "@/lib/services/projectService";
import { Project } from "@/lib/types/project";

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setError("Invalid project ID");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const projectList = await projectService.listProjects();
        const foundProject = projectList.find((item) => item.id === projectId);
        
        if (!foundProject) {
          setError(`Project "${projectId}" not found`);
          setIsLoading(false);
          return;
        }

        setProject(foundProject);
      } catch (err) {
        console.error("Failed to load project:", err);
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProject();
  }, [projectId]);

  // Determine current tab based on pathname
  const isMonitoringPage = pathname?.includes('/monitoring');
  const projectPath = `/projects/${projectId}`;
  const monitoringPath = `/projects/${projectId}/monitoring`;

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
          <ProjectNavigation currentProjectName="Error" />

          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
            <h1 className="mb-2 text-xl font-bold text-rose-200">Project Not Found</h1>
            <p className="text-sm text-rose-300">{error}</p>
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
        {/* Project Navigation with Breadcrumb */}
        <ProjectNavigation
          currentProjectName={project.name}
          currentProjectId={project.id}
          showBackButton={true}
        />

        {/* Project Tabs Navigation */}
        <nav className="flex items-center gap-1 border-b border-slate-800" role="navigation" aria-label="Project sections">
          <Link
            href={projectPath}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 rounded-t-lg ${
              !isMonitoringPage
                ? "border-b-2 border-blue-400 text-blue-300 bg-slate-800/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}
            aria-current={!isMonitoringPage ? "page" : undefined}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v3H8V5z" />
            </svg>
            Sessions
          </Link>
          
          <Link
            href={monitoringPath}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 rounded-t-lg ${
              isMonitoringPage
                ? "border-b-2 border-blue-400 text-blue-300 bg-slate-800/50"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}
            aria-current={isMonitoringPage ? "page" : undefined}
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Monitoring
          </Link>
        </nav>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}