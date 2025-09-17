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

// Error handling configuration
const ERROR_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  EXPONENTIAL_BACKOFF_BASE: 2,
  CONNECTION_TIMEOUT: 30000,
  MAX_CONSECUTIVE_FAILURES: 5,
  CIRCUIT_BREAKER_TIMEOUT: 60000
};

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ErrorMetrics {
  consecutiveFailures: number;
  lastFailureTime: number;
  totalErrors: number;
  circuitBreakerOpen: boolean;
  circuitBreakerOpenTime?: number;
}

class ErrorHandler {
  private errorMetrics = new Map<string, ErrorMetrics>();
  private errorCallbacks = new Map<string, ((error: Error, severity: ErrorSeverity) => void)[]>();

  getErrorMetrics(key: string): ErrorMetrics {
    if (!this.errorMetrics.has(key)) {
      this.errorMetrics.set(key, {
        consecutiveFailures: 0,
        lastFailureTime: 0,
        totalErrors: 0,
        circuitBreakerOpen: false
      });
    }
    return this.errorMetrics.get(key)!;
  }

  recordError(key: string, error: Error, severity: ErrorSeverity = 'medium'): void {
    const metrics = this.getErrorMetrics(key);
    metrics.consecutiveFailures++;
    metrics.totalErrors++;
    metrics.lastFailureTime = Date.now();

    // Open circuit breaker if too many consecutive failures
    if (metrics.consecutiveFailures >= ERROR_CONFIG.MAX_CONSECUTIVE_FAILURES) {
      metrics.circuitBreakerOpen = true;
      metrics.circuitBreakerOpenTime = Date.now();
      console.error(`Circuit breaker opened for ${key} after ${metrics.consecutiveFailures} failures`);
    }

    // Notify error callbacks
    const callbacks = this.errorCallbacks.get(key) || [];
    callbacks.forEach(callback => {
      try {
        callback(error, severity);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    console.error(`Error recorded for ${key} (severity: ${severity}):`, error.message);
  }

  recordSuccess(key: string): void {
    const metrics = this.getErrorMetrics(key);
    metrics.consecutiveFailures = 0;
    if (metrics.circuitBreakerOpen) {
      metrics.circuitBreakerOpen = false;
      metrics.circuitBreakerOpenTime = undefined;
      console.log(`Circuit breaker closed for ${key} after successful operation`);
    }
  }

  isCircuitBreakerOpen(key: string): boolean {
    const metrics = this.getErrorMetrics(key);
    if (!metrics.circuitBreakerOpen) {
      return false;
    }

    // Check if circuit breaker timeout has passed
    const timeOpen = Date.now() - (metrics.circuitBreakerOpenTime || 0);
    if (timeOpen > ERROR_CONFIG.CIRCUIT_BREAKER_TIMEOUT) {
      // Allow one test request
      metrics.circuitBreakerOpen = false;
      console.log(`Circuit breaker timeout expired for ${key}, allowing test request`);
      return false;
    }

    return true;
  }

  addErrorCallback(key: string, callback: (error: Error, severity: ErrorSeverity) => void): void {
    if (!this.errorCallbacks.has(key)) {
      this.errorCallbacks.set(key, []);
    }
    this.errorCallbacks.get(key)!.push(callback);
  }

  removeErrorCallbacks(key: string): void {
    this.errorCallbacks.delete(key);
  }

  clearMetrics(key: string): void {
    this.errorMetrics.delete(key);
    this.errorCallbacks.delete(key);
  }
}

const errorHandler = new ErrorHandler();

/**
 * Executes a function with retry logic and exponential backoff
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  key: string,
  maxAttempts: number = ERROR_CONFIG.MAX_RETRY_ATTEMPTS,
  baseDelay: number = ERROR_CONFIG.RETRY_DELAY_MS
): Promise<T> {
  // Check circuit breaker
  if (errorHandler.isCircuitBreakerOpen(key)) {
    throw new Error(`Circuit breaker is open for ${key}. Service temporarily unavailable.`);
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      errorHandler.recordSuccess(key);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry for certain error types
      if (lastError.message.includes('EACCES') || 
          lastError.message.includes('Invalid project path') ||
          lastError.message.includes('required')) {
        errorHandler.recordError(key, lastError, 'high');
        throw lastError;
      }

      if (attempt === maxAttempts) {
        errorHandler.recordError(key, lastError, attempt === 1 ? 'medium' : 'high');
        break;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(ERROR_CONFIG.EXPONENTIAL_BACKOFF_BASE, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.warn(`Retry attempt ${attempt}/${maxAttempts} for ${key} failed:`, lastError.message);
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

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
 * Fetches session metadata for a project with enhanced error handling
 * In real implementation, this would integrate with sessionService
 */
async function getProjectSessions(projectId: string): Promise<SessionMetadata[]> {
  const key = `getProjectSessions:${projectId}`;
  
  return executeWithRetry(async () => {
    try {
      // This is a simplified mock - in reality would use sessionService.getProjectSessions
      // For now, return empty array as we don't have full session service integration
      
      // Validate input
      if (!projectId || typeof projectId !== 'string') {
        throw new Error('Invalid project ID provided');
      }
      
      return [];
    } catch (error) {
      const enhancedError = new Error(`Failed to get sessions for project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw enhancedError;
    }
  }, key, 2); // Fewer retries for metadata operations
}

/**
 * Performs health checks and auto-recovery if enabled with comprehensive error handling
 */
async function performHealthCheck(projectId: string, config: MonitoringConfig): Promise<void> {
  const key = `healthCheck:${projectId}`;
  
  try {
    await executeWithRetry(async () => {
      const now = Date.now();
      const lastCheck = monitoringState.getLastHealthCheck(projectId);
      
      // Only perform health check if enough time has passed
      if (now - lastCheck < config.healthCheckInterval) {
        return;
      }

      monitoringState.setLastHealthCheck(projectId, now);

      const currentData = monitoringState.getData(projectId);
      if (!currentData) {
        throw new Error('No monitoring data available for health check');
      }

      // Analyze sessions for health issues with error handling
      const unhealthySessions = currentData.sessions.filter(session => {
        try {
          const lastActivity = new Date(session.health.lastActivityAt).getTime();
          if (isNaN(lastActivity)) {
            console.warn(`Invalid lastActivityAt timestamp for session ${session.sessionId}`);
            return true; // Consider sessions with invalid timestamps as unhealthy
          }
          
          const timeSinceActivity = now - lastActivity;
          
          return (
            session.state === 'error' ||
            session.state === 'stalled' ||
            timeSinceActivity > config.staleThreshold ||
            session.health.errorCount > 5
          );
        } catch (error) {
          console.warn(`Error analyzing session ${session.sessionId} health:`, error);
          return true; // Consider sessions with analysis errors as unhealthy
        }
      });

      // Perform auto-recovery if enabled with individual error handling
      if (config.enableAutoRecovery && unhealthySessions.length > 0) {
        console.log(`Performing auto-recovery for ${unhealthySessions.length} unhealthy sessions`);
        
        const recoveryPromises = unhealthySessions.map(async (session) => {
          const sessionKey = `recovery:${session.sessionId}`;
          try {
            // Attempt to restart stalled or error sessions
            if (session.state === 'stalled' || session.state === 'error') {
              await executeWithRetry(async () => {
                return sessionController.restartSession(session.projectId, session.sessionId);
              }, sessionKey, 2); // Fewer retries for recovery operations
            }
            console.log(`Successfully recovered session ${session.sessionId}`);
          } catch (error) {
            errorHandler.recordError(sessionKey, error instanceof Error ? error : new Error('Recovery failed'), 'medium');
            console.error(`Failed to auto-recover session ${session.sessionId}:`, error);
          }
        });

        // Wait for all recovery attempts to complete (don't fail if some fail)
        await Promise.allSettled(recoveryPromises);
      }

      // Log health check results
      if (unhealthySessions.length > 0) {
        console.warn(`Health check found ${unhealthySessions.length} unhealthy sessions in project ${projectId}`);
      }
    }, key, 2); // Fewer retries for health checks
  } catch (error) {
    errorHandler.recordError(key, error instanceof Error ? error : new Error('Health check failed'), 'medium');
    console.error(`Health check failed for project ${projectId}:`, error);
    
    // Don't throw - health check failures shouldn't break monitoring
  }
}

/**
 * Updates monitoring data for a project with comprehensive error handling and graceful degradation
 */
async function updateProjectMonitoring(projectId: string): Promise<void> {
  const key = `updateMonitoring:${projectId}`;
  
  try {
    await executeWithRetry(async () => {
      const config = monitoringState.getConfig(projectId);
      
      // Validate project ID
      if (!projectId || typeof projectId !== 'string') {
        throw new Error('Invalid project ID for monitoring update');
      }
      
      const sessions = await getProjectSessions(projectId);
      
      // Limit number of sessions to monitor
      const sessionsToMonitor = sessions.slice(0, config.maxSessions);
      
      // Generate monitoring updates for each session with individual error handling
      const monitoringUpdates: MonitoringUpdate[] = [];
      const updatePromises = sessionsToMonitor.map(async (sessionMeta) => {
        const sessionKey = `sessionUpdate:${sessionMeta.id}`;
        try {
          return await executeWithRetry(async () => {
            return sessionStateDetector.generateMonitoringUpdate(
              projectId, 
              sessionMeta.id
            );
          }, sessionKey, 2); // Fewer retries for individual sessions
        } catch (error) {
          errorHandler.recordError(sessionKey, error instanceof Error ? error : new Error('Session update failed'), 'low');
          console.error(`Failed to get monitoring update for session ${sessionMeta.id}:`, error);
          
          // Return a minimal error update for graceful degradation
          return {
            sessionId: sessionMeta.id,
            projectId,
            state: 'error' as SessionState,
            health: {
              lastActivityAt: new Date().toISOString(),
              errorCount: 1,
              warnings: [`Failed to generate monitoring update: ${error instanceof Error ? error.message : 'Unknown error'}`]
            },
            progress: {
              tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
              messagesCount: 0,
              duration: 0
            },
            metadata: {
              startedAt: new Date().toISOString(),
              lastUpdateAt: new Date().toISOString(),
              errorContext: 'monitoring_update_failed'
            },
            timestamp: new Date().toISOString()
          };
        }
      });

      // Use allSettled to handle partial failures gracefully
      const settledResults = await Promise.allSettled(updatePromises);
      const updates = settledResults
        .filter((result): result is PromiseFulfilledResult<MonitoringUpdate> => result.status === 'fulfilled')
        .map(result => result.value);
      
      // Log any rejected promises
      const rejectedCount = settledResults.filter(result => result.status === 'rejected').length;
      if (rejectedCount > 0) {
        console.warn(`${rejectedCount} session updates failed but continuing with available data`);
      }
      
      monitoringUpdates.push(...updates);

      // Calculate overall statistics with safety checks
      const activeSessions = monitoringUpdates.filter(u => 
        u.state === 'active' || u.state === 'idle'
      ).length;
      
      const responseTimes = monitoringUpdates
        .map(u => u.health.responseTime)
        .filter((rt): rt is number => typeof rt === 'number' && rt > 0 && rt < 300000); // Filter invalid response times
      
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length 
        : 0;

      // System load calculation with error handling
      let systemLoad = 0;
      try {
        systemLoad = Math.min(100, Math.max(0, (monitoringUpdates.length / config.maxSessions) * 100));
      } catch (error) {
        console.warn('Failed to calculate system load:', error);
        systemLoad = 0;
      }

      // Create monitoring data with validation
      const monitoringData: MonitoringData = {
        sessions: monitoringUpdates,
        overallStats: {
          activeSessions: Math.max(0, activeSessions),
          totalSessions: Math.max(0, monitoringUpdates.length),
          averageResponseTime: Math.max(0, averageResponseTime),
          systemLoad: Math.max(0, Math.min(100, systemLoad))
        },
        lastUpdated: new Date().toISOString(),
        config
      };

      // Store updated data
      monitoringState.setData(projectId, monitoringData);

      // Perform health check if needed (non-blocking)
      performHealthCheck(projectId, config).catch(error => {
        console.warn(`Health check failed for project ${projectId}:`, error);
      });
    }, key, 2); // Fewer retries for main monitoring loop
  } catch (error) {
    errorHandler.recordError(key, error instanceof Error ? error : new Error('Monitoring update failed'), 'high');
    console.error(`Failed to update monitoring data for project ${projectId}:`, error);
    
    // Graceful degradation: try to preserve last known good state
    const lastData = monitoringState.getData(projectId);
    if (lastData) {
      // Update only the timestamp to indicate we tried but failed
      const degradedData = {
        ...lastData,
        lastUpdated: new Date().toISOString(),
        sessions: lastData.sessions.map(session => ({
          ...session,
          health: {
            ...session.health,
            warnings: [...(session.health.warnings || []), 'Monitoring update failed, showing last known state']
          }
        }))
      };
      monitoringState.setData(projectId, degradedData);
    }
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