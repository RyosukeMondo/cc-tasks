import { QueueTaskDraft, Task } from "@/lib/types/task";

const STATIC_TASKS: Task[] = [
  {
    id: "TASK-202",
    prompt: "Transform legacy Claude workflows into managed pipeline",
    completionCondition: "All sessions migrated and passing smoke QA",
    status: "processing",
    createdAt: "Sep 17 @ 08:42",
    sessions: [
      {
        id: "SESSION-1",
        status: "processing",
        startedAt: "08:43",
        summary: "Aligning prompts with new orchestration policy",
        tokenCount: 1843,
      },
      {
        id: "SESSION-0",
        status: "queued",
        startedAt: "08:42",
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
    sessions: [
      {
        id: "SESSION-3",
        status: "pause",
        startedAt: "21:36",
        summary: "Waiting on policy sign-off from compliance",
        tokenCount: 957,
      },
      {
        id: "SESSION-2",
        status: "completed",
        startedAt: "21:24",
        summary: "Mapped contributor touchpoints and review gates",
        tokenCount: 1210,
      },
    ],
  },
  {
    id: "TASK-188",
    prompt: "Audit Claude Code history retention policies",
    completionCondition: "Confirm 30-day retention across all org workspaces",
    status: "pause",
    createdAt: "Sep 15 @ 18:55",
    sessions: [
      {
        id: "SESSION-6",
        status: "aborted",
        startedAt: "19:22",
        summary: "Session aborted after conflicting policy inputs",
        tokenCount: 402,
      },
      {
        id: "SESSION-5",
        status: "completed",
        startedAt: "19:04",
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
    sessions: [
      {
        id: "SESSION-9",
        status: "completed",
        startedAt: "10:18",
        summary: "Summarized newest prompt toolkit milestones",
        tokenCount: 998,
      },
      {
        id: "SESSION-8",
        status: "completed",
        startedAt: "10:11",
        summary: "Queried Claude Code history for release notes",
        tokenCount: 1134,
      },
    ],
  },
];

export type TaskService = {
  listTasks: () => Promise<Task[]>;
  getTask: (taskId: string) => Promise<Task | undefined>;
  queueTask: (input: QueueTaskDraft) => Promise<void>;
};

export const taskService: TaskService = {
  async listTasks(): Promise<Task[]> {
    return STATIC_TASKS;
  },
  async getTask(taskId: string): Promise<Task | undefined> {
    return STATIC_TASKS.find((task) => task.id === taskId);
  },
  async queueTask(_input: QueueTaskDraft): Promise<void> {
    return;
  },
};

export const mockTaskService = taskService;
export const mockTasks = STATIC_TASKS;
