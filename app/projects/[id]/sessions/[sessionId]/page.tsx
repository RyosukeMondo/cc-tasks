"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ConversationViewer } from "@/components/conversations/ConversationViewer";
import { ProjectNavigation } from "@/components/projects/ProjectNavigation";
import { conversationService } from "@/lib/services/conversationService";
import { projectService } from "@/lib/services/projectService";
import { ConversationEntry, SessionStats } from "@/lib/types/conversation";
import { Project } from "@/lib/types/project";

export default function SessionContentPage() {
  const params = useParams();
  const router = useRouter();
  
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSessionContent = async () => {
      if (!projectId || !sessionId) {
        setError("Invalid project ID or session ID");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Load project metadata and session conversation in parallel
        const [projectList, conversationEntries] = await Promise.all([
          projectService.listProjects(),
          conversationService.parseConversationFile(projectId, sessionId),
        ]);

        const foundProject = projectList.find((item) => item.id === projectId);
        if (!foundProject) {
          setError(`Project "${projectId}" not found`);
          setIsLoading(false);
          return;
        }

        setProject(foundProject);
        setEntries(conversationEntries);
        
        // Calculate session statistics
        const stats = conversationService.getSessionStats(conversationEntries);
        setSessionStats(stats);
      } catch (err) {
        console.error("Failed to load session content:", err);
        setError(err instanceof Error ? err.message : "Failed to load session content");
      } finally {
        setIsLoading(false);
      }
    };

    void loadSessionContent();
  }, [projectId, sessionId]);

  const handleBackToProject = useCallback(() => {
    if (projectId) {
      router.push(`/projects/${projectId}`);
    } else {
      router.push('/projects');
    }
  }, [projectId, router]);

  const handleEntryClick = useCallback((entry: ConversationEntry, index: number) => {
    console.log(`Clicked entry ${index}:`, entry);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
          <ProjectNavigation
            currentProjectName="Loading..."
            showBackButton={true}
          />
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
            Loading session content...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
          <ProjectNavigation
            currentProjectName={project?.name || "Error"}
            currentProjectId={projectId}
            showBackButton={true}
          />

          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
            <h1 className="mb-2 text-xl font-bold text-rose-200">Failed to Load Session</h1>
            <p className="text-sm text-rose-300 mb-4">{error}</p>
            <button
              onClick={handleBackToProject}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700"
            >
              Back to Project
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
        <div className="flex items-center justify-between">
          <ProjectNavigation
            currentProjectName={project.name}
            currentProjectId={project.id}
            showBackButton={true}
          />
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToProject}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
              aria-label={`Back to ${project.name} sessions`}
            >
              Back to Sessions
            </button>
          </div>
        </div>

        <main className="flex-1">
          <ConversationViewer
            entries={entries}
            sessionStats={sessionStats}
            isLoading={false}
            errorMessage={null}
            projectName={project.name}
            sessionId={sessionId}
            onEntryClick={handleEntryClick}
            showFullContent={true}
          />
        </main>
      </div>
    </div>
  );
}