"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ConversationEntry, SessionStats } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";
import { EntryCard } from "./EntryCard";

type ConversationViewerProps = {
  entries: ConversationEntry[];
  sessionStats?: SessionStats;
  isLoading?: boolean;
  errorMessage?: string | null;
  projectName?: string;
  sessionId?: string;
  onEntryClick?: (entry: ConversationEntry, index: number) => void;
  showFullContent?: boolean;
};

function LoadingState() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`${cardSurface} p-4 animate-pulse`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="h-6 w-20 bg-slate-700 rounded-full"></div>
            <div className="h-4 w-16 bg-slate-700 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-slate-700 rounded"></div>
            <div className="h-4 w-3/4 bg-slate-700 rounded"></div>
            <div className="h-4 w-1/2 bg-slate-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className={`${cardSurface} p-6`}>
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚠️</span>
          <span className="font-medium">Failed to load conversation</span>
        </div>
        <p>{message}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={`${cardSurface} p-6`}>
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
        <div className="space-y-2">
          <p className="font-medium">No conversation entries found</p>
          <p>This session doesn't contain any conversation data yet.</p>
        </div>
      </div>
    </div>
  );
}

function SessionHeader({ sessionStats, projectName, sessionId }: {
  sessionStats?: SessionStats;
  projectName?: string;
  sessionId?: string;
}) {
  return (
    <div className={`${cardSurface} p-6 mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Conversation Session
          </h1>
          {projectName && (
            <p className="text-sm text-slate-400 mt-1">
              Project: {projectName}
            </p>
          )}
          {sessionId && (
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Session ID: {sessionId}
            </p>
          )}
        </div>
      </div>

      {sessionStats && sessionStats.totalEntries > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">
              {sessionStats.totalEntries}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              Total Entries
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-300">
              {sessionStats.userMessages}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              User Messages
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-300">
              {sessionStats.assistantMessages}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              Assistant Messages
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-amber-300">
              {sessionStats.toolInvocations}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              Tool Invocations
            </div>
          </div>
        </div>
      )}

      {sessionStats && (sessionStats.totalTokens || sessionStats.duration) && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-6 text-xs text-slate-400">
            {sessionStats.totalTokens && (
              <span>{sessionStats.totalTokens.toLocaleString()} tokens</span>
            )}
            {sessionStats.duration && (
              <span>{(sessionStats.duration / 1000).toFixed(2)}s duration</span>
            )}
            {sessionStats.firstTimestamp && (
              <span>
                Started: {new Date(sessionStats.firstTimestamp).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VirtualizedEntries({ 
  entries, 
  onEntryClick, 
  showFullContent 
}: {
  entries: ConversationEntry[];
  onEntryClick?: (entry: ConversationEntry, index: number) => void;
  showFullContent?: boolean;
}) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(50, entries.length) });
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;
    
    // Calculate visible range based on scroll position
    const itemHeight = 200; // Approximate height per entry
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
    const endIndex = Math.min(
      entries.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + 10
    );
    
    // Load more entries when approaching the end
    if (scrollTop + containerHeight >= scrollHeight * 0.9) {
      setVisibleRange(prev => ({
        start: prev.start,
        end: Math.min(entries.length, prev.end + 25)
      }));
    }
    
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [entries.length]);

  const visibleEntries = useMemo(() => {
    return entries.slice(visibleRange.start, visibleRange.end);
  }, [entries, visibleRange]);

  return (
    <div 
      className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600"
      onScroll={handleScroll}
      role="log"
      aria-label="Conversation entries"
    >
      {/* Spacer for virtual scrolling */}
      {visibleRange.start > 0 && (
        <div style={{ height: visibleRange.start * 200 }} />
      )}
      
      {visibleEntries.map((entry, localIndex) => {
        const globalIndex = visibleRange.start + localIndex;
        return (
          <EntryCard
            key={entry.id || `entry-${globalIndex}`}
            entry={entry}
            onClick={onEntryClick ? () => onEntryClick(entry, globalIndex) : undefined}
            showFullContent={showFullContent}
          />
        );
      })}
      
      {/* Spacer for remaining entries */}
      {visibleRange.end < entries.length && (
        <div style={{ height: (entries.length - visibleRange.end) * 200 }} />
      )}
      
      {/* Progress indicator */}
      {entries.length > 50 && (
        <div className="sticky bottom-0 bg-slate-900/90 backdrop-blur p-2 text-center text-xs text-slate-400">
          Showing {visibleRange.start + 1}-{Math.min(visibleRange.end, entries.length)} of {entries.length} entries
        </div>
      )}
    </div>
  );
}

export function ConversationViewer({
  entries,
  sessionStats,
  isLoading = false,
  errorMessage = null,
  projectName,
  sessionId,
  onEntryClick,
  showFullContent = false,
}: ConversationViewerProps) {
  // Handle loading state
  if (isLoading) {
    return (
      <div>
        <SessionHeader projectName={projectName} sessionId={sessionId} />
        <LoadingState />
      </div>
    );
  }

  // Handle error state
  if (errorMessage) {
    return (
      <div>
        <SessionHeader projectName={projectName} sessionId={sessionId} />
        <ErrorState message={errorMessage} />
      </div>
    );
  }

  // Handle empty state
  if (!entries.length) {
    return (
      <div>
        <SessionHeader 
          sessionStats={sessionStats} 
          projectName={projectName} 
          sessionId={sessionId} 
        />
        <EmptyState />
      </div>
    );
  }

  // Main conversation view
  return (
    <div className="space-y-6">
      <SessionHeader 
        sessionStats={sessionStats} 
        projectName={projectName} 
        sessionId={sessionId} 
      />
      
      <VirtualizedEntries
        entries={entries}
        onEntryClick={onEntryClick}
        showFullContent={showFullContent}
      />
    </div>
  );
}