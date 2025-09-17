"use client";

import { ConversationEntry } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

type ToolUseProps = {
  entry: ConversationEntry;
  className?: string;
};

const ToolIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="h-3.5 w-3.5"
    stroke="currentColor"
    fill="none"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.828 9.172a4 4 0 1 0-5.656 5.656l7.071 7.071a1 1 0 0 0 1.414-1.414l-2.121-2.122 2.828-2.828a3 3 0 0 0-4.243-4.243l-2.828 2.828"
    />
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

function formatParameters(parameters: Record<string, unknown> | undefined): string {
  if (!parameters || Object.keys(parameters).length === 0) {
    return "{}";
  }

  try {
    return JSON.stringify(parameters, null, 2);
  } catch {
    return "Invalid parameters";
  }
}

function sanitizeJson(json: string): string {
  // Basic content sanitization for JSON display
  return json
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function highlightJson(json: string): string {
  const sanitized = sanitizeJson(json);

  // Simple JSON syntax highlighting with Tailwind classes
  const highlighted = sanitized
    // Highlight strings (quoted values)
    .replace(/&quot;([^&]*)&quot;/g, '<span class="text-green-300">&quot;$1&quot;</span>')
    // Highlight numbers
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="text-blue-300">$1</span>')
    // Highlight booleans
    .replace(/:\s*(true|false)/g, ': <span class="text-yellow-300">$1</span>')
    // Highlight null
    .replace(/:\s*(null)/g, ': <span class="text-red-300">$1</span>')
    // Highlight object keys (property names)
    .replace(/^(\s*)&quot;([^&]+)&quot;:/gm, '$1<span class="text-cyan-300">&quot;$2&quot;</span>:');

  return highlighted;
}

export function ToolUse({ entry, className = "" }: ToolUseProps) {
  if (entry.type !== "tool_use") {
    return null;
  }

  const formattedParameters = formatParameters(entry.parameters);
  const highlightedParameters = highlightJson(formattedParameters);

  return (
    <div className={`${cardSurface} p-4 ${className}`.trim()}>
      {/* Header with tool use indicator and timestamp */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-300">
            <ToolIcon />
            Tool Use
          </span>
          {entry.toolName && (
            <span className="rounded border border-slate-600/50 bg-slate-700/50 px-2 py-1 text-xs font-mono text-slate-300">
              {entry.toolName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {entry.timestamp && <span>{formatTimestamp(entry.timestamp)}</span>}
          {entry.metadata?.index !== undefined && <span>#{entry.metadata.index}</span>}
        </div>
      </div>

      {/* Tool use ID */}
      {entry.toolUseId && (
        <div className="mb-3">
          <span className="text-xs text-slate-500">ID: </span>
          <span className="text-xs font-mono text-slate-400">{entry.toolUseId}</span>
        </div>
      )}

      {/* Parameters */}
      {entry.parameters && Object.keys(entry.parameters).length > 0 && (
        <div className="mb-3">
          <div className="mb-2 text-xs font-medium text-slate-400">Parameters:</div>
          <div className="overflow-x-auto rounded-lg bg-slate-800/80 p-3">
            <pre className="whitespace-pre text-sm font-mono">
              <code
                className="text-slate-200"
                dangerouslySetInnerHTML={{ __html: highlightedParameters }}
              />
            </pre>
          </div>
        </div>
      )}

      {/* Content (if any additional content) */}
      {entry.content && entry.content.trim() && (
        <div className="mb-3">
          <div className="mb-2 text-xs font-medium text-slate-400">Additional Content:</div>
          <div className="rounded-lg bg-slate-800/40 p-3 text-sm text-slate-200">
            <div className="break-words font-sans leading-relaxed">{entry.content}</div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {entry.metadata && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          {typeof entry.metadata.tokenCount === "number" && <span>{entry.metadata.tokenCount} tokens</span>}
          {typeof entry.metadata.duration === "number" && <span>{entry.metadata.duration}ms</span>}
          {entry.parameters && (
            <span className="text-slate-500">
              {Object.keys(entry.parameters).length} parameter{Object.keys(entry.parameters).length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
