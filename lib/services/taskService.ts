import { QueueTaskDraft, Task, TaskSession, TaskStatus } from "@/lib/types/task";

const STORAGE_KEY = "cc-tasks.tasks";

const STATUS_VALUES: readonly TaskStatus[] = ["queued", "processing", "paused", "aborted", "completed"];

const STATUS_MIGRATIONS: Record<string, TaskStatus> = {
  pause: "paused",
};

const INITIAL_TASKS: Task[] = [
  {
    id: "TASK-202",
    prompt: "Transform legacy Claude workflows into managed pipeline",
    completionCondition: "All sessions migrated and passing smoke QA",
    status: "processing",
    createdAt: "Sep 17 @ 08:42",
    createdAtIso: "2025-09-17T08:42:00.000Z",
    sessions: [
      {
        id: "SESSION-1",
        status: "processing",
        startedAt: "08:43",
        startedAtIso: "2025-09-17T08:43:00.000Z",
        summary: "Aligning prompts with new orchestration policy",
        tokenCount: 1843,
      },
      {
        id: "SESSION-0",
        status: "queued",
        startedAt: "08:42",
        startedAtIso: "2025-09-17T08:42:00.000Z",
        summary: "Bootstrapped repo context and auth tokens",
        tokenCount: 622,
      },
    ],
  },
  {
    id: "TASK-199",
    prompt: "Draft onboarding runbooks for Claude Code managers",
    completionCondition: "Three reviewed templates ready for docs team",
    status: "queued",
    createdAt: "Sep 16 @ 21:18",
    createdAtIso: "2025-09-16T21:18:00.000Z",
    sessions: [
      {
        id: "SESSION-3",
        status: "paused",
        startedAt: "21:36",
        startedAtIso: "2025-09-16T21:36:00.000Z",
        summary: "Waiting on policy sign-off from compliance",
        tokenCount: 957,
      },
      {
        id: "SESSION-2",
        status: "completed",
        startedAt: "21:24",
        startedAtIso: "2025-09-16T21:24:00.000Z",
        summary: "Mapped contributor touchpoints and review gates",
        tokenCount: 1210,
      },
    ],
  },
  {
    id: "TASK-188",
    prompt: "Audit Claude Code history retention policies",
    completionCondition: "Confirm 30-day retention across all org workspaces",
    status: "paused",
    createdAt: "Sep 15 @ 18:55",
    createdAtIso: "2025-09-15T18:55:00.000Z",
    sessions: [
      {
        id: "SESSION-6",
        status: "aborted",
        startedAt: "19:22",
        startedAtIso: "2025-09-15T19:22:00.000Z",
        summary: "Session aborted after conflicting policy inputs",
        tokenCount: 402,
      },
      {
        id: "SESSION-5",
        status: "completed",
        startedAt: "19:04",
        startedAtIso: "2025-09-15T19:04:00.000Z",
        summary: "Compiled region-specific retention rules (EU/US)",
        tokenCount: 1384,
      },
    ],
  },
  {
    id: "TASK-171",
    prompt: "Compile Claude Code changelog digest",
    completionCondition: "Digest ready for ops standup",
    status: "completed",
    createdAt: "Sep 11 @ 10:07",
    createdAtIso: "2025-09-11T10:07:00.000Z",
    sessions: [
      {
        id: "SESSION-9",
        status: "completed",
        startedAt: "10:18",
        startedAtIso: "2025-09-11T10:18:00.000Z",
        summary: "Summarized newest prompt toolkit milestones",
        tokenCount: 998,
      },
      {
        id: "SESSION-8",
        status: "completed",
        startedAt: "10:11",
        startedAtIso: "2025-09-11T10:11:00.000Z",
        summary: "Queried Claude Code history for release notes",
        tokenCount: 1134,
      },
    ],
  },
];

let tasksCache: Task[] | null = null;

function formatDisplayTimestamp(date: Date): string {
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} @ ${timePart}`;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function migrateStatus(status: TaskStatus | string): TaskStatus {
  if (STATUS_VALUES.includes(status as TaskStatus)) {
    return status as TaskStatus;
  }
  const migrated = STATUS_MIGRATIONS[status];
  if (migrated) {
    return migrated;
  }
  return "queued";
}

function normalizeSession(session: TaskSession): TaskSession {
  const startedAtIso = session.startedAtIso ?? new Date().toISOString();
  const startedAt = session.startedAt || formatTime(new Date(startedAtIso));
  const summary = typeof session.summary === "string" ? session.summary.trim() : "";
  const tokenCount = Number.isFinite(session.tokenCount) ? session.tokenCount : 0;

  return {
    ...session,
    status: migrateStatus((session as { status: string }).status),
    startedAt,
    startedAtIso,
    summary,
    tokenCount,
  };
}

function normalizeTask(task: Task): Task {
  const createdAtIso = task.createdAtIso ?? new Date().toISOString();
  const createdAt = task.createdAt || formatDisplayTimestamp(new Date(createdAtIso));
  const prompt = typeof task.prompt === "string" ? task.prompt.trim() : "";
  const completionCondition =
    typeof task.completionCondition === "string" ? task.completionCondition.trim() : "";

  const sessions = Array.isArray(task.sessions)
    ? task.sessions
        .map((session) => normalizeSession(session))
        .sort((a, b) => {
          const aTime = a.startedAtIso ? new Date(a.startedAtIso).getTime() : 0;
          const bTime = b.startedAtIso ? new Date(b.startedAtIso).getTime() : 0;
          return bTime - aTime;
        })
    : [];

  return {
    ...task,
    prompt,
    completionCondition,
    status: migrateStatus((task as { status: string }).status),
    createdAt,
    createdAtIso,
    sessions,
  };
}

function cloneTask(task: Task): Task {
  return {
    ...task,
    sessions: task.sessions.map((session) => ({ ...session })),
  };
}

function loadTasksFromStorage(): Task[] | null {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as Task[];
  } catch (error) {
    console.warn("Failed to load tasks from storage", error);
    return null;
  }
}

function saveTasksToStorage(tasks: Task[]): void {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn("Failed to persist tasks to storage", error);
  }
}

function ensureTasksLoaded(): Task[] {
  if (tasksCache) {
    return tasksCache;
  }

  const storedTasks = loadTasksFromStorage();
  const source = storedTasks ?? INITIAL_TASKS;
  tasksCache = source.map((task) => normalizeTask(task));
  return tasksCache;
}

function persistTasks(): void {
  if (!tasksCache) {
    return;
  }

  saveTasksToStorage(tasksCache.map((task) => cloneTask(task)));
}

function validateDraft(draft: QueueTaskDraft): QueueTaskDraft {
  const prompt = typeof draft.prompt === "string" ? draft.prompt.trim() : "";
  const completionCondition =
    typeof draft.completionCondition === "string" ? draft.completionCondition.trim() : "";
  const pauseOnIdle = Boolean(draft.pauseOnIdle);

  if (!prompt) {
    throw new Error("Prompt is required to queue a task.");
  }

  if (!completionCondition) {
    throw new Error("Completion condition cannot be empty.");
  }

  return {
    prompt,
    completionCondition,
    pauseOnIdle,
  };
}

function generateTaskId(baseDate: Date): string {
  const datePart = `${baseDate.getFullYear()}${(baseDate.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${baseDate.getDate().toString().padStart(2, "0")}`;
  const randomSegment =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID().slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase();

  return `TASK-${datePart}-${randomSegment}`;
}

export type TaskService = {
  listTasks: () => Promise<Task[]>;
  getTask: (taskId: string) => Promise<Task | undefined>;
  queueTask: (input: QueueTaskDraft) => Promise<Task>;
};

export const taskService: TaskService = {
  async listTasks(): Promise<Task[]> {
    const tasks = ensureTasksLoaded();

    return tasks
      .slice()
      .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime())
      .map((task) => cloneTask(task));
  },

  async getTask(taskId: string): Promise<Task | undefined> {
    const tasks = ensureTasksLoaded();
    const task = tasks.find((item) => item.id === taskId);
    return task ? cloneTask(task) : undefined;
  },

  async queueTask(input: QueueTaskDraft): Promise<Task> {
    const draft = validateDraft(input);
    const now = new Date();

    const newTask = normalizeTask({
      id: generateTaskId(now),
      prompt: draft.prompt,
      completionCondition: draft.completionCondition,
      status: draft.pauseOnIdle ? "paused" : "queued",
      createdAt: formatDisplayTimestamp(now),
      createdAtIso: now.toISOString(),
      sessions: [],
    });

    const tasks = ensureTasksLoaded();
    tasks.unshift(newTask);
    persistTasks();

    return cloneTask(newTask);
  },
};

export const mockTaskService = taskService;
export const mockTasks = INITIAL_TASKS.map((task) => cloneTask(normalizeTask(task)));
