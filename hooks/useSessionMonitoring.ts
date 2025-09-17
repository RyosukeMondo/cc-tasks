"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { 
  MonitoringData, 
  MonitoringUpdate, 
  SessionControlRequest, 
  SessionControlResult,
  MonitoringConfig 
} from "@/lib/types/monitoring";
import { monitoringService } from "@/lib/services/monitoringService";

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
  isMonitoring: boolean;
  isLoading: boolean;
  error: Error | null;
};

export function useSessionMonitoring(projectId: string): UseSessionMonitoringResult {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Use ref to store polling interval to handle cleanup properly
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Sort sessions by last activity (most recent first)
  const sortSessions = useCallback((sessions: MonitoringUpdate[]): MonitoringUpdate[] => {
    return [...sessions].sort(
      (a, b) => new Date(b.health.lastActivityAt).getTime() - new Date(a.health.lastActivityAt).getTime(),
    );
  }, []);

  // Load monitoring data from service
  const loadMonitoringData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setError(null);
    try {
      const data = await monitoringService.getMonitoringData(projectId);
      
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
      
      const fallback = err instanceof Error ? err : new Error("Failed to load monitoring data");
      setError(fallback);
    }
  }, [projectId, selectedSessionId]);

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

  // Start monitoring for the project
  const startMonitoring = useCallback(async (config?: Partial<MonitoringConfig>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await monitoringService.startMonitoring(projectId, config);
      setIsMonitoring(true);
      
      // Initial data load
      await loadMonitoringData();
      
      // Start polling with configured interval
      const pollInterval = config?.pollInterval ?? 2000;
      startPolling(pollInterval);
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error("Failed to start monitoring");
      setError(fallback);
      throw fallback;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, loadMonitoringData, startPolling]);

  // Stop monitoring for the project
  const stopMonitoring = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await monitoringService.stopMonitoring(projectId);
      setIsMonitoring(false);
      stopPolling();
      setMonitoringData(null);
      setSelectedSessionId(null);
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error("Failed to stop monitoring");
      setError(fallback);
      throw fallback;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, stopPolling]);

  // Check if monitoring is active and initialize if needed
  useEffect(() => {
    const isActive = monitoringService.isMonitoring(projectId);
    setIsMonitoring(isActive);
    
    if (isActive) {
      // Load initial data and start polling
      void loadMonitoringData();
      startPolling();
    }
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

  // Execute session control operation
  const executeControl = useCallback(
    async (request: SessionControlRequest) => {
      setError(null);
      try {
        const result = await monitoringService.executeSessionControl(request);
        
        // Trigger immediate refresh after control operation
        await loadMonitoringData();
        
        return result;
      } catch (err) {
        const fallback = err instanceof Error ? err : new Error("Failed to execute session control");
        setError(fallback);
        throw fallback;
      }
    },
    [loadMonitoringData],
  );

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadMonitoringData();
    } finally {
      setIsLoading(false);
    }
  }, [loadMonitoringData]);

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
    isMonitoring,
    isLoading,
    error,
  };
}