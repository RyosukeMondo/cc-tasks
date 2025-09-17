"use client";

import { FormEvent, useCallback, useState } from "react";

import { QueueTaskDraft } from "@/lib/types/task";

const INITIAL_STATE: QueueTaskDraft = {
  prompt: "",
  completionCondition: "",
  pauseOnIdle: false,
};

type UseQueueTaskFormOptions = {
  onSubmit?: (draft: QueueTaskDraft) => Promise<void> | void;
};

type UseQueueTaskFormResult = {
  values: QueueTaskDraft;
  isSubmitting: boolean;
  submitError: string | null;
  updateField: <Field extends keyof QueueTaskDraft>(
    field: Field,
    value: QueueTaskDraft[Field],
  ) => void;
  togglePauseOnIdle: () => void;
  handleSubmit: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
  reset: () => void;
};

export function useQueueTaskForm({ onSubmit }: UseQueueTaskFormOptions = {}): UseQueueTaskFormResult {
  const [values, setValues] = useState<QueueTaskDraft>(() => ({ ...INITIAL_STATE }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = useCallback(
    <Field extends keyof QueueTaskDraft>(field: Field, value: QueueTaskDraft[Field]) => {
      setSubmitError(null);
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const togglePauseOnIdle = useCallback(() => {
    setSubmitError(null);
    setValues((prev) => ({ ...prev, pauseOnIdle: !prev.pauseOnIdle }));
  }, []);

  const reset = useCallback(() => {
    setValues({ ...INITIAL_STATE });
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      if (!onSubmit) {
        return;
      }

      try {
        setIsSubmitting(true);
        setSubmitError(null);
        await onSubmit(values);
        reset();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to queue task";
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, reset, values],
  );

  return {
    values,
    isSubmitting,
    submitError,
    updateField,
    togglePauseOnIdle,
    handleSubmit,
    reset,
  };
}
