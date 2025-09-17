"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProjectNavigationProps {
  currentProjectName?: string;
  currentProjectId?: string;
  showBackButton?: boolean;
  className?: string;
}

export function ProjectNavigation({
  currentProjectName,
  currentProjectId,
  showBackButton = false,
  className = ""
}: ProjectNavigationProps) {
  const router = useRouter();

  const handleBackToProjects = () => {
    router.push('/projects');
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-2 text-sm" role="navigation" aria-label="Breadcrumb">
        <Link 
          href="/projects" 
          className="text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 rounded"
          aria-label="Go to projects list"
        >
          Projects
        </Link>
        
        {currentProjectName && (
          <>
            <span className="text-slate-500" aria-hidden="true">/</span>
            <span className="text-white font-medium" aria-current="page" title={currentProjectId ?? undefined}>
              {currentProjectName}
            </span>
          </>
        )}
      </nav>

      {/* Optional back button for mobile/tablet convenience */}
      {showBackButton && currentProjectName && (
        <button
          onClick={handleBackToProjects}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          aria-label={`Back to projects from ${currentProjectName}`}
        >
          Back to Projects
        </button>
      )}
    </div>
  );
}
