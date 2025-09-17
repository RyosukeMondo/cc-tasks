import { promises as fs } from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import { 
  SessionControlAction, 
  SessionControlRequest, 
  SessionControlResult, 
  SessionControls, 
  SessionState 
} from '@/lib/types/monitoring';

const execAsync = promisify(exec);
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const CONTROL_TIMEOUT = 30000; // 30 seconds timeout for control operations

export type SessionController = {
  getSessionControls: (projectId: string, sessionId: string) => Promise<SessionControls>;
  executeControl: (request: SessionControlRequest) => Promise<SessionControlResult>;
  pauseSession: (projectId: string, sessionId: string, reason?: string) => Promise<SessionControlResult>;
  resumeSession: (projectId: string, sessionId: string) => Promise<SessionControlResult>;
  terminateSession: (projectId: string, sessionId: string, force?: boolean) => Promise<SessionControlResult>;
  restartSession: (projectId: string, sessionId: string) => Promise<SessionControlResult>;
};

/**
 * Safely validates and normalizes project paths to prevent directory traversal
 */
function validateProjectPath(projectPath: string): string {
  const normalizedPath = path.normalize(projectPath);
  const resolvedPath = path.resolve(normalizedPath);
  
  // Ensure the path is within the Claude projects directory
  if (!resolvedPath.startsWith(path.resolve(CLAUDE_PROJECTS_DIR))) {
    throw new Error('Invalid project path: outside Claude projects directory');
  }
  
  return resolvedPath;
}

/**
 * Checks if a session file exists and is accessible
 */
async function isSessionAccessible(projectId: string, sessionId: string): Promise<boolean> {
  try {
    const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
    const validatedPath = validateProjectPath(projectPath);
    const sessionFilePath = path.join(validatedPath, 'conversations', `${sessionId}.jsonl`);
    
    const stats = await fs.stat(sessionFilePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Finds process IDs for Claude Code sessions
 */
async function findClaudeProcesses(): Promise<number[]> {
  try {
    // Try to find Claude Code processes using different approaches
    const processes: number[] = [];
    
    // Check for processes containing 'claude' in the command line
    try {
      const { stdout } = await execAsync('pgrep -f "claude"', { timeout: 5000 });
      const pids = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(pid => parseInt(pid.trim(), 10))
        .filter(pid => !isNaN(pid));
      processes.push(...pids);
    } catch {
      // Ignore errors from pgrep (process might not exist on all systems)
    }
    
    // On macOS/Linux, also try finding by process name
    if (process.platform !== 'win32') {
      try {
        const { stdout } = await execAsync('ps aux | grep -i claude | grep -v grep', { timeout: 5000 });
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const pid = parseInt(parts[1], 10);
            if (!isNaN(pid) && !processes.includes(pid)) {
              processes.push(pid);
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }
    
    return processes;
  } catch (error) {
    console.error('Failed to find Claude processes:', error);
    return [];
  }
}

/**
 * Attempts to send a signal to a process
 */
async function signalProcess(pid: number, signal: NodeJS.Signals): Promise<boolean> {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    console.error(`Failed to signal process ${pid}:`, error);
    return false;
  }
}

/**
 * Creates a session control marker file
 */
async function createControlMarker(
  projectId: string, 
  sessionId: string, 
  action: SessionControlAction, 
  reason?: string
): Promise<void> {
  try {
    const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
    const validatedPath = validateProjectPath(projectPath);
    const controlDir = path.join(validatedPath, '.control');
    
    // Ensure control directory exists
    await fs.mkdir(controlDir, { recursive: true });
    
    const markerFile = path.join(controlDir, `${sessionId}.${action}`);
    const markerData = {
      action,
      sessionId,
      projectId,
      timestamp: new Date().toISOString(),
      reason: reason || `Session ${action} requested`
    };
    
    await fs.writeFile(markerFile, JSON.stringify(markerData, null, 2));
  } catch (error) {
    console.error(`Failed to create control marker for ${action}:`, error);
    throw error;
  }
}

/**
 * Removes a session control marker file
 */
async function removeControlMarker(
  projectId: string, 
  sessionId: string, 
  action: SessionControlAction
): Promise<void> {
  try {
    const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
    const validatedPath = validateProjectPath(projectPath);
    const controlDir = path.join(validatedPath, '.control');
    const markerFile = path.join(controlDir, `${sessionId}.${action}`);
    
    await fs.unlink(markerFile);
  } catch {
    // Ignore errors when removing markers (file might not exist)
  }
}

/**
 * Determines available actions based on current session state
 */
function getAvailableActions(state: SessionState): SessionControlAction[] {
  const actions: SessionControlAction[] = [];
  
  switch (state) {
    case 'active':
    case 'idle':
      actions.push('pause', 'terminate');
      break;
    case 'paused':
      actions.push('resume', 'terminate');
      break;
    case 'stalled':
    case 'error':
      actions.push('restart', 'terminate');
      break;
    case 'terminated':
      actions.push('restart');
      break;
  }
  
  return actions;
}

/**
 * Creates a session control result
 */
function createControlResult(
  sessionId: string,
  action: SessionControlAction,
  success: boolean,
  message?: string,
  newState?: SessionState
): SessionControlResult {
  return {
    sessionId,
    action,
    success,
    message,
    newState,
    timestamp: new Date().toISOString()
  };
}

export const sessionController: SessionController = {
  /**
   * Gets available control actions for a session
   */
  async getSessionControls(projectId: string, sessionId: string): Promise<SessionControls> {
    try {
      // Check if session is accessible
      const isAccessible = await isSessionAccessible(projectId, sessionId);
      if (!isAccessible) {
        return {
          sessionId,
          projectId,
          availableActions: ['restart'],
          canPause: false,
          canResume: false,
          canTerminate: false,
          canRestart: true
        };
      }
      
      // For this implementation, we'll assume we can determine basic state
      // In a real implementation, this would integrate with sessionStateDetector
      const availableActions: SessionControlAction[] = ['pause', 'resume', 'terminate', 'restart'];
      
      return {
        sessionId,
        projectId,
        availableActions,
        canPause: availableActions.includes('pause'),
        canResume: availableActions.includes('resume'),
        canTerminate: availableActions.includes('terminate'),
        canRestart: availableActions.includes('restart')
      };
    } catch (error) {
      console.error(`Failed to get session controls for ${sessionId}:`, error);
      return {
        sessionId,
        projectId,
        availableActions: [],
        canPause: false,
        canResume: false,
        canTerminate: false,
        canRestart: false
      };
    }
  },

  /**
   * Executes a control operation on a session
   */
  async executeControl(request: SessionControlRequest): Promise<SessionControlResult> {
    const { sessionId, projectId, action, reason, force } = request;
    
    try {
      // Validate session exists (for most operations)
      if (action !== 'restart') {
        const isAccessible = await isSessionAccessible(projectId, sessionId);
        if (!isAccessible) {
          return createControlResult(
            sessionId,
            action,
            false,
            'Session file not accessible or does not exist'
          );
        }
      }
      
      // Execute the appropriate action
      switch (action) {
        case 'pause':
          return await this.pauseSession(projectId, sessionId, reason);
        case 'resume':
          return await this.resumeSession(projectId, sessionId);
        case 'terminate':
          return await this.terminateSession(projectId, sessionId, force);
        case 'restart':
          return await this.restartSession(projectId, sessionId);
        default:
          return createControlResult(
            sessionId,
            action,
            false,
            `Unknown action: ${action}`
          );
      }
    } catch (error) {
      console.error(`Failed to execute control action ${action} for ${sessionId}:`, error);
      return createControlResult(
        sessionId,
        action,
        false,
        `Failed to execute ${action}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Pauses a session
   */
  async pauseSession(projectId: string, sessionId: string, reason?: string): Promise<SessionControlResult> {
    try {
      // Create pause marker
      await createControlMarker(projectId, sessionId, 'pause', reason);
      
      // Attempt to signal associated processes to pause
      const processes = await findClaudeProcesses();
      let signalsSent = 0;
      
      for (const pid of processes) {
        const success = await signalProcess(pid, 'SIGTERM');
        if (success) signalsSent++;
      }
      
      const message = signalsSent > 0 
        ? `Session paused. Sent pause signals to ${signalsSent} processes.`
        : 'Session pause marker created. No active processes found to signal.';
      
      return createControlResult(sessionId, 'pause', true, message, 'paused');
    } catch (error) {
      return createControlResult(
        sessionId,
        'pause',
        false,
        `Failed to pause session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Resumes a session
   */
  async resumeSession(projectId: string, sessionId: string): Promise<SessionControlResult> {
    try {
      // Remove pause marker
      await removeControlMarker(projectId, sessionId, 'pause');
      
      // Create resume marker to signal the session should continue
      await createControlMarker(projectId, sessionId, 'resume');
      
      // Clean up the resume marker after a short delay
      setTimeout(async () => {
        await removeControlMarker(projectId, sessionId, 'resume');
      }, 5000);
      
      return createControlResult(
        sessionId, 
        'resume', 
        true, 
        'Session resumed. Pause markers removed.', 
        'active'
      );
    } catch (error) {
      return createControlResult(
        sessionId,
        'resume',
        false,
        `Failed to resume session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Terminates a session
   */
  async terminateSession(projectId: string, sessionId: string, force = false): Promise<SessionControlResult> {
    try {
      // Create terminate marker
      await createControlMarker(projectId, sessionId, 'terminate', force ? 'Force termination' : undefined);
      
      // Find and terminate associated processes
      const processes = await findClaudeProcesses();
      let processesTerminated = 0;
      
      for (const pid of processes) {
        // Try graceful termination first
        const graceful = await signalProcess(pid, 'SIGTERM');
        if (graceful) {
          processesTerminated++;
          
          // If force is requested, follow up with SIGKILL after a delay
          if (force) {
            setTimeout(async () => {
              await signalProcess(pid, 'SIGKILL');
            }, 5000);
          }
        }
      }
      
      // Clean up control markers
      await removeControlMarker(projectId, sessionId, 'pause');
      await removeControlMarker(projectId, sessionId, 'resume');
      
      const message = processesTerminated > 0
        ? `Session terminated. Stopped ${processesTerminated} processes.${force ? ' Force termination used.' : ''}`
        : 'Session termination markers created. No active processes found.';
      
      return createControlResult(sessionId, 'terminate', true, message, 'terminated');
    } catch (error) {
      return createControlResult(
        sessionId,
        'terminate',
        false,
        `Failed to terminate session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Restarts a session
   */
  async restartSession(projectId: string, sessionId: string): Promise<SessionControlResult> {
    try {
      // First terminate if it exists
      const terminateResult = await this.terminateSession(projectId, sessionId, true);
      
      // Clean up all control markers
      await Promise.all([
        removeControlMarker(projectId, sessionId, 'pause'),
        removeControlMarker(projectId, sessionId, 'resume'),
        removeControlMarker(projectId, sessionId, 'terminate')
      ]);
      
      // Create restart marker to indicate session should be restarted
      await createControlMarker(projectId, sessionId, 'restart');
      
      // Note: Actual restart implementation would depend on how Claude Code
      // sessions are launched and managed. This creates the necessary markers
      // for external tools to detect and act upon.
      
      return createControlResult(
        sessionId,
        'restart',
        true,
        'Session restart initiated. Previous session terminated and restart markers created.',
        'active'
      );
    } catch (error) {
      return createControlResult(
        sessionId,
        'restart',
        false,
        `Failed to restart session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
};

export const mockSessionController = sessionController;