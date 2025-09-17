"use client";

import { Project } from "@/lib/types/project";
import { cardSurface } from "@/lib/ui/layout";

type ProjectStatus = "active" | "idle" | "stale";

type StatusToken = {
  label: string;
  hue: string;
  text: string;
};

const PROJECT_STATUS_TOKENS: Record<ProjectStatus, StatusToken> = {
  active: { label: "Active", hue: "bg-emerald-500/20", text: "text-emerald-300" },
  idle: { label: "Idle", hue: "bg-amber-500/20", text: "text-amber-300" },
  stale: { label: "Stale", hue: "bg-slate-500/20", text: "text-slate-200" },
};

function getProjectStatus(lastActivity?: string): ProjectStatus {
  if (!lastActivity) return "stale";
  
  const lastActivityDate = new Date(lastActivity);
  const now = new Date();
  const daysSinceActivity = (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceActivity <= 1) return "active";
  if (daysSinceActivity <= 7) return "idle";
  return "stale";
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const token = PROJECT_STATUS_TOKENS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${token.hue} ${token.text}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {token.label}
    </span>
  );
}

function formatLastActivity(lastActivity?: string): string {
  if (!lastActivity) return "Never";
  
  const date = new Date(lastActivity);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "Yesterday";
  if (daysDiff < 7) return `${daysDiff} days ago`;
  if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`;
  if (daysDiff < 365) return `${Math.floor(daysDiff / 30)} months ago`;
  return `${Math.floor(daysDiff / 365)} years ago`;
}

type ProjectCardProps = {
  project: Project;
  onClick?: () => void;
};

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const status = getProjectStatus(project.lastActivity);
  
  return (
    <div 
      className={`${cardSurface} p-6 transition-all duration-200 hover:bg-slate-800/60 hover:border-white/10 ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {project.name}
          </h3>
          <p className="text-sm text-slate-400 truncate mt-1">
            {project.path}
          </p>
          {project.description && (
            <p className="mt-3 line-clamp-2 text-xs text-slate-400">
              {project.description}
            </p>
          )}
        </div>
        <ProjectStatusBadge status={status} />
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-slate-300">
          <span className="font-medium">{project.sessionCount}</span>
          <span className="text-slate-400 ml-1">
            {project.sessionCount === 1 ? "session" : "sessions"}
          </span>
        </div>
        
        <div className="text-slate-400">
          Last activity: {formatLastActivity(project.lastActivity)}
        </div>
      </div>
    </div>
  );
}
