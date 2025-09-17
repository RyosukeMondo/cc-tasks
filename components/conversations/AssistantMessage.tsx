"use client";

import { ConversationEntry } from "@/lib/types/conversation";
import { cardSurface } from "@/lib/ui/layout";

type AssistantMessageProps = {
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

function processMarkdownContent(content: string): string {
  let processed = sanitizeContent(content);
  
  // Process code blocks (```language\ncode\n```)
  processed = processed.replace(
    /```([a-zA-Z]*)\n([\s\S]*?)\n```/g,
    (match, language, code) => {
      return `<div class="my-4">
        ${language ? `<div class="text-xs text-slate-400 mb-1 font-mono">${language}</div>` : ''}
        <pre class="bg-slate-800/80 rounded-lg p-3 overflow-x-auto">
          <code class="text-sm font-mono text-slate-200 whitespace-pre">${code.trim()}</code>
        </pre>
      </div>`;
    }
  );
  
  // Process inline code (`code`)
  processed = processed.replace(
    /`([^`]+)`/g,
    '<code class="bg-slate-800/60 text-slate-200 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
  );
  
  // Process bold (**text** or __text__)
  processed = processed.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-semibold text-white">$1</strong>'
  );
  processed = processed.replace(
    /__(.*?)__/g,
    '<strong class="font-semibold text-white">$1</strong>'
  );
  
  // Process italic (*text* or _text_)
  processed = processed.replace(
    /\*([^*]+)\*/g,
    '<em class="italic text-slate-100">$1</em>'
  );
  processed = processed.replace(
    /_([^_]+)_/g,
    '<em class="italic text-slate-100">$1</em>'
  );
  
  // Process headers (# Header)
  processed = processed.replace(
    /^(#{1,6})\s+(.*$)/gm,
    (match, hashes, text) => {
      const level = hashes.length;
      const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs'];
      const size = sizes[level - 1] || 'text-base';
      return `<h${level} class="${size} font-semibold text-white mt-4 mb-2">${text}</h${level}>`;
    }
  );
  
  // Process links [text](url)
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  // Process line breaks
  processed = processed.replace(/\n/g, '<br>');
  
  return processed;
}

export function AssistantMessage({ entry, className = "" }: AssistantMessageProps) {
  if (entry.type !== 'assistant') {
    return null;
  }

  const processedContent = processMarkdownContent(entry.content);

  return (
    <div className={`${cardSurface} p-4 ${className}`}>
      {/* Header with assistant indicator and timestamp */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide bg-purple-500/20 text-purple-300">
            <span className="text-sm">🤖</span>
            Assistant
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

      {/* Message content with markdown processing */}
      <div className="text-sm text-slate-200">
        <div 
          className="whitespace-pre-wrap font-sans break-words leading-relaxed prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: processedContent }}
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
          {entry.metadata.model && (
            <span>{entry.metadata.model}</span>
          )}
          <span className="text-slate-500">Length: {entry.content.length} chars</span>
        </div>
      )}
    </div>
  );
}