"use client";

import { MonitoringUpdate } from "@/lib/types/monitoring";
import { cardSurface } from "@/lib/ui/layout";

type SessionProgressDisplayProps = {
  sessionData: MonitoringUpdate;
  className?: string;
  compact?: boolean;
};

type ProgressMetric = {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  isHighlighted?: boolean;
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function getTokenUsageColor(totalTokens: number): string {
  if (totalTokens > 50000) return "text-rose-300";
  if (totalTokens > 25000) return "text-amber-300";
  return "text-emerald-300";
}

export function SessionProgressDisplay({ 
  sessionData, 
  className = "",
  compact = false 
}: SessionProgressDisplayProps) {
  const { progress, health, metadata } = sessionData;
  
  const metrics: ProgressMetric[] = [
    {
      label: "Total Tokens",
      value: formatNumber(progress.tokenUsage.totalTokens),
      color: getTokenUsageColor(progress.tokenUsage.totalTokens),
      isHighlighted: true
    },
    {
      label: "Input",
      value: formatNumber(progress.tokenUsage.inputTokens),
      color: "text-blue-300"
    },
    {
      label: "Output", 
      value: formatNumber(progress.tokenUsage.outputTokens),
      color: "text-purple-300"
    },
    {
      label: "Messages",
      value: progress.messagesCount.toString(),
      color: "text-slate-300"
    },
    {
      label: "Duration",
      value: formatDuration(progress.duration),
      color: "text-slate-300"
    }
  ];

  if (health.responseTime) {
    metrics.push({
      label: "Response",
      value: health.responseTime,
      unit: "ms",
      color: health.responseTime > 5000 ? "text-amber-300" : "text-emerald-300"
    });
  }

  return (
    <div className={`${compact ? "" : cardSurface + " p-4"} ${className}`}>
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Session Progress</h3>
          {progress.currentActivity && (
            <span className="text-xs text-slate-400 truncate max-w-32">
              {progress.currentActivity}
            </span>
          )}
        </div>
      )}
      
      {/* Current Activity */}
      {progress.currentActivity && compact && (
        <div className="mb-2">
          <span className="text-xs text-slate-400 block truncate">
            <span className="text-slate-500">Activity:</span> {progress.currentActivity}
          </span>
        </div>
      )}
      
      {/* Token Usage Visualization */}
      {!compact && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Token Usage</span>
            <span className={`text-xs font-mono ${getTokenUsageColor(progress.tokenUsage.totalTokens)}`}>
              {formatNumber(progress.tokenUsage.totalTokens)}
            </span>
          </div>
          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-blue-500/60 rounded-full"
              style={{ 
                width: `${Math.min(100, (progress.tokenUsage.inputTokens / progress.tokenUsage.totalTokens) * 100)}%` 
              }}
            />
            <div 
              className="absolute inset-y-0 bg-purple-500/60 rounded-full"
              style={{ 
                left: `${Math.min(100, (progress.tokenUsage.inputTokens / progress.tokenUsage.totalTokens) * 100)}%`,
                width: `${Math.min(100 - (progress.tokenUsage.inputTokens / progress.tokenUsage.totalTokens) * 100, (progress.tokenUsage.outputTokens / progress.tokenUsage.totalTokens) * 100)}%` 
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs">
            <span className="text-blue-300">Input: {formatNumber(progress.tokenUsage.inputTokens)}</span>
            <span className="text-purple-300">Output: {formatNumber(progress.tokenUsage.outputTokens)}</span>
          </div>
        </div>
      )}
      
      {/* Metrics Grid */}
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
        {metrics.map((metric, index) => (
          <div 
            key={metric.label}
            className={`${compact ? "p-2" : "p-3"} rounded-lg border border-white/5 bg-white/5 ${
              metric.isHighlighted ? "border-white/20 bg-white/10" : ""
            }`}
          >
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              {metric.label}
            </div>
            <div className={`font-mono text-sm font-semibold ${metric.color || "text-white"}`}>
              {metric.value}
              {metric.unit && <span className="text-xs text-slate-400 ml-1">{metric.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Error Count and Warnings */}
      {(health.errorCount > 0 || health.warnings.length > 0) && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-xs">
            {health.errorCount > 0 && (
              <span className="text-rose-300">
                <span className="text-slate-500">Errors:</span> {health.errorCount}
              </span>
            )}
            {health.warnings.length > 0 && (
              <span className="text-amber-300">
                <span className="text-slate-500">Warnings:</span> {health.warnings.length}
              </span>
            )}
          </div>
          {health.warnings.length > 0 && !compact && (
            <div className="mt-2 space-y-1">
              {health.warnings.slice(0, 2).map((warning, index) => (
                <div key={index} className="text-xs text-amber-200 bg-amber-500/10 rounded px-2 py-1 truncate">
                  {warning}
                </div>
              ))}
              {health.warnings.length > 2 && (
                <div className="text-xs text-slate-400">
                  +{health.warnings.length - 2} more warnings
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Last Update */}
      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
        <span>Last updated: </span>
        <span className="font-mono">
          {new Date(sessionData.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}