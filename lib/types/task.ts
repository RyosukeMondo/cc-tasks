export type TaskStatus = "queued" | "processing" | "pause" | "aborted" | "completed";

export type TaskSession = {
  id: string;
  status: TaskStatus;
  startedAt: string;
  summary: string;
  tokenCount: number;
};

export type Task = {
  id: string;
  prompt: string;
  completionCondition: string;
  status: TaskStatus;
  createdAt: string;
  sessions: TaskSession[];
};

export type QueueTaskDraft = {
  prompt: string;
  completionCondition: string;
  pauseOnIdle: boolean;
};
