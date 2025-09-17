"use client";

import { ConversationEntry } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

type ToolUseProps = {
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

function formatParameters(parameters: Record<string, any> | undefined): string {
  if (!parameters || Object.keys(parameters).length === 0) {
    return '{}';
  }
  
  try {
    return JSON.stringify(parameters, null, 2);
  } catch {
    return 'Invalid parameters';
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
  let highlighted = sanitized
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
  if (entry.type !== 'tool_use') {
    return null;
  }

  const formattedParameters = formatParameters(entry.parameters);
  const highlightedParameters = highlightJson(formattedParameters);

  return (
    <div className={`${cardSurface} p-4 ${className}`}>
      {/* Header with tool use indicator and timestamp */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide bg-orange-500/20 text-orange-300">
            <span className="text-sm">🔧</span>
            Tool Use
          </span>
          {entry.toolName && (
            <span className="px-2 py-1 text-xs font-mono bg-slate-700/50 text-slate-300 rounded border border-slate-600/50">
              {entry.toolName}
            </span>
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
          <div className="text-xs text-slate-400 mb-2 font-medium">Parameters:</div>
          <div className="bg-slate-800/80 rounded-lg p-3 overflow-x-auto">
            <pre className="text-sm font-mono whitespace-pre">
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
          <div className="text-xs text-slate-400 mb-2 font-medium">Additional Content:</div>
          <div className="text-sm text-slate-200 bg-slate-800/40 rounded-lg p-3">
            <div className="whitespace-pre-wrap font-sans break-words leading-relaxed">
              {entry.content}
            </div>
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
          {entry.parameters && (
            <span className="text-slate-500">
              {Object.keys(entry.parameters).length} parameter{Object.keys(entry.parameters).length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}