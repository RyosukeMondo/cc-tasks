import { SessionMetadata } from '@/lib/types/project';
import { 
  MonitoringData, 
  MonitoringUpdate, 
  MonitoringConfig, 
  SessionState,
  SessionControlRequest,
  SessionControlResult
} from '@/lib/types/monitoring';
import { sessionStateDetector } from './sessionStateDetector';
import { sessionController } from './sessionController';

// Default configuration for monitoring
const DEFAULT_CONFIG: MonitoringConfig = {
  pollInterval: 2000,        // 2 seconds
  healthCheckInterval: 10000, // 10 seconds
  staleThreshold: 300000,    // 5 minutes
  maxSessions: 50,
  enableAutoRecovery: false,
  enableNotifications: false
};

export type MonitoringService = {
  startMonitoring: (projectId: string, config?: Partial<MonitoringConfig>) => Promise<void>;
  stopMonitoring: (projectId: string) => Promise<void>;
  getMonitoringData: (projectId: string) => Promise<MonitoringData | null>;
  getSessionUpdate: (projectId: string, sessionId: string) => Promise<MonitoringUpdate | null>;
  executeSessionControl: (request: SessionControlRequest) => Promise<SessionControlResult>;
  isMonitoring: (projectId: string) => boolean;
  updateConfig: (projectId: string, config: Partial<MonitoringConfig>) => void;
  getActiveProjects: () => string[];
};

// Internal monitoring state management
class MonitoringState {
  private activeMonitors = new Map<string, NodeJS.Timeout>();
  private monitoringData = new Map<string, MonitoringData>();
  private configs = new Map<string, MonitoringConfig>();
  private lastHealthChecks = new Map<string, number>();

  isActive(projectId: string): boolean {
    return this.activeMonitors.has(projectId);
  }

  setConfig(projectId: string, config: MonitoringConfig): void {
    this.configs.set(projectId, config);
  }

  getConfig(projectId: string): MonitoringConfig {
    return this.configs.get(projectId) || { ...DEFAULT_CONFIG };
  }

  setMonitor(projectId: string, timer: NodeJS.Timeout): void {
    this.activeMonitors.set(projectId, timer);
  }

  clearMonitor(projectId: string): void {
    const timer = this.activeMonitors.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.activeMonitors.delete(projectId);
    }
  }

  setData(projectId: string, data: MonitoringData): void {
    this.monitoringData.set(projectId, data);
  }

  getData(projectId: string): MonitoringData | null {
    return this.monitoringData.get(projectId) || null;
  }

  setLastHealthCheck(projectId: string, timestamp: number): void {
    this.lastHealthChecks.set(projectId, timestamp);
  }

  getLastHealthCheck(projectId: string): number {
    return this.lastHealthChecks.get(projectId) || 0;
  }

  getActiveProjects(): string[] {
    return Array.from(this.activeMonitors.keys());
  }

  cleanup(): void {
    // Clear all monitors
    for (const timer of this.activeMonitors.values()) {
      clearInterval(timer);
    }
    this.activeMonitors.clear();
    this.monitoringData.clear();
    this.configs.clear();
    this.lastHealthChecks.clear();
  }
}

const monitoringState = new MonitoringState();

/**
 * Fetches session metadata for a project (mock implementation)
 * In real implementation, this would integrate with sessionService
 */
async function getProjectSessions(projectId: string): Promise<SessionMetadata[]> {
  try {
    // This is a simplified mock - in reality would use sessionService.getProjectSessions
    // For now, return empty array as we don't have full session service integration
    return [];
  } catch (error) {
    console.error(`Failed to get sessions for project ${projectId}:`, error);
    return [];
  }
}

/**
 * Performs health checks and auto-recovery if enabled
 */
async function performHealthCheck(projectId: string, config: MonitoringConfig): Promise<void> {
  try {
    const now = Date.now();
    const lastCheck = monitoringState.getLastHealthCheck(projectId);
    
    // Only perform health check if enough time has passed
    if (now - lastCheck < config.healthCheckInterval) {
      return;
    }

    monitoringState.setLastHealthCheck(projectId, now);

    const currentData = monitoringState.getData(projectId);
    if (!currentData) {
      return;
    }

    // Analyze sessions for health issues
    const unhealthySessions = currentData.sessions.filter(session => {
      const lastActivity = new Date(session.health.lastActivityAt).getTime();
      const timeSinceActivity = now - lastActivity;
      
      return (
        session.state === 'error' ||
        session.state === 'stalled' ||
        timeSinceActivity > config.staleThreshold ||
        session.health.errorCount > 5
      );
    });

    // Perform auto-recovery if enabled
    if (config.enableAutoRecovery && unhealthySessions.length > 0) {
      console.log(`Performing auto-recovery for ${unhealthySessions.length} unhealthy sessions`);
      
      for (const session of unhealthySessions) {
        try {
          // Attempt to restart stalled or error sessions
          if (session.state === 'stalled' || session.state === 'error') {
            await sessionController.restartSession(session.projectId, session.sessionId);
          }
        } catch (error) {
          console.error(`Failed to auto-recover session ${session.sessionId}:`, error);
        }
      }
    }

    // Log health check results
    if (unhealthySessions.length > 0) {
      console.warn(`Health check found ${unhealthySessions.length} unhealthy sessions in project ${projectId}`);
    }
  } catch (error) {
    console.error(`Health check failed for project ${projectId}:`, error);
  }
}

/**
 * Updates monitoring data for a project
 */
async function updateProjectMonitoring(projectId: string): Promise<void> {
  try {
    const config = monitoringState.getConfig(projectId);
    const sessions = await getProjectSessions(projectId);
    
    // Limit number of sessions to monitor
    const sessionsToMonitor = sessions.slice(0, config.maxSessions);
    
    // Generate monitoring updates for each session
    const monitoringUpdates: MonitoringUpdate[] = [];
    const updatePromises = sessionsToMonitor.map(async (sessionMeta) => {
      try {
        const update = await sessionStateDetector.generateMonitoringUpdate(
          projectId, 
          sessionMeta.id
        );
        return update;
      } catch (error) {
        console.error(`Failed to get monitoring update for session ${sessionMeta.id}:`, error);
        // Return a minimal error update
        return {
          sessionId: sessionMeta.id,
          projectId,
          state: 'error' as SessionState,
          health: {
            lastActivityAt: new Date().toISOString(),
            errorCount: 1,
            warnings: ['Failed to generate monitoring update']
          },
          progress: {
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            messagesCount: 0,
            duration: 0
          },
          metadata: {
            startedAt: new Date().toISOString(),
            lastUpdateAt: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        };
      }
    });

    const updates = await Promise.all(updatePromises);
    monitoringUpdates.push(...updates);

    // Calculate overall statistics
    const activeSessions = monitoringUpdates.filter(u => 
      u.state === 'active' || u.state === 'idle'
    ).length;
    
    const responseTimes = monitoringUpdates
      .map(u => u.health.responseTime)
      .filter((rt): rt is number => typeof rt === 'number');
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length 
      : 0;

    // Mock system load calculation
    const systemLoad = Math.min(100, (monitoringUpdates.length / config.maxSessions) * 100);

    // Create monitoring data
    const monitoringData: MonitoringData = {
      sessions: monitoringUpdates,
      overallStats: {
        activeSessions,
        totalSessions: monitoringUpdates.length,
        averageResponseTime,
        systemLoad
      },
      lastUpdated: new Date().toISOString(),
      config
    };

    // Store updated data
    monitoringState.setData(projectId, monitoringData);

    // Perform health check if needed
    await performHealthCheck(projectId, config);
  } catch (error) {
    console.error(`Failed to update monitoring data for project ${projectId}:`, error);
  }
}

/**
 * Starts monitoring interval for a project
 */
function startMonitoringInterval(projectId: string, config: MonitoringConfig): void {
  // Clear any existing monitor
  monitoringState.clearMonitor(projectId);

  // Create new monitoring interval
  const timer = setInterval(async () => {
    await updateProjectMonitoring(projectId);
  }, config.pollInterval);

  // Store the timer
  monitoringState.setMonitor(projectId, timer);

  // Initial update
  updateProjectMonitoring(projectId).catch(error => {
    console.error(`Initial monitoring update failed for project ${projectId}:`, error);
  });
}

export const monitoringService: MonitoringService = {
  /**
   * Starts real-time monitoring for a project
   */
  async startMonitoring(projectId: string, configOverrides?: Partial<MonitoringConfig>): Promise<void> {
    try {
      // Merge configuration
      const config: MonitoringConfig = {
        ...DEFAULT_CONFIG,
        ...configOverrides
      };

      // Validate configuration
      if (config.pollInterval < 1000) {
        throw new Error('Poll interval must be at least 1000ms');
      }
      if (config.maxSessions < 1) {
        throw new Error('Max sessions must be at least 1');
      }

      // Store configuration
      monitoringState.setConfig(projectId, config);

      // Start monitoring interval
      startMonitoringInterval(projectId, config);

      console.log(`Started monitoring for project ${projectId} with ${config.pollInterval}ms interval`);
    } catch (error) {
      console.error(`Failed to start monitoring for project ${projectId}:`, error);
      throw error;
    }
  },

  /**
   * Stops monitoring for a project
   */
  async stopMonitoring(projectId: string): Promise<void> {
    try {
      monitoringState.clearMonitor(projectId);
      console.log(`Stopped monitoring for project ${projectId}`);
    } catch (error) {
      console.error(`Failed to stop monitoring for project ${projectId}:`, error);
      throw error;
    }
  },

  /**
   * Gets current monitoring data for a project
   */
  async getMonitoringData(projectId: string): Promise<MonitoringData | null> {
    try {
      const data = monitoringState.getData(projectId);
      
      // If monitoring is not active, return null
      if (!monitoringState.isActive(projectId)) {
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Failed to get monitoring data for project ${projectId}:`, error);
      return null;
    }
  },

  /**
   * Gets monitoring update for a specific session
   */
  async getSessionUpdate(projectId: string, sessionId: string): Promise<MonitoringUpdate | null> {
    try {
      return await sessionStateDetector.generateMonitoringUpdate(projectId, sessionId);
    } catch (error) {
      console.error(`Failed to get session update for ${sessionId}:`, error);
      return null;
    }
  },

  /**
   * Executes a control operation on a session
   */
  async executeSessionControl(request: SessionControlRequest): Promise<SessionControlResult> {
    try {
      const result = await sessionController.executeControl(request);

      // Update monitoring data after control operation
      if (monitoringState.isActive(request.projectId)) {
        // Trigger immediate update for this project
        updateProjectMonitoring(request.projectId).catch(error => {
          console.error(`Failed to update monitoring after control operation:`, error);
        });
      }

      return result;
    } catch (error) {
      console.error(`Failed to execute session control:`, error);
      return {
        sessionId: request.sessionId,
        action: request.action,
        success: false,
        message: `Control operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Checks if monitoring is active for a project
   */
  isMonitoring(projectId: string): boolean {
    return monitoringState.isActive(projectId);
  },

  /**
   * Updates monitoring configuration for a project
   */
  updateConfig(projectId: string, configOverrides: Partial<MonitoringConfig>): void {
    try {
      const currentConfig = monitoringState.getConfig(projectId);
      const newConfig = { ...currentConfig, ...configOverrides };

      // Validate new configuration
      if (newConfig.pollInterval < 1000) {
        throw new Error('Poll interval must be at least 1000ms');
      }
      if (newConfig.maxSessions < 1) {
        throw new Error('Max sessions must be at least 1');
      }

      // Update stored configuration
      monitoringState.setConfig(projectId, newConfig);

      // Restart monitoring with new configuration if currently active
      if (monitoringState.isActive(projectId)) {
        startMonitoringInterval(projectId, newConfig);
        console.log(`Updated monitoring configuration for project ${projectId}`);
      }
    } catch (error) {
      console.error(`Failed to update monitoring config for project ${projectId}:`, error);
      throw error;
    }
  },

  /**
   * Gets list of projects currently being monitored
   */
  getActiveProjects(): string[] {
    return monitoringState.getActiveProjects();
  }
};

// Export mock for testing
export const mockMonitoringService = monitoringService;

// Cleanup function for graceful shutdown
export function shutdownMonitoring(): void {
  console.log('Shutting down monitoring service...');
  monitoringState.cleanup();
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdownMonitoring);
  process.on('SIGINT', shutdownMonitoring);
}