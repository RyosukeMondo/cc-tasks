"use client";

import { ConversationEntry } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

type UserMessageProps = {
  entry: ConversationEntry;
  className?: string;
};

const UserIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="h-3.5 w-3.5"
    stroke="currentColor"
    fill="none"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.314 0-6 2.03-6 4.533V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.467C18 16.03 15.314 14 12 14Z" />
  </svg>
);

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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
  if (entry.type !== "user") {
    return null;
  }

  const sanitizedContent = sanitizeContent(entry.content);

  return (
    <div className={`${cardSurface} p-4 ${className}`.trim()}>
      {/* Header with user indicator and timestamp */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-300">
            <UserIcon />
            User
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {entry.timestamp && <span>{formatTimestamp(entry.timestamp)}</span>}
          {entry.metadata?.index !== undefined && <span>#{entry.metadata.index}</span>}
        </div>
      </div>

      {/* Message content */}
      <div className="text-sm text-slate-200">
        <div
          className="break-words font-sans leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>

      {/* Metadata */}
      {entry.metadata && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          {typeof entry.metadata.tokenCount === "number" && <span>{entry.metadata.tokenCount} tokens</span>}
          {typeof entry.metadata.duration === "number" && <span>{entry.metadata.duration}ms</span>}
          <span className="text-slate-500">Length: {entry.content.length} chars</span>
        </div>
      )}
    </div>
  );
}
