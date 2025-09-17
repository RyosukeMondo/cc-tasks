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
  updateField: <Field extends keyof QueueTaskDraft>(
    field: Field,
    value: QueueTaskDraft[Field],
  ) => void;
  togglePauseOnIdle: () => void;
  handleSubmit: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
  reset: () => void;
};

export function useQueueTaskForm(options: UseQueueTaskFormOptions = {}): UseQueueTaskFormResult {
  const [values, setValues] = useState<QueueTaskDraft>(() => ({ ...INITIAL_STATE }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback(
    <Field extends keyof QueueTaskDraft>(field: Field, value: QueueTaskDraft[Field]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const togglePauseOnIdle = useCallback(() => {
    setValues((prev) => ({ ...prev, pauseOnIdle: !prev.pauseOnIdle }));
  }, []);

  const reset = useCallback(() => {
    setValues({ ...INITIAL_STATE });
  }, []);

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      if (!options.onSubmit) {
        return;
      }

      try {
        setIsSubmitting(true);
        await options.onSubmit(values);
        reset();
      } finally {
        setIsSubmitting(false);
      }
    },
    [options.onSubmit, reset, values],
  );

  return {
    values,
    isSubmitting,
    updateField,
    togglePauseOnIdle,
    handleSubmit,
    reset,
  };
}
