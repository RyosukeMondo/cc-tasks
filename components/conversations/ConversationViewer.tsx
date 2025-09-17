"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { ConversationEntry, SessionStats } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

import { EntryCard } from "./EntryCard";

const AlertIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="h-5 w-5 text-rose-300"
    stroke="currentColor"
    fill="none"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z"
    />
  </svg>
);

const LoadingState = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={`loading-${index}`} className={`${cardSurface} animate-pulse p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="h-5 w-24 rounded bg-slate-800" />
          <div className="h-4 w-16 rounded bg-slate-800" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-slate-800" />
          <div className="h-4 w-3/4 rounded bg-slate-800" />
          <div className="h-4 w-1/2 rounded bg-slate-800" />
        </div>
      </div>
    ))}
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className={`${cardSurface} p-6`}>
    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
      <div className="mb-3 flex items-center gap-2 font-medium">
        <AlertIcon />
        <span>Failed to load conversation</span>
      </div>
      <p className="text-rose-100/80">{message}</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className={`${cardSurface} p-6`}>
    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
      <div className="space-y-2">
        <p className="font-medium text-slate-200">No conversation entries found</p>
        <p>This session does not contain any conversation data yet.</p>
      </div>
    </div>
  </div>
);

const formatTimestamp = (value?: string) => {
  if (!value) {
    return "--";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const SessionHeader = ({
  sessionStats,
  projectName,
  sessionId,
  activeIndex,
}: {
  sessionStats?: SessionStats;
  projectName?: string;
  sessionId?: string;
  activeIndex: number;
}) => {
  const totalEntries = sessionStats?.totalEntries ?? 0;
  const viewingSummary = totalEntries > 0 ? `${Math.min(activeIndex + 1, totalEntries)} of ${totalEntries}` : "None";

  return (
    <div className={`${cardSurface} p-6`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Conversation Session</h1>
          <div className="mt-1 space-y-1 text-sm text-slate-400">
            {projectName && <p>Project: {projectName}</p>}
            {sessionId && <p className="font-mono text-xs text-slate-500">Session ID: {sessionId}</p>}
          </div>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs uppercase tracking-wide text-blue-200">
          Viewing {viewingSummary}
        </div>
      </div>

      {sessionStats && totalEntries > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-800/40 p-3 text-center">
            <div className="text-lg font-semibold text-white">{sessionStats.totalEntries}</div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Total entries</div>
          </div>
          <div className="rounded-lg bg-slate-800/40 p-3 text-center">
            <div className="text-lg font-semibold text-blue-300">{sessionStats.userMessages}</div>
            <div className="text-xs uppercase tracking-wider text-slate-400">User messages</div>
          </div>
          <div className="rounded-lg bg-slate-800/40 p-3 text-center">
            <div className="text-lg font-semibold text-purple-300">{sessionStats.assistantMessages}</div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Assistant replies</div>
          </div>
          <div className="rounded-lg bg-slate-800/40 p-3 text-center">
            <div className="text-lg font-semibold text-amber-300">{sessionStats.toolInvocations}</div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Tool invocations</div>
          </div>
        </div>
      )}

      {sessionStats && (
        <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-slate-500">First entry:</span> {formatTimestamp(sessionStats.firstTimestamp)}
          </div>
          <div>
            <span className="text-slate-500">Last entry:</span> {formatTimestamp(sessionStats.lastTimestamp)}
          </div>
          {typeof sessionStats.totalTokens === "number" && (
            <div>
              <span className="text-slate-500">Total tokens:</span> {sessionStats.totalTokens}
            </div>
          )}
          {typeof sessionStats.duration === "number" && (
            <div>
              <span className="text-slate-500">Duration:</span> {(sessionStats.duration / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type ConversationViewerProps = {
  entries: ConversationEntry[];
  sessionStats?: SessionStats;
  isLoading?: boolean;
  errorMessage?: string | null;
  projectName?: string;
  sessionId?: string;
  onEntryClick?: (entry: ConversationEntry, index: number) => void;

  onVisibleIndexChange?: (index: number) => void;
};

export type ConversationViewerHandle = {
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
};

function getProgressText(activeIndex: number, total: number) {
  if (total === 0) {
    return "No entries";
  }

  return `Entry ${Math.min(activeIndex + 1, total)} of ${total}`;
}

export const ConversationViewer = forwardRef<ConversationViewerHandle, ConversationViewerProps>(
  function ConversationViewer(
    {
      entries,
      sessionStats,
      isLoading = false,
      errorMessage = null,
      projectName,
      sessionId,
      onEntryClick,

      onVisibleIndexChange,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const entryRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const activeIndexRef = useRef(0);

    const totalEntries = entries.length;

    useEffect(() => {
      entryRefs.current = new Array(totalEntries).fill(null);
      if (totalEntries === 0) {
        activeIndexRef.current = 0;
        setActiveIndex(0);
      } else if (activeIndexRef.current >= totalEntries) {
        activeIndexRef.current = totalEntries - 1;
        setActiveIndex(totalEntries - 1);
      }
    }, [totalEntries]);

    useEffect(() => {
      if (typeof onVisibleIndexChange === "function") {
        onVisibleIndexChange(totalEntries === 0 ? 0 : activeIndex);
      }
    }, [activeIndex, onVisibleIndexChange, totalEntries]);
    const updateActiveIndex = useCallback(
      (nextIndex: number) => {
        if (nextIndex < 0 || nextIndex >= totalEntries) {
          return;
        }

        if (activeIndexRef.current === nextIndex) {
          return;
        }

        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);

      },
      [totalEntries],
    );

    const intersectionCallback = useCallback<IntersectionObserverCallback>(
      (observerEntries) => {
        let bestIndex: number | null = null;
        let bestRatio = 0;

        for (const observerEntry of observerEntries) {
          if (observerEntry.intersectionRatio <= 0) {
            continue;
          }

          const indexAttr = observerEntry.target.getAttribute("data-entry-index");
          if (!indexAttr) {
            continue;
          }

          const index = Number.parseInt(indexAttr, 10);
          if (Number.isNaN(index)) {
            continue;
          }

          if (observerEntry.intersectionRatio > bestRatio) {
            bestRatio = observerEntry.intersectionRatio;
            bestIndex = index;
          }
        }

        if (bestIndex !== null && bestRatio > 0) {
          updateActiveIndex(bestIndex);
        }
      },
      [updateActiveIndex],
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container || totalEntries === 0) {
        return;
      }

      const observer = new IntersectionObserver(intersectionCallback, {
        root: container,
        threshold: [0.2, 0.4, 0.6, 0.8],
      });

      entryRefs.current.forEach((node) => {
        if (node) {
          observer.observe(node);
        }
      });

      return () => observer.disconnect();
    }, [intersectionCallback, totalEntries]);

    const setEntryRef = useCallback(
      (index: number) => (node: HTMLDivElement | null) => {
        entryRefs.current[index] = node;
      },
      [],
    );

    const scrollToTop = useCallback(() => {
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const scrollToBottom = useCallback(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }, []);

    const scrollToIndex = useCallback(
      (index: number) => {
        const container = containerRef.current;
        const target = entryRefs.current[index];
        if (!container || !target) {
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + container.scrollTop - 16;

        container.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex,
        scrollToTop,
        scrollToBottom,
      }),
      [scrollToBottom, scrollToIndex, scrollToTop],
    );

    const progressText = useMemo(
      () => getProgressText(activeIndex, totalEntries),
      [activeIndex, totalEntries],
    );

    if (isLoading) {
      return (
        <div className="space-y-6">
          <SessionHeader
            sessionStats={sessionStats}
            projectName={projectName}
            sessionId={sessionId}
            activeIndex={0}
          />
          <LoadingState />
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="space-y-6">
          <SessionHeader
            sessionStats={sessionStats}
            projectName={projectName}
            sessionId={sessionId}
            activeIndex={0}
          />
          <ErrorState message={errorMessage} />
        </div>
      );
    }

    if (!entries.length) {
      return (
        <div className="space-y-6">
          <SessionHeader
            sessionStats={sessionStats}
            projectName={projectName}
            sessionId={sessionId}
            activeIndex={0}
          />
          <EmptyState />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <SessionHeader
          sessionStats={sessionStats}
          projectName={projectName}
          sessionId={sessionId}
          activeIndex={activeIndex}
        />

        <div className={`${cardSurface} p-4`} aria-live="polite">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span>{progressText}</span>
            <button
              type="button"
              onClick={scrollToTop}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Back to top
            </button>
          </div>

          <div
            ref={containerRef}
            className="max-h-[70vh] space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700"
            aria-label="Conversation entries"
            role="log"
          >
            {entries.map((entry, index) => (
              <EntryCard
                key={entry.id ?? `entry-${index}`}
                ref={setEntryRef(index)}
                entry={entry}
                data-entry-index={index}
                onClick={onEntryClick ? () => onEntryClick(entry, index) : undefined}
                className={`transition-all duration-150 ${
                  index === activeIndex ? "ring-1 ring-blue-500/40" : "ring-1 ring-transparent"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
);
