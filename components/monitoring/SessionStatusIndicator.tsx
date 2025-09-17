"use client";

import { SessionState } from "@/lib/types/monitoring";

type StatusToken = {
  label: string;
  hue: string;
  text: string;
  pulseClass?: string;
};

const SESSION_STATUS_TOKENS: Record<SessionState, StatusToken> = {
  active: { 
    label: "Active", 
    hue: "bg-emerald-500/20", 
    text: "text-emerald-300",
    pulseClass: "animate-pulse"
  },
  idle: { 
    label: "Idle", 
    hue: "bg-blue-500/20", 
    text: "text-blue-300" 
  },
  stalled: { 
    label: "Stalled", 
    hue: "bg-amber-500/20", 
    text: "text-amber-300",
    pulseClass: "animate-pulse"
  },
  paused: { 
    label: "Paused", 
    hue: "bg-slate-500/20", 
    text: "text-slate-200" 
  },
  terminated: { 
    label: "Terminated", 
    hue: "bg-gray-500/20", 
    text: "text-gray-300" 
  },
  error: { 
    label: "Error", 
    hue: "bg-rose-500/20", 
    text: "text-rose-300",
    pulseClass: "animate-pulse"
  },
};

type SessionStatusIndicatorProps = {
  status: SessionState;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
};

export function SessionStatusIndicator({ 
  status, 
  className = "", 
  showLabel = true,
  size = "md"
}: SessionStatusIndicatorProps) {
  // Error boundary protection for invalid status values
  const token = SESSION_STATUS_TOKENS[status] || SESSION_STATUS_TOKENS.error;
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm"
  };
  
  const dotSizes = {
    sm: "size-1",
    md: "size-1.5", 
    lg: "size-2"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wide ${token.hue} ${token.text} ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={`Session status: ${token.label}`}
      title={status !== 'error' ? `Session status: ${token.label}` : `Error state - check session for issues`}
    >
      <span 
        className={`${dotSizes[size]} rounded-full bg-current ${token.pulseClass || ""}`}
        aria-hidden="true"
      />
      {showLabel && token.label}
    </span>
  );
}