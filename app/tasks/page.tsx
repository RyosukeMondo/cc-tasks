"use client";

import { useCallback } from "react";

import { TaskSessionsPanel } from "@/components/tasks/TaskSessionsPanel";
import { TaskPipeline } from "@/components/tasks/TaskPipeline";
import { TaskQueueForm } from "@/components/tasks/TaskQueueForm";
import { QueueIntroCard } from "@/components/tasks/QueueIntroCard";
import { DesignNotesCard } from "@/components/tasks/DesignNotesCard";
import { useTaskQueue } from "@/hooks/useTaskQueue";

export default function TasksHome() {
  const { tasks, selectedTask, selectedTaskId, selectTask, queueTask, isLoading, error } = useTaskQueue();

  const handleOpenHistory = useCallback((taskId: string) => {
    console.info(`[mock] navigate to history for ${taskId}`);
  }, []);

  const handleOpenSession = useCallback((sessionId: string) => {
    console.info(`[mock] open session ${sessionId}`);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-6 pb-24 pt-16">
        <aside className="flex w-[360px] shrink-0 flex-col gap-6">
          <QueueIntroCard />
          <TaskQueueForm onSubmit={queueTask} />
          <TaskPipeline
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelect={selectTask}
            isLoading={isLoading}
            errorMessage={error?.message ?? null}
          />
        </aside>
        <main className="flex flex-1 flex-col gap-6">
          <TaskSessionsPanel task={selectedTask} onOpenHistory={handleOpenHistory} onOpenSession={handleOpenSession} />
          <DesignNotesCard />
        </main>
      </div>
    </div>
  );
}
