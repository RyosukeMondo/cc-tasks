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
  className = ""
}: ConversationNavigationProps) {
  const router = useRouter();
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    current: 0,
    total: totalEntries,
    percentage: 0
  });
  const [jumpToValue, setJumpToValue] = useState("");

  // Update scroll position when currentPosition changes
  useEffect(() => {
    const percentage = totalEntries > 0 ? (currentPosition / totalEntries) * 100 : 0;
    setScrollPosition({
      current: currentPosition,
      total: totalEntries,
      percentage
    });
  }, [currentPosition, totalEntries]);

  const handleBackToSessions = useCallback(() => {
    router.push(`/projects/${projectId}`);
  }, [router, projectId]);

  const handleJumpSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const position = parseInt(jumpToValue);
    if (!isNaN(position) && position >= 1 && position <= totalEntries && onJumpToPosition) {
      onJumpToPosition(position - 1); // Convert to 0-based index
      setJumpToValue("");
    }
  }, [jumpToValue, totalEntries, onJumpToPosition]);

  const handleQuickJump = useCallback((percentage: number) => {
    if (onJumpToPosition) {
      const position = Math.floor((percentage / 100) * totalEntries);
      onJumpToPosition(Math.max(0, Math.min(position, totalEntries - 1)));
    }
  }, [onJumpToPosition, totalEntries]);

  return (
    <div className={`${cardSurface} p-4 ${className}`}>
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm mb-4" role="navigation" aria-label="Breadcrumb">
        <Link 
          href="/projects" 
          className="text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 rounded"
          aria-label="Go to projects list"
        >
          Projects
        </Link>
        
        <span className="text-slate-500" aria-hidden="true">/</span>
        
        <Link
          href={`/projects/${projectId}`}
          className="text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 rounded"
          aria-label={`Go to ${projectName || projectId} sessions`}
        >
          {projectName || projectId}
        </Link>
        
        <span className="text-slate-500" aria-hidden="true">/</span>
        
        <span className="text-white font-medium" aria-current="page">
          Session {sessionId.slice(-8)}...
        </span>
      </nav>

      {/* Back Button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleBackToSessions}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 flex items-center gap-2"
          aria-label={`Back to ${projectName || projectId} sessions`}
        >
          <span aria-hidden="true">←</span>
          Back to Sessions
        </button>

        {/* Session Stats Quick View */}
        {sessionStats && (
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{sessionStats.totalEntries} entries</span>
            {sessionStats.duration && (
              <span>{(sessionStats.duration / 1000).toFixed(1)}s</span>
            )}
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {totalEntries > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Progress through conversation</span>
            <span>
              {scrollPosition.current + 1} of {scrollPosition.total} ({scrollPosition.percentage.toFixed(0)}%)
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${scrollPosition.percentage}%` }}
              role="progressbar"
              aria-valuenow={scrollPosition.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Conversation progress: ${scrollPosition.percentage.toFixed(0)}%`}
            />
          </div>
          
          {/* Quick Jump Points */}
          <div className="flex justify-between mt-2">
            {[0, 25, 50, 75, 100].map((percentage) => (
              <button
                key={percentage}
                onClick={() => handleQuickJump(percentage)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                aria-label={`Jump to ${percentage}% of conversation`}
              >
                {percentage}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Quick Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={onScrollToTop}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            aria-label="Scroll to top of conversation"
            disabled={!onScrollToTop}
          >
            ↑ Top
          </button>
          
          <button
            onClick={onScrollToBottom}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            aria-label="Scroll to bottom of conversation"
            disabled={!onScrollToBottom}
          >
            ↓ Bottom
          </button>
        </div>

        {/* Jump to Entry */}
        {totalEntries > 0 && onJumpToPosition && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-2">
            <label htmlFor="jump-to-entry" className="text-xs text-slate-400 whitespace-nowrap">
              Jump to:
            </label>
            <input
              id="jump-to-entry"
              type="number"
              min="1"
              max={totalEntries}
              value={jumpToValue}
              onChange={(e) => setJumpToValue(e.target.value)}
              placeholder="Entry #"
              className="w-20 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label={`Jump to entry (1-${totalEntries})`}
            />
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
              disabled={!jumpToValue || isNaN(parseInt(jumpToValue))}
              aria-label="Jump to specified entry"
            >
              Go
            </button>
          </form>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer hover:text-slate-400 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded">
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
              <span>Page Up/Down</span>
              <span>Navigate by page</span>
            </div>
            <div className="flex justify-between">
              <span>Arrow keys</span>
              <span>Navigate entries</span>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}