// Session state types for real-time monitoring
export type SessionState = 
  | "active"      // Session is currently running and processing
  | "idle"        // Session is running but not actively processing
  | "stalled"     // Session appears stuck or unresponsive
  | "paused"      // Session has been manually paused
  | "terminated"  // Session has been stopped or ended
  | "error";      // Session encountered an error

// Session health information
export type SessionHealth = {
  lastActivityAt: string;
  responseTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  errorCount: number;
  warnings: string[];
};

// Real-time monitoring update data
export type MonitoringUpdate = {
  sessionId: string;
  projectId: string;
  state: SessionState;
  health: SessionHealth;
  progress: {
    currentActivity?: string;
    tokenUsage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    messagesCount: number;
    duration: number; // in milliseconds
  };
  metadata: {
    processId?: number;
    startedAt: string;
    lastUpdateAt: string;
    version?: string;
    environment?: string;
  };
  timestamp: string;
};

// Session control operations
export type SessionControlAction = "pause" | "resume" | "terminate" | "restart";

export type SessionControls = {
  sessionId: string;
  projectId: string;
  availableActions: SessionControlAction[];
  canPause: boolean;
  canResume: boolean;
  canTerminate: boolean;
  canRestart: boolean;
};

// Control operation request
export type SessionControlRequest = {
  sessionId: string;
  projectId: string;
  action: SessionControlAction;
  reason?: string;
  force?: boolean; // For forcing termination if needed
};

// Control operation result
export type SessionControlResult = {
  sessionId: string;
  action: SessionControlAction;
  success: boolean;
  message?: string;
  newState?: SessionState;
  timestamp: string;
};

// Monitoring configuration
export type MonitoringConfig = {
  pollInterval: number; // in milliseconds
  healthCheckInterval: number; // in milliseconds
  staleThreshold: number; // in milliseconds
  maxSessions: number;
  enableAutoRecovery: boolean;
  enableNotifications: boolean;
};

// Real-time monitoring service data
export type MonitoringData = {
  sessions: MonitoringUpdate[];
  overallStats: {
    activeSessions: number;
    totalSessions: number;
    averageResponseTime: number;
    systemLoad: number;
  };
  lastUpdated: string;
  config: MonitoringConfig;
};