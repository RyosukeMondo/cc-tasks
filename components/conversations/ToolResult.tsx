"use client";

import { ConversationEntry } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

type ToolResultProps = {
  entry: ConversationEntry;
  className?: string;
  toolUseEntry?: ConversationEntry; // Optional linked tool use entry
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
  // Basic content sanitization for display
  return content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatContent(content: string, isError: boolean): string {
  const sanitized = sanitizeContent(content);
  
  // If it looks like JSON, try to format it
  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      return sanitizeContent(formatted);
    } catch {
      // Not valid JSON, return as-is
      return sanitized;
    }
  }
  
  return sanitized;
}

export function ToolResult({ entry, className = "", toolUseEntry }: ToolResultProps) {
  if (entry.type !== 'tool_result') {
    return null;
  }

  const isError = entry.isError || false;
  const formattedContent = formatContent(entry.content, isError);

  return (
    <div className={`${cardSurface} p-4 ${className}`}>
      {/* Header with tool result indicator and timestamp */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
            isError 
              ? 'bg-red-500/20 text-red-300' 
              : 'bg-blue-500/20 text-blue-300'
          }`}>
            <span className="text-sm">{isError ? '❌' : '✅'}</span>
            Tool Result
          </span>
          {entry.toolName && (
            <span className="px-2 py-1 text-xs font-mono bg-slate-700/50 text-slate-300 rounded border border-slate-600/50">
              {entry.toolName}
            </span>
          )}
          {isError && (
            <span className="text-red-400 font-medium text-xs">ERROR</span>
          )}
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

      {/* Tool use ID link */}
      {entry.toolUseId && (
        <div className="mb-3">
          <span className="text-xs text-slate-500">Tool Use ID: </span>
          <span className="text-xs font-mono text-slate-400">{entry.toolUseId}</span>
          {toolUseEntry && (
            <span className="ml-2 text-xs text-slate-500">
              → linked to tool use above
            </span>
          )}
        </div>
      )}

      {/* Result content */}
      {entry.content && entry.content.trim() && (
        <div className="mb-3">
          <div className="text-xs text-slate-400 mb-2 font-medium">
            {isError ? 'Error Details:' : 'Result:'}
          </div>
          <div className={`rounded-lg p-3 overflow-x-auto ${
            isError 
              ? 'bg-red-900/20 border border-red-500/20' 
              : 'bg-slate-800/80'
          }`}>
            <pre className="text-sm font-mono whitespace-pre-wrap">
              <code 
                className={`${isError ? 'text-red-200' : 'text-slate-200'}`}
                dangerouslySetInnerHTML={{ __html: formattedContent }}
              />
            </pre>
          </div>
        </div>
      )}

      {/* Metadata */}
      {entry.metadata && (
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
          {entry.metadata.tokenCount && (
            <span>{entry.metadata.tokenCount} tokens</span>
          )}
          {entry.metadata.duration && (
            <span>{entry.metadata.duration}ms</span>
          )}
          <span className={`text-xs ${isError ? 'text-red-400' : 'text-green-400'}`}>
            {isError ? 'Failed' : 'Success'}
          </span>
        </div>
      )}
    </div>
  );
}