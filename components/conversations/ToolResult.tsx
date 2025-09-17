"use client";

import { ConversationEntry } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

type ToolResultProps = {
  entry: ConversationEntry;
  className?: string;
  toolUseEntry?: ConversationEntry; // Optional linked tool use entry
};

const SuccessIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="h-3.5 w-3.5"
    stroke="currentColor"
    fill="none"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.5 17 19 7.5" />
  </svg>
);

const ErrorIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="h-3.5 w-3.5"
    stroke="currentColor"
    fill="none"
    strokeWidth={1.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M6 18 18 6" />
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
  // Basic content sanitization for display
  return content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatContent(content: string): string {
  const sanitized = sanitizeContent(content);

  // If it looks like JSON, try to format it
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      return sanitizeContent(formatted);
    }
  } catch {
    // Not valid JSON, return as sanitized string
  }

  return sanitized;
}

export function ToolResult({ entry, className = "", toolUseEntry }: ToolResultProps) {
  if (entry.type !== "tool_result") {
    return null;
  }

  const isError = Boolean(entry.isError);
  const formattedContent = formatContent(entry.content);

  return (
    <div className={`${cardSurface} p-4 ${className}`.trim()}>
      {/* Header with tool result indicator and timestamp */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
              isError ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {isError ? <ErrorIcon /> : <SuccessIcon />}
            Tool Result
          </span>
          {entry.toolName && (
            <span className="rounded border border-slate-600/50 bg-slate-700/50 px-2 py-1 text-xs font-mono text-slate-300">
              {entry.toolName}
            </span>
          )}
          {isError && <span className="text-xs font-medium text-rose-300">Error</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {entry.timestamp && <span>{formatTimestamp(entry.timestamp)}</span>}
          {entry.metadata?.index !== undefined && <span>#{entry.metadata.index}</span>}
        </div>
      </div>

      {/* Tool use ID link */}
      {entry.toolUseId && (
        <div className="mb-3 text-xs text-slate-400">
          <span className="text-slate-500">Tool Use ID: </span>
          <span className="font-mono text-slate-300">{entry.toolUseId}</span>
          {toolUseEntry && <span className="ml-2 text-slate-500">linked to tool use above</span>}
        </div>
      )}

      {/* Result content */}
      {entry.content && entry.content.trim() && (
        <div className="mb-3">
          <div className="mb-2 text-xs font-medium text-slate-400">
            {isError ? "Error Details:" : "Result:"}
          </div>
          <div
            className={`overflow-x-auto rounded-lg p-3 ${
              isError ? "border border-rose-500/20 bg-rose-900/20" : "bg-slate-800/80"
            }`}
          >
            <pre className={`whitespace-pre-wrap text-sm font-mono ${isError ? "text-rose-200" : "text-slate-200"}`}>
              <code dangerouslySetInnerHTML={{ __html: formattedContent }} />
            </pre>
          </div>
        </div>
      )}

      {/* Metadata */}
      {entry.metadata && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          {typeof entry.metadata.tokenCount === "number" && <span>{entry.metadata.tokenCount} tokens</span>}
          {typeof entry.metadata.duration === "number" && <span>{entry.metadata.duration}ms</span>}
          <span className={`text-xs ${isError ? "text-rose-300" : "text-emerald-300"}`}>
            {isError ? "Failed" : "Success"}
          </span>
        </div>
      )}
    </div>
  );
}
