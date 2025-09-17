"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ConversationNavigation } from "@/components/conversations/ConversationNavigation";
import { ConversationViewer, type ConversationViewerHandle } from "@/components/conversations/ConversationViewer";
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

  const viewerRef = useRef<ConversationViewerHandle | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | undefined>();
  const [activeEntryIndex, setActiveEntryIndex] = useState(0);
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

        const stats = conversationService.getSessionStats(conversationEntries);
        setSessionStats(stats);
        setActiveEntryIndex(0);
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
      router.push("/projects");
    }
  }, [projectId, router]);

  const handleVisibleIndexChange = useCallback((index: number) => {
    setActiveEntryIndex(index);
  }, []);

  const handleJumpToPosition = useCallback((index: number) => {
    viewerRef.current?.scrollToIndex(index);
  }, []);

  const handleScrollToTop = useCallback(() => {
    viewerRef.current?.scrollToTop();
  }, []);

  const handleScrollToBottom = useCallback(() => {
    viewerRef.current?.scrollToBottom();
  }, []);

  const handleEntryClick = useCallback((_: ConversationEntry, index: number) => {
    setActiveEntryIndex(index);
    viewerRef.current?.scrollToIndex(index);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
          <ProjectNavigation currentProjectName="Loading..." showBackButton={true} />
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
            <p className="mb-4 text-sm text-rose-300">{error}</p>
            <button
              onClick={handleBackToProject}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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

  const totalEntries = entries.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-24 pt-16">
        <ProjectNavigation
          currentProjectName={project.name}
          currentProjectId={project.id}
          showBackButton={true}
        />

        <main className="flex-1">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
            <section className="order-1 lg:order-none">
              <ConversationViewer
                ref={viewerRef}
                entries={entries}
                sessionStats={sessionStats}
                projectName={project.name}
                sessionId={sessionId}
                onEntryClick={handleEntryClick}

                onVisibleIndexChange={handleVisibleIndexChange}
              />
            </section>

            <aside className="order-0 lg:order-none lg:sticky lg:top-20">
              <ConversationNavigation
                projectId={project.id}
                projectName={project.name}
                sessionId={sessionId ?? ""}
                sessionStats={sessionStats}
                totalEntries={totalEntries}
                currentPosition={activeEntryIndex}
                onJumpToPosition={totalEntries ? handleJumpToPosition : undefined}
                onScrollToTop={totalEntries ? handleScrollToTop : undefined}
                onScrollToBottom={totalEntries ? handleScrollToBottom : undefined}
              />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
