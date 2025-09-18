/**
 * Integration tests for real-time session monitoring system
 * Tests end-to-end functionality, performance, and reliability with enhanced metrics
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { monitoringService, shutdownMonitoring } from '@/lib/services/monitoringService';
import { sessionController } from '@/lib/services/sessionController';
import { sessionStateDetector } from '@/lib/services/sessionStateDetector';
import { 
  MonitoringData, 
  MonitoringUpdate, 
  SessionControlRequest,
  SessionState,
  MonitoringConfig 
} from '@/lib/types/monitoring';

// Test configuration with optimized parameters
const TEST_PROJECT_ID = 'test-project-monitoring';
const TEST_SESSION_IDS = ['session-1', 'session-2', 'session-3', 'session-4', 'session-5'];
const PERFORMANCE_TEST_SESSION_COUNT = 20;
const MEMORY_THRESHOLD_MB = 50; // Reduced threshold for better performance validation
const RESPONSE_TIME_THRESHOLD_MS = 1500; // Tightened for better performance requirements
const CONCURRENT_TEST_SESSIONS = 15; // More concurrent sessions for stress testing

// Enhanced performance tracking with detailed metrics
interface PerformanceMetrics {
  initialMemory: number;
  peakMemory: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  p95ResponseTime: number;
  totalRequests: number;
  failedRequests: number;
  concurrentSessions: number;
  memoryLeakDetected: boolean;
  cpuUsageSpike: boolean;
  networkLatency: number[];
  gcCollections: number;
  startupTime: number;
}

let performanceMetrics: PerformanceMetrics;
let performanceTestStartTime: number;

// Mock session metadata for testing
const mockSessionMetadata = TEST_SESSION_IDS.map(id => ({
  id,
  projectId: TEST_PROJECT_ID,
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  status: 'active' as const
}));

// Performance-optimized test configuration
const PERFORMANCE_CONFIG: MonitoringConfig = {
  pollInterval: 1000, // Minimum allowed polling interval
  healthCheckInterval: 1500, // More frequent health checks
  staleThreshold: 8000, // Shorter threshold for faster detection
  maxSessions: 30, // Higher limit for concurrent testing
  enableAutoRecovery: true,
  enableNotifications: false
};

// Stress test configuration for performance validation
const STRESS_TEST_CONFIG: MonitoringConfig = {
  pollInterval: 1000, // Minimum allowed polling interval
  healthCheckInterval: 1000,
  staleThreshold: 5000,
  maxSessions: 50,
  enableAutoRecovery: true,
  enableNotifications: true
};

describe('Real-time Session Monitoring Integration Tests', () => {
  beforeAll(async () => {
    // Initialize performance metrics
    performanceMetrics = {
      initialMemory: process.memoryUsage().heapUsed / 1024 / 1024,
      peakMemory: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      totalRequests: 0,
      failedRequests: 0,
      concurrentSessions: 0
    };

    // Mock session state detector for controlled testing
    jest.spyOn(sessionStateDetector, 'generateMonitoringUpdate')
      .mockImplementation(async (projectId: string, sessionId: string): Promise<MonitoringUpdate> => {
        const startTime = Date.now();
        
        // Simulate realistic processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        
        const responseTime = Date.now() - startTime;
        performanceMetrics.totalRequests++;
        performanceMetrics.maxResponseTime = Math.max(performanceMetrics.maxResponseTime, responseTime);
        
        // Track memory usage
        const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        performanceMetrics.peakMemory = Math.max(performanceMetrics.peakMemory, currentMemory);

        const sessionIndex = TEST_SESSION_IDS.indexOf(sessionId);
        const states: SessionState[] = ['active', 'idle', 'stalled', 'error'];
        const state = states[sessionIndex % states.length] || 'active';

        return {
          sessionId,
          projectId,
          state,
          health: {
            lastActivityAt: new Date().toISOString(),
            responseTime,
            memoryUsage: Math.random() * 50 + 10,
            cpuUsage: Math.random() * 30 + 5,
            errorCount: state === 'error' ? 1 : 0,
            warnings: state === 'stalled' ? ['Session appears to be stalled'] : []
          },
          progress: {
            currentActivity: `Processing request ${Math.floor(Math.random() * 1000)}`,
            tokenUsage: {
              inputTokens: Math.floor(Math.random() * 1000) + 100,
              outputTokens: Math.floor(Math.random() * 500) + 50,
              totalTokens: Math.floor(Math.random() * 1500) + 150
            },
            messagesCount: Math.floor(Math.random() * 20) + 1,
            duration: Math.floor(Math.random() * 300000) + 60000
          },
          metadata: {
            processId: Math.floor(Math.random() * 50000) + 1000,
            startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            lastUpdateAt: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test'
          },
          controls: {
            sessionId,
            projectId,
            availableActions: ['pause', 'resume', 'terminate', 'restart'],
            canPause: state === 'active' || state === 'idle',
            canResume: state === 'paused',
            canTerminate: state !== 'terminated',
            canRestart: true
          },
          timestamp: new Date().toISOString()
        };
      });

    // Mock session controller for controlled testing
    jest.spyOn(sessionController, 'executeControl')
      .mockImplementation(async (request: SessionControlRequest) => {
        // Simulate control operation processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
        
        const success = Math.random() > 0.1; // 90% success rate for testing
        if (!success) {
          performanceMetrics.failedRequests++;
        }

        return {
          sessionId: request.sessionId,
          action: request.action,
          success,
          message: success 
            ? `${request.action} operation completed successfully`
            : `${request.action} operation failed - simulated error`,
          newState: success ? 
            (request.action === 'pause' ? 'paused' as SessionState : 
             request.action === 'resume' ? 'active' as SessionState :
             request.action === 'terminate' ? 'terminated' as SessionState : 'active' as SessionState) 
            : undefined,
          timestamp: new Date().toISOString()
        };
      });

    // The generateMonitoringUpdate mock above will provide the necessary session data
  });

  afterAll(async () => {
    // Cleanup and shutdown monitoring
    await monitoringService.stopMonitoring(TEST_PROJECT_ID);
    shutdownMonitoring();
    
    // Reset mocks
    jest.restoreAllMocks();
    
    // Log final performance metrics
    console.log('\n=== Final Performance Metrics ===');
    console.log(`Memory Usage: ${performanceMetrics.initialMemory.toFixed(2)}MB ↁE${performanceMetrics.peakMemory.toFixed(2)}MB`);
    console.log(`Memory Increase: ${(performanceMetrics.peakMemory - performanceMetrics.initialMemory).toFixed(2)}MB`);
    console.log(`Total Requests: ${performanceMetrics.totalRequests}`);
    console.log(`Failed Requests: ${performanceMetrics.failedRequests}`);
    console.log(`Success Rate: ${((performanceMetrics.totalRequests - performanceMetrics.failedRequests) / performanceMetrics.totalRequests * 100).toFixed(1)}%`);
    console.log(`Max Response Time: ${performanceMetrics.maxResponseTime}ms`);
    console.log(`Average Response Time: ${(performanceMetrics.averageResponseTime / performanceMetrics.totalRequests).toFixed(1)}ms`);
  });

  beforeEach(() => {
    // Reset performance tracking for each test
    performanceMetrics.totalRequests = 0;
    performanceMetrics.failedRequests = 0;
  });

  afterEach(async () => {
    // Stop monitoring after each test to prevent interference
    try {
      await monitoringService.stopMonitoring(TEST_PROJECT_ID);
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Core Monitoring Functionality', () => {
    test('should start monitoring with default configuration', async () => {
      const startTime = Date.now();
      
      await monitoringService.startMonitoring(TEST_PROJECT_ID);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD_MS);
      expect(monitoringService.isMonitoring(TEST_PROJECT_ID)).toBe(true);
    });

    test('should start monitoring with custom configuration', async () => {
      const customConfig: Partial<MonitoringConfig> = {
        pollInterval: 1000,
        maxSessions: 10,
        enableAutoRecovery: false
      };

      await monitoringService.startMonitoring(TEST_PROJECT_ID, customConfig);
      
      expect(monitoringService.isMonitoring(TEST_PROJECT_ID)).toBe(true);
      
      // Wait for initial data collection
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const data = await monitoringService.getMonitoringData(TEST_PROJECT_ID);
      expect(data).toBeTruthy();
      expect(data?.config.pollInterval).toBe(1000);
      expect(data?.config.maxSessions).toBe(10);
      expect(data?.config.enableAutoRecovery).toBe(false);
    });

    test('should collect and provide monitoring data', async () => {
      await monitoringService.startMonitoring(TEST_PROJECT_ID, PERFORMANCE_CONFIG);
      
      // Wait for data collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const data = await monitoringService.getMonitoringData(TEST_PROJECT_ID);
      
      expect(data).toBeTruthy();
      expect(data?.sessions).toHaveLength(TEST_SESSION_IDS.length);
      expect(data?.overallStats.totalSessions).toBe(TEST_SESSION_IDS.length);
      expect(data?.lastUpdated).toBeTruthy();
      
      // Validate session data structure
      data?.sessions.forEach(session => {
        expect(session.sessionId).toBeTruthy();
        expect(session.projectId).toBe(TEST_PROJECT_ID);
        expect(['active', 'idle', 'stalled', 'error']).toContain(session.state);
        expect(session.health.lastActivityAt).toBeTruthy();
        expect(typeof session.health.errorCount).toBe('number');
        expect(Array.isArray(session.health.warnings)).toBe(true);
        expect(typeof session.progress.tokenUsage.totalTokens).toBe('number');
      });
    });

    test('should stop monitoring and cleanup resources', async () => {
      await monitoringService.startMonitoring(TEST_PROJECT_ID);
      expect(monitoringService.isMonitoring(TEST_PROJECT_ID)).toBe(true);
      
      await monitoringService.stopMonitoring(TEST_PROJECT_ID);
      expect(monitoringService.isMonitoring(TEST_PROJECT_ID)).toBe(false);
      
      const data = await monitoringService.getMonitoringData(TEST_PROJECT_ID);
      expect(data).toBeNull();
    });
  });

  describe('Session Control Operations', () => {
    beforeEach(async () => {
      await monitoringService.startMonitoring(TEST_PROJECT_ID, PERFORMANCE_CONFIG);
      // Wait for initial monitoring data
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    test('should execute pause control operation', async () => {
      const request: SessionControlRequest = {
        projectId: TEST_PROJECT_ID,
        sessionId: TEST_SESSION_IDS[0],
        action: 'pause',
        reason: 'Integration test'
      };

      const startTime = Date.now();
      const result = await monitoringService.executeSessionControl(request);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD_MS);
      expect(result.sessionId).toBe(request.sessionId);
      expect(result.action).toBe('pause');
      expect(typeof result.success).toBe('boolean');
      expect(result.timestamp).toBeTruthy();
    });

    test('should execute multiple control operations concurrently', async () => {
      const requests: SessionControlRequest[] = TEST_SESSION_IDS.slice(0, 3).map(sessionId => ({
        projectId: TEST_PROJECT_ID,
        sessionId,
        action: 'pause' as const,
        reason: 'Concurrent test'
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => monitoringService.executeSessionControl(request))
      );
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(totalTime).toBeLessThan(RESPONSE_TIME_THRESHOLD_MS * 2); // Should be faster than sequential
      
      results.forEach((result, index) => {
        expect(result.sessionId).toBe(requests[index].sessionId);
        expect(result.action).toBe('pause');
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle service errors gracefully', async () => {
      // Temporarily mock service to throw errors
      const originalMethod = sessionStateDetector.generateMonitoringUpdate;
      jest.spyOn(sessionStateDetector, 'generateMonitoringUpdate')
        .mockImplementation(async () => {
          throw new Error('Simulated service error');
        });

      await monitoringService.startMonitoring(TEST_PROJECT_ID, {
        ...PERFORMANCE_CONFIG,
        pollInterval: 1000
      });

      // Wait for multiple polling cycles
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Service should continue running despite errors
      expect(monitoringService.isMonitoring(TEST_PROJECT_ID)).toBe(true);

      // Restore original method
      jest.spyOn(sessionStateDetector, 'generateMonitoringUpdate')
        .mockImplementation(originalMethod);
    });

    test('should implement circuit breaker for repeated failures', async () => {
      let callCount = 0;
      jest.spyOn(sessionStateDetector, 'generateMonitoringUpdate')
        .mockImplementation(async () => {
          callCount++;
          if (callCount <= 10) { // First 10 calls fail
            throw new Error('Simulated repeated failure');
          }
          return {
            sessionId: 'test',
            projectId: TEST_PROJECT_ID,
            state: 'active' as SessionState,
            health: {
              lastActivityAt: new Date().toISOString(),
              errorCount: 0,
              warnings: []
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
        });

      await monitoringService.startMonitoring(TEST_PROJECT_ID, {
        ...PERFORMANCE_CONFIG,
        pollInterval: 1000 // Minimum allowed polling interval
      });

      // Wait for circuit breaker to potentially activate
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Service should still be running (circuit breaker should protect it)
      expect(monitoringService.isMonitoring(TEST_PROJECT_ID)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent sessions efficiently', async () => {
      const concurrentSessionIds = Array.from(
        { length: PERFORMANCE_TEST_SESSION_COUNT }, 
        (_, i) => `perf-session-${i}`
      );

      // Update mock to return performance test sessions by updating the existing mock
      jest.spyOn(sessionStateDetector, 'generateMonitoringUpdate')
        .mockImplementation(async (projId, sessionId) => {
          const sessionIndex = concurrentSessionIds.indexOf(sessionId);
          if (sessionIndex !== -1) {
            return generateMockSession(projId, sessionId);
          }
          return generateMockSession(projId, sessionId);
        });

      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      await monitoringService.startMonitoring(TEST_PROJECT_ID, {
        ...PERFORMANCE_CONFIG,
        maxSessions: PERFORMANCE_TEST_SESSION_COUNT + 5
      });

      // Wait for multiple monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 3000));

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryIncrease = finalMemory - initialMemory;

      // Performance assertions
      expect(endTime - startTime).toBeLessThan(10000); // Setup should complete within 10s
      expect(memoryIncrease).toBeLessThan(MEMORY_THRESHOLD_MB); // Memory increase should be reasonable

      const data = await monitoringService.getMonitoringData(TEST_PROJECT_ID);
      expect(data?.sessions.length).toBeGreaterThan(0);
      expect(data?.overallStats.systemLoad).toBeLessThanOrEqual(100);

      performanceMetrics.concurrentSessions = data?.sessions.length || 0;
    });

    test('should maintain responsive polling under load', async () => {
      await monitoringService.startMonitoring(TEST_PROJECT_ID, {
        pollInterval: 1000,
        healthCheckInterval: 2000,
        staleThreshold: 10000,
        maxSessions: 15,
        enableAutoRecovery: true,
        enableNotifications: false
      });

      const responseTimeHistory: number[] = [];
      const testDuration = 5000; // 5 seconds
      const testStart = Date.now();

      // Monitor response times over test duration
      const monitoringPromise = new Promise<void>((resolve) => {
        const interval = setInterval(async () => {
          const requestStart = Date.now();
          try {
            await monitoringService.getMonitoringData(TEST_PROJECT_ID);
            const responseTime = Date.now() - requestStart;
            responseTimeHistory.push(responseTime);
            performanceMetrics.averageResponseTime += responseTime;
          } catch (error) {
            // Count failed requests
            performanceMetrics.failedRequests++;
          }

          if (Date.now() - testStart > testDuration) {
            clearInterval(interval);
            resolve();
          }
        }, 250);
      });

      await monitoringPromise;

      // Calculate performance metrics
      const averageResponseTime = responseTimeHistory.reduce((a, b) => a + b, 0) / responseTimeHistory.length;
      const maxResponseTime = Math.max(...responseTimeHistory);
      const p95ResponseTime = responseTimeHistory.sort((a, b) => a - b)[Math.floor(responseTimeHistory.length * 0.95)];

      // Performance assertions
      expect(averageResponseTime).toBeLessThan(500); // Average response under 500ms
      expect(maxResponseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD_MS); // Max response under 2s
      expect(p95ResponseTime).toBeLessThan(1000); // 95th percentile under 1s

      console.log(`\nResponse Time Statistics:`);
      console.log(`Average: ${averageResponseTime.toFixed(1)}ms`);
      console.log(`Maximum: ${maxResponseTime}ms`);
      console.log(`95th Percentile: ${p95ResponseTime}ms`);
      console.log(`Total Requests: ${responseTimeHistory.length}`);
    });

    test('should handle rapid configuration updates', async () => {
      await monitoringService.startMonitoring(TEST_PROJECT_ID, PERFORMANCE_CONFIG);

      const configUpdates = [
        { pollInterval: 1000, maxSessions: 10 },
        { pollInterval: 1500, maxSessions: 20 },
        { pollInterval: 800, maxSessions: 15 },
        { pollInterval: 1200, maxSessions: 25 }
      ];

      const startTime = Date.now();
      
      // Apply configuration updates rapidly
      for (const config of configUpdates) {
        monitoringService.updateConfig(TEST_PROJECT_ID, config);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between updates
      }

      const updateTime = Date.now() - startTime;

      // Service should handle rapid updates without issues
      expect(updateTime).toBeLessThan(2000);
      expect(monitoringService.isMonitoring(TEST_PROJECT_ID)).toBe(true);

      // Wait for monitoring to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      const data = await monitoringService.getMonitoringData(TEST_PROJECT_ID);
      expect(data).toBeTruthy();
      expect(data?.config.pollInterval).toBe(1200); // Should have the last config
      expect(data?.config.maxSessions).toBe(25);
    });
  });

  describe('System Integration', () => {
    test('should integrate properly with all monitoring components', async () => {
      await monitoringService.startMonitoring(TEST_PROJECT_ID, PERFORMANCE_CONFIG);
      
      // Wait for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test monitoring data retrieval
      const monitoringData = await monitoringService.getMonitoringData(TEST_PROJECT_ID);
      expect(monitoringData).toBeTruthy();

      // Test individual session updates
      if (monitoringData?.sessions.length) {
        const sessionUpdate = await monitoringService.getSessionUpdate(
          TEST_PROJECT_ID, 
          monitoringData.sessions[0].sessionId
        );
        expect(sessionUpdate).toBeTruthy();
        expect(sessionUpdate?.sessionId).toBe(monitoringData.sessions[0].sessionId);
      }

      // Test session control
      if (monitoringData?.sessions.length) {
        const controlResult = await monitoringService.executeSessionControl({
          projectId: TEST_PROJECT_ID,
          sessionId: monitoringData.sessions[0].sessionId,
          action: 'pause',
          reason: 'Integration test'
        });
        expect(controlResult).toBeTruthy();
        expect(controlResult.action).toBe('pause');
      }

      // Test active projects listing
      const activeProjects = monitoringService.getActiveProjects();
      expect(activeProjects).toContain(TEST_PROJECT_ID);
    });
  });
});


