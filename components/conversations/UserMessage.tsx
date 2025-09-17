"use client";

import { ConversationEntry } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

type UserMessageProps = {
  entry: ConversationEntry;
  className?: string;
};

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return timestamp;
  }
}

function sanitizeContent(content: string): string {
  // Basic content sanitization to prevent XSS while preserving formatting
  return content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function UserMessage({ entry, className = "" }: UserMessageProps) {
  if (entry.type !== 'user') {
    return null;
  }

  const sanitizedContent = sanitizeContent(entry.content);

  return (
    <div className={`${cardSurface} p-4 ${className}`}>
      {/* Header with user indicator and timestamp */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide bg-blue-500/20 text-blue-300">
            <span className="text-sm">👤</span>
            User
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {entry.timestamp && (
            <span>{formatTimestamp(entry.timestamp)}</span>
          )}
          {entry.metadata?.index !== undefined && (
            <span>#{entry.metadata.index}</span>
          )}
        </div>
      </div>

      {/* Message content */}
      <div className="text-sm text-slate-200">
        <div 
          className="whitespace-pre-wrap font-sans break-words leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>

      {/* Metadata */}
      {entry.metadata && (
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
          {entry.metadata.tokenCount && (
            <span>{entry.metadata.tokenCount} tokens</span>
          )}
          {entry.metadata.duration && (
            <span>{entry.metadata.duration}ms</span>
          )}
          <span className="text-slate-500">Length: {entry.content.length} chars</span>
        </div>
      )}
    </div>
  );
}