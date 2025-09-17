export type TaskStatus = "queued" | "processing" | "paused" | "aborted" | "completed";

export type TaskSession = {
  id: string;
  status: TaskStatus;
  startedAt: string;
  startedAtIso?: string;
  summary: string;
  tokenCount: number;
};

export type Task = {
  id: string;
  prompt: string;
  completionCondition: string;
  status: TaskStatus;
  createdAt: string;
  createdAtIso: string;
  sessions: TaskSession[];
};

export type QueueTaskDraft = {
  prompt: string;
  completionCondition: string;
  pauseOnIdle: boolean;
};
