"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { 
  MonitoringData, 
  MonitoringUpdate, 
  SessionControlRequest, 
  SessionControlResult,
  MonitoringConfig 
} from "@/lib/types/monitoring";
// Using API routes instead of direct service import for client-side compatibility

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

type ErrorInfo = {
  error: Error;
  severity: ErrorSeverity;
  timestamp: Date;
  operation: string;
  retryable: boolean;
};

type UseSessionMonitoringResult = {
  monitoringData: MonitoringData | null;
  sessions: MonitoringUpdate[];
  selectedSession: MonitoringUpdate | null;
  selectedSessionId: string | null;
  selectSession: (sessionId: string) => void;
  executeControl: (request: SessionControlRequest) => Promise<SessionControlResult>;
  startMonitoring: (config?: Partial<MonitoringConfig>) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  refresh: () => Promise<void>;
  retryOperation: () => Promise<void>;
  clearError: () => void;
  resetCircuitBreaker: () => void;
  isMonitoring: boolean;
  isLoading: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  consecutiveFailures: number;
};

const ERROR_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  EXPONENTIAL_BACKOFF_BASE: 2,
  CONNECTION_TIMEOUT: 10000,
  MAX_CONSECUTIVE_FAILURES: 5,
  CIRCUIT_BREAKER_TIMEOUT: 30000
};

function classifyError(error: Error, operation: string): ErrorInfo {
  const message = error.message.toLowerCase();
  let severity: ErrorSeverity = 'medium';
  let retryable = true;
  
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    severity = 'medium';
    retryable = true;
  } else if (message.includes('unauthorized') || message.includes('forbidden')) {
    severity = 'high';
    retryable = false;
  } else if (message.includes('not found') || message.includes('invalid project')) {
    severity = 'high';
    retryable = false;
  } else if (message.includes('permission') || message.includes('access')) {
    severity = 'critical';
    retryable = false;
  } else if (message.includes('server error') || message.includes('internal error')) {
    severity = 'high';
    retryable = true;
  }
  
  return {
    error,
    severity,
    timestamp: new Date(),
    operation,
    retryable
  };
}

export function useSessionMonitoring(projectId: string): UseSessionMonitoringResult {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastSuccessTime, setLastSuccessTime] = useState<Date | null>(null);
  
  // Use ref to store polling interval to handle cleanup properly
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOperationRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  // Sort sessions by last activity (most recent first)
  const sortSessions = useCallback((sessions: MonitoringUpdate[]): MonitoringUpdate[] => {
    return [...sessions].sort(
      (a, b) => new Date(b.health.lastActivityAt).getTime() - new Date(a.health.lastActivityAt).getTime(),
    );
  }, []);

  // Enhanced retry mechanism with exponential backoff
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    maxAttempts: number = ERROR_CONFIG.MAX_RETRY_ATTEMPTS
  ): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (!mountedRef.current) {
          // Component unmounted - return early without error
          return null;
        }
        
        setConnectionStatus(attempt === 1 ? 'connecting' : 'connecting');
        const result = await operation();
        
        // Success - reset failure tracking (only if still mounted)
        if (mountedRef.current) {
          setConsecutiveFailures(0);
          setLastSuccessTime(new Date());
          setConnectionStatus('connected');
          setError(null);
          setErrorInfo(null);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Classify error
        const errorInfo = classifyError(lastError, operationName);
        
        // Don't retry for certain error types
        if (!errorInfo.retryable || attempt === maxAttempts) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = ERROR_CONFIG.RETRY_DELAY_MS * Math.pow(ERROR_CONFIG.EXPONENTIAL_BACKOFF_BASE, attempt - 1);
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay);
        });
      }
    }
    
    // All retries failed (only update state if still mounted)
    if (lastError && mountedRef.current) {
      const newConsecutiveFailures = consecutiveFailures + 1;
      setConsecutiveFailures(newConsecutiveFailures);
      setConnectionStatus('error');

      const errorInfo = classifyError(lastError, operationName);
      setError(lastError);
      setErrorInfo(errorInfo);
      
      throw lastError;
    }
    
    throw new Error('Operation failed without error');
  }, [consecutiveFailures]);

  // Load monitoring data from service with enhanced error handling
  const loadMonitoringData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    lastOperationRef.current = 'loadMonitoringData';
    
    try {
      const data = await executeWithRetry(
        async () => {
          const response = await fetch(`/api/projects/${projectId}/monitoring`);
          if (!response.ok) {
            throw new Error(`Failed to fetch monitoring data: ${response.statusText}`);
          }
          return response.json();
        },
        'loadMonitoringData'
      );
      
      if (!mountedRef.current) return;
      
      setMonitoringData(data);
      
      // Update selected session if it's no longer in the current sessions
      if (data?.sessions && selectedSessionId) {
        const sessionExists = data.sessions.some(s => s.sessionId === selectedSessionId);
        if (!sessionExists) {
          setSelectedSessionId(data.sessions[0]?.sessionId ?? null);
        }
      } else if (data?.sessions && !selectedSessionId) {
        // Auto-select first session if none selected
        setSelectedSessionId(data.sessions[0]?.sessionId ?? null);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      // Error is already handled by executeWithRetry
      console.warn('Failed to load monitoring data after retries:', err);
    }
  }, [projectId, selectedSessionId, executeWithRetry]);

  // Start polling for updates
  const startPolling = useCallback((pollInterval: number = 2000) => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Start new polling interval
    pollingIntervalRef.current = setInterval(() => {
      void loadMonitoringData();
    }, pollInterval);
  }, [loadMonitoringData]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Start monitoring for the project with enhanced error handling
  const startMonitoring = useCallback(async (config?: Partial<MonitoringConfig>) => {
    setIsLoading(true);
    lastOperationRef.current = 'startMonitoring';
    
    try {
      await executeWithRetry(
        async () => {
          const response = await fetch(`/api/projects/${projectId}/monitoring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', config })
          });
          if (!response.ok) {
            throw new Error(`Failed to start monitoring: ${response.statusText}`);
          }
          return response.json();
        },
        'startMonitoring'
      );
      
      setIsMonitoring(true);
      
      // Initial data load
      await loadMonitoringData();
      
      // Start polling with configured interval
      const pollInterval = config?.pollInterval ?? 2000;
      startPolling(pollInterval);
    } catch (err) {
      // Error is already handled by executeWithRetry
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, loadMonitoringData, startPolling, executeWithRetry]);

  // Stop monitoring for the project with enhanced error handling
  const stopMonitoring = useCallback(async () => {
    setIsLoading(true);
    lastOperationRef.current = 'stopMonitoring';
    
    try {
      await executeWithRetry(
        async () => {
          const response = await fetch(`/api/projects/${projectId}/monitoring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
          });
          if (!response.ok) {
            throw new Error(`Failed to stop monitoring: ${response.statusText}`);
          }
          return response.json();
        },
        'stopMonitoring',
        2 // Fewer retries for stop operations
      );
      
      setIsMonitoring(false);
      stopPolling();
      setMonitoringData(null);
      setSelectedSessionId(null);
      setConnectionStatus('disconnected');
      setConsecutiveFailures(0);
    } catch (err) {
      // Error is already handled by executeWithRetry
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, stopPolling, executeWithRetry]);

  // Check if monitoring is active and initialize if needed
  useEffect(() => {
    // Use API to check if monitoring is active
    const checkMonitoringStatus = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/monitoring/status`);
        if (response.ok) {
          const { isActive } = await response.json();
          setIsMonitoring(isActive);
          
          if (isActive) {
            // Load initial data and start polling
            void loadMonitoringData();
            startPolling();
          }
        }
      } catch (error) {
        console.warn('Failed to check monitoring status:', error);
        setIsMonitoring(false);
      }
    };
    
    void checkMonitoringStatus();
  }, [projectId, loadMonitoringData, startPolling]);

  // Get sorted sessions
  const sessions = useMemo(() => {
    if (!monitoringData?.sessions) {
      return [];
    }
    return sortSessions(monitoringData.sessions);
  }, [monitoringData?.sessions, sortSessions]);

  // Get currently selected session
  const selectedSession = useMemo(() => {
    if (!selectedSessionId || !sessions.length) {
      return null;
    }
    return sessions.find((session) => session.sessionId === selectedSessionId) ?? null;
  }, [selectedSessionId, sessions]);

  // Select a session
  const selectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
  }, []);

  // Execute session control operation with enhanced error handling
  const executeControl = useCallback(
    async (request: SessionControlRequest) => {
      lastOperationRef.current = `executeControl:${request.action}`;
      
      try {
        const result = await executeWithRetry(
          async () => {
            const response = await fetch(`/api/projects/${projectId}/monitoring`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'control', request })
            });
            if (!response.ok) {
              throw new Error(`Failed to execute control: ${response.statusText}`);
            }
            return response.json();
          },
          `executeControl:${request.action}`,
          2 // Fewer retries for control operations
        );
        
        // Trigger immediate refresh after control operation
        try {
          await loadMonitoringData();
        } catch (refreshError) {
          console.warn('Failed to refresh data after control operation:', refreshError);
        }
        
        return result;
      } catch (err) {
        // Error is already handled by executeWithRetry
        throw err;
      }
    },
    [loadMonitoringData, executeWithRetry],
  );

  // Retry the last failed operation
  const retryOperation = useCallback(async () => {
    if (!lastOperationRef.current) {
      throw new Error('No operation to retry');
    }
    
    const operation = lastOperationRef.current;
    setError(null);
    setErrorInfo(null);
    
    try {
      if (operation === 'loadMonitoringData') {
        await loadMonitoringData();
      } else if (operation === 'startMonitoring') {
        await startMonitoring();
      } else if (operation === 'stopMonitoring') {
        await stopMonitoring();
      } else {
        throw new Error(`Cannot retry operation: ${operation}`);
      }
    } catch (err) {
      // Errors are handled by individual operations
      throw err;
    }
  }, [loadMonitoringData, startMonitoring, stopMonitoring]);

  // Clear error state and reset circuit breaker
  const clearError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
    setConsecutiveFailures(0); // Reset circuit breaker
    setConnectionStatus(isMonitoring ? 'connected' : 'disconnected');
  }, [isMonitoring]);

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadMonitoringData();
    } finally {
      setIsLoading(false);
    }
  }, [loadMonitoringData]);

  // Reset circuit breaker and retry monitoring
  const resetCircuitBreaker = useCallback(() => {
    setConsecutiveFailures(0);
    setError(null);
    setErrorInfo(null);
    setConnectionStatus('disconnected');

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Attempt to restart monitoring
    if (isMonitoring) {
      loadMonitoringData().catch(console.error);
      startPolling();
    }
  }, [isMonitoring, loadMonitoringData, startPolling]);

  // Circuit breaker logic - pause polling if too many failures
  useEffect(() => {
    if (consecutiveFailures >= ERROR_CONFIG.MAX_CONSECUTIVE_FAILURES) {
      console.warn(`Circuit breaker activated: ${consecutiveFailures} consecutive failures`);
      stopPolling();
      setConnectionStatus('error');
      
      // Auto-retry after timeout
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && isMonitoring) {
          console.log('Circuit breaker timeout expired, attempting to restore monitoring');
          setConsecutiveFailures(0);
          loadMonitoringData().catch(console.error);
          startPolling();
        }
      }, ERROR_CONFIG.CIRCUIT_BREAKER_TIMEOUT);
    }
  }, [consecutiveFailures, isMonitoring, loadMonitoringData, startPolling, stopPolling]);

  return {
    monitoringData,
    sessions,
    selectedSession,
    selectedSessionId,
    selectSession,
    executeControl,
    startMonitoring,
    stopMonitoring,
    refresh,
    retryOperation,
    clearError,
    resetCircuitBreaker,
    isMonitoring,
    isLoading,
    error,
    errorInfo,
    connectionStatus,
    consecutiveFailures,
  };
}