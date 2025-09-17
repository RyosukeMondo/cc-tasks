"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SessionStats } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

interface ConversationNavigationProps {
  projectId: string;
  projectName?: string;
  sessionId: string;
  sessionStats?: SessionStats;
  totalEntries: number;
  currentPosition?: number;
  onJumpToPosition?: (position: number) => void;
  onScrollToTop?: () => void;
  onScrollToBottom?: () => void;
  className?: string;
}

interface ScrollPosition {
  current: number;
  total: number;
  percentage: number;
}

const ArrowLeftIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="h-4 w-4"
    stroke="currentColor"
    fill="none"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6 4 12l6 6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="h-4 w-4"
    stroke="currentColor"
    fill="none"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 15 6-6 6 6" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="h-4 w-4"
    stroke="currentColor"
    fill="none"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
  </svg>
);

export function ConversationNavigation({
  projectId,
  projectName,
  sessionId,
  sessionStats,
  totalEntries,
  currentPosition = 0,
  onJumpToPosition,
  onScrollToTop,
  onScrollToBottom,
  className = "",
}: ConversationNavigationProps) {
  const router = useRouter();
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    current: 0,
    total: totalEntries,
    percentage: 0,
  });
  const [jumpToValue, setJumpToValue] = useState("");

  useEffect(() => {
    const percentage = totalEntries > 0 ? (currentPosition / Math.max(totalEntries - 1, 1)) * 100 : 0;
    setScrollPosition({
      current: Math.min(currentPosition, Math.max(totalEntries - 1, 0)),
      total: totalEntries,
      percentage,
    });
  }, [currentPosition, totalEntries]);

  const handleBackToSessions = useCallback(() => {
    router.push(`/projects/${projectId}`);
  }, [router, projectId]);

  const handleJumpSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!onJumpToPosition) {
        return;
      }

      const position = Number.parseInt(jumpToValue, 10);
      if (Number.isNaN(position)) {
        return;
      }

      const zeroBasedIndex = Math.min(Math.max(position - 1, 0), Math.max(totalEntries - 1, 0));
      onJumpToPosition(zeroBasedIndex);
      setJumpToValue("");
    },
    [jumpToValue, onJumpToPosition, totalEntries]
  );

  const handleQuickJump = useCallback(
    (percentage: number) => {
      if (!onJumpToPosition || totalEntries === 0) {
        return;
      }

      const position = Math.floor((percentage / 100) * totalEntries);
      const clamped = Math.min(Math.max(position, 0), Math.max(totalEntries - 1, 0));
      onJumpToPosition(clamped);
    },
    [onJumpToPosition, totalEntries]
  );

  const displaySessionId = sessionId.length > 12 ? `${sessionId.slice(0, 6)}Åc${sessionId.slice(-4)}` : sessionId;

  return (
    <div className={`${cardSurface} p-4 ${className}`.trim()}>
      {/* Breadcrumb Navigation */}
      <nav className="mb-4 flex items-center gap-2 text-sm" role="navigation" aria-label="Breadcrumb">
        <Link
          href="/projects"
          className="rounded text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label="Go to projects list"
        >
          Projects
        </Link>

        <span className="text-slate-500" aria-hidden="true">
          /
        </span>

        <Link
          href={`/projects/${projectId}`}
          className="rounded text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label={`Go to ${projectName ?? projectId} sessions`}
        >
          {projectName ?? projectId}
        </Link>

        <span className="text-slate-500" aria-hidden="true">
          /
        </span>

        <span className="font-medium text-white" aria-current="page">
          {displaySessionId}
        </span>
      </nav>

      {/* Back Button */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          onClick={handleBackToSessions}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label={`Back to ${projectName ?? projectId} sessions`}
          type="button"
        >
          <ArrowLeftIcon />
          Back to Sessions
        </button>

        {sessionStats && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>{sessionStats.totalEntries} entries</span>
            {typeof sessionStats.duration === "number" && (
              <span>{(sessionStats.duration / 1000).toFixed(1)}s runtime</span>
            )}
            {typeof sessionStats.totalTokens === "number" && <span>{sessionStats.totalTokens} tokens</span>}
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {totalEntries > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Progress through conversation</span>
            <span>
              {scrollPosition.current + 1} of {scrollPosition.total} ({Math.round(scrollPosition.percentage)}%)
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${scrollPosition.percentage}%` }}
              role="progressbar"
              aria-valuenow={scrollPosition.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Conversation progress: ${Math.round(scrollPosition.percentage)} percent`}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-slate-500">
            {[0, 25, 50, 75, 100].map((percentage) => (
              <button
                key={percentage}
                onClick={() => handleQuickJump(percentage)}
                className="rounded px-1 text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                aria-label={`Jump to ${percentage} percent of conversation`}
                type="button"
              >
                {percentage}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onScrollToTop}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Scroll to top of conversation"
            disabled={!onScrollToTop}
            type="button"
          >
            <ArrowUpIcon />
            Top
          </button>

          <button
            onClick={onScrollToBottom}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Scroll to bottom of conversation"
            disabled={!onScrollToBottom}
            type="button"
          >
            <ArrowDownIcon />
            Bottom
          </button>
        </div>

        {totalEntries > 0 && onJumpToPosition && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-2" role="search">
            <label htmlFor="jump-to-entry" className="text-xs text-slate-400">
              Jump to
            </label>
            <input
              id="jump-to-entry"
              name="jump-to-entry"
              type="number"
              min={1}
              max={totalEntries}
              value={jumpToValue}
              onChange={(event) => setJumpToValue(event.target.value)}
              placeholder="Entry #"
              className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!jumpToValue}
            >
              Go
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-500">
        <details>
          <summary className="cursor-pointer text-slate-400 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">
            Keyboard shortcuts
          </summary>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between">
              <span>Home</span>
              <span>Jump to top</span>
            </div>
            <div className="flex justify-between">
              <span>End</span>
              <span>Jump to bottom</span>
            </div>
            <div className="flex justify-between">
              <span>Page Up / Page Down</span>
              <span>Navigate faster</span>
            </div>
            <div className="flex justify-between">
              <span>Arrow keys</span>
              <span>Move entry by entry</span>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
