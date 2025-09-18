"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProjectList } from "@/components/projects/ProjectList";
import { ProjectNavigation } from "@/components/projects/ProjectNavigation";
import { Project } from "@/lib/types/project";

type ProjectsResponse = {
  projects?: Project[];
  error?: string;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const loadProjects = async () => {
      try {
        if (!isCancelled) {
          setIsLoading(true);
          setError(null);
        }

        const response = await fetch("/api/projects", { signal: controller.signal });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as ProjectsResponse;
          throw new Error(payload.error ?? "Failed to load projects");
        }

        const data = (await response.json()) as ProjectsResponse;
        if (!isCancelled) {
          setProjects(data.projects ?? []);
        }
      } catch (err) {
        const errorObj = err as Error;
        if (isCancelled || errorObj.name === "AbortError") {
          return;
        }

        console.error("Failed to load projects:", err);
        setError(errorObj.message ?? "Failed to load projects");
        setProjects([]);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  const handleProjectSelect = useCallback(
    (projectId: string) => {
      router.push(`/projects/${projectId}`);
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
        <header className="space-y-4">
          <ProjectNavigation />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Claude Code Projects</h1>
            <p className="text-sm text-slate-400">
              Browse and manage your Claude Code project sessions
            </p>
          </div>
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
