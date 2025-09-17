"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { QueueTaskDraft, Task } from "@/lib/types/task";
import { taskService } from "@/lib/services/taskService";

type UseTaskQueueResult = {
  tasks: Task[];
  selectedTask: Task | null;
  selectedTaskId: string | null;
  selectTask: (taskId: string) => void;
  queueTask: (draft: QueueTaskDraft) => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
};

export function useTaskQueue(): UseTaskQueueResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskService.listTasks();
      setTasks(data);
      setSelectedTaskId((current) => current ?? data[0]?.id ?? null);
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error("Failed to load tasks");
      setError(fallback);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }

    return tasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const queueTask = useCallback(async (draft: QueueTaskDraft) => {
    await taskService.queueTask(draft);
  }, []);

  return {
    tasks,
    selectedTask,
    selectedTaskId,
    selectTask,
    queueTask,
    refresh: loadTasks,
    isLoading,
    error,
  };
}
