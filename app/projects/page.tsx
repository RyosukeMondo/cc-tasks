"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProjectList } from "@/components/projects/ProjectList";
import { projectService } from "@/lib/services/projectService";
import { Project } from "@/lib/types/project";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const projectList = await projectService.listProjects();
        setProjects(projectList);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  const handleProjectSelect = useCallback((projectId: string) => {
    router.push(`/projects/${projectId}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Claude Code Projects</h1>
          <p className="text-sm text-slate-400">
            Browse and manage your Claude Code project sessions
          </p>
        </header>
        
        <main className="flex-1">
          <ProjectList
            projects={projects}
            onProjectSelect={handleProjectSelect}
            isLoading={isLoading}
            errorMessage={error}
          />
        </main>
      </div>
    </div>
  );
}