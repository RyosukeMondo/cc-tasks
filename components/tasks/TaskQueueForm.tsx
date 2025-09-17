"use client";

import { ChangeEvent } from "react";

import { QueueTaskDraft } from "@/lib/types/task";
import { cardSurface } from "@/lib/ui/layout";
import { useQueueTaskForm } from "@/hooks/useQueueTaskForm";

type TaskQueueFormProps = {
  onSubmit?: (draft: QueueTaskDraft) => Promise<void> | void;
};

export function TaskQueueForm({ onSubmit }: TaskQueueFormProps) {
  const { values, isSubmitting, submitError, updateField, togglePauseOnIdle, handleSubmit } =
    useQueueTaskForm({ onSubmit });

  const handlePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateField("prompt", event.target.value);
  };

  const handleConditionChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateField("completionCondition", event.target.value);
  };

  const isSubmitDisabled =
    isSubmitting || !values.prompt.trim() || !values.completionCondition.trim();

  return (
    <form className={`${cardSurface} space-y-5 p-6`} onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300" htmlFor="queue-prompt">
          Prompt
        </label>
        <textarea
          id="queue-prompt"
          value={values.prompt}
          onChange={handlePromptChange}
          placeholder="Describe the Claude Code automation you want to run"
          className="min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300" htmlFor="queue-condition">
          Task completion condition
        </label>
        <input
          id="queue-condition"
          value={values.completionCondition}
          onChange={handleConditionChange}
          placeholder="e.g. Generate policy summary and validate reviewers"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-200">Pause on idle</p>
          <p className="text-xs text-slate-400">
            Start the run in a paused state when Claude finishes its current action.
          </p>
        </div>
        <button
          type="button"
          onClick={togglePauseOnIdle}
          aria-pressed={values.pauseOnIdle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            values.pauseOnIdle ? "bg-emerald-400" : "bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              values.pauseOnIdle ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full rounded-xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Queuing..." : "Queue task"}
      </button>
      {submitError && (
        <p className="text-xs text-rose-300" role="alert">
          {submitError}
        </p>
      )}
    </form>
  );
}
