"use client";

import { ConversationEntry } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

type EntryType = "user" | "assistant" | "tool_use" | "tool_result";

type EntryTypeToken = {
  label: string;
  hue: string;
  text: string;
  icon: string;
};

const ENTRY_TYPE_TOKENS: Record<EntryType, EntryTypeToken> = {
  user: { 
    label: "User", 
    hue: "bg-blue-500/20", 
    text: "text-blue-300",
    icon: "👤"
  },
  assistant: { 
    label: "Assistant", 
    hue: "bg-purple-500/20", 
    text: "text-purple-300",
    icon: "🤖"
  },
  tool_use: { 
    label: "Tool Use", 
    hue: "bg-amber-500/20", 
    text: "text-amber-300",
    icon: "🔧"
  },
  tool_result: { 
    label: "Tool Result", 
    hue: "bg-emerald-500/20", 
    text: "text-emerald-300",
    icon: "📊"
  },
};

function EntryTypeBadge({ type }: { type: EntryType }) {
  const token = ENTRY_TYPE_TOKENS[type];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${token.hue} ${token.text}`}
    >
      <span className="text-sm">{token.icon}</span>
      {token.label}
    </span>
  );
}

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

function truncateContent(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}

type EntryCardProps = {
  entry: ConversationEntry;
  onClick?: () => void;
  showFullContent?: boolean;
};

export function EntryCard({ entry, onClick, showFullContent = false }: EntryCardProps) {
  const displayContent = showFullContent 
    ? entry.content 
    : truncateContent(entry.content);

  return (
    <div 
      className={`${cardSurface} p-4 transition-all duration-200 hover:bg-slate-800/60 hover:border-white/10 ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <EntryTypeBadge type={entry.type} />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {entry.timestamp && (
            <span>{formatTimestamp(entry.timestamp)}</span>
          )}
          {entry.metadata?.index !== undefined && (
            <span>#{entry.metadata.index}</span>
          )}
        </div>
      </div>

      {/* Tool-specific information */}
      {entry.type === "tool_use" && entry.toolName && (
        <div className="mb-2 text-sm">
          <span className="text-slate-300 font-medium">Tool:</span>{" "}
          <span className="text-white">{entry.toolName}</span>
        </div>
      )}

      {entry.type === "tool_result" && entry.toolUseId && (
        <div className="mb-2 text-sm">
          <span className="text-slate-300 font-medium">Tool ID:</span>{" "}
          <span className="text-slate-400 font-mono text-xs">{entry.toolUseId}</span>
          {entry.isError && (
            <span className="ml-2 text-red-400 font-medium">ERROR</span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="text-sm text-slate-200">
        <pre className="whitespace-pre-wrap font-sans break-words">
          {displayContent}
        </pre>
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
          {entry.metadata.model && (
            <span>{entry.metadata.model}</span>
          )}
        </div>
      )}

      {!showFullContent && entry.content.length > 200 && (
        <div className="mt-2 text-xs text-slate-500">
          Content truncated ({entry.content.length} characters total)
        </div>
      )}
    </div>
  );
}