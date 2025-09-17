"use client";

import { Project } from "@/lib/types/project";
import { cardSurface } from "@/lib/ui/layout";
import { ProjectCard } from "./ProjectCard";

type ProjectListProps = {
  projects: Project[];
  onProjectSelect?: (projectId: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
};

export function ProjectList({ 
  projects, 
  onProjectSelect, 
  isLoading = false, 
  errorMessage = null 
}: ProjectListProps) {
  return (
    <section className={`${cardSurface} space-y-4 p-6`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Claude Code Projects</h2>
        <span className="text-xs uppercase tracking-wider text-slate-500">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </span>
      </div>
      
      {isLoading ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
          Loading projects...
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onProjectSelect ? () => onProjectSelect(project.id) : undefined}
            />
          ))}
          {!projects.length && (
            <div className="col-span-full rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
              <div className="space-y-2">
                <p className="font-medium">No Claude Code projects found</p>
                <p>Projects will appear here once you start using Claude Code in different directories.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}