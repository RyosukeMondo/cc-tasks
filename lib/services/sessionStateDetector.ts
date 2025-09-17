import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SessionState, SessionHealth, MonitoringUpdate } from '@/lib/types/monitoring';
import { SessionMetadata } from '@/lib/types/project';
import { ConversationEntry } from '@/lib/types/conversation';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const ERROR_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds

export type SessionStateDetector = {
  detectSessionState: (projectId: string, sessionId: string) => Promise<SessionState>;
  analyzeSessionHealth: (projectId: string, sessionId: string) => Promise<SessionHealth>;
  generateMonitoringUpdate: (projectId: string, sessionId: string) => Promise<MonitoringUpdate>;
  isSessionActive: (sessionMetadata: SessionMetadata) => boolean;
  scanActiveProcesses: () => Promise<number[]>;
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
 * Checks if a file exists and is accessible
 */
async function isFileAccessible(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Gets file modification time safely
 */
async function getFileModificationTime(filePath: string): Promise<Date | null> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

/**
 * Reads last few lines of a file efficiently
 */
async function readLastLines(filePath: string, lineCount: number = 10): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(-lineCount);
  } catch {
    return [];
  }
}

/**
 * Parses conversation entries from JSONL lines
 */
function parseConversationEntries(lines: string[]): ConversationEntry[] {
  const entries: ConversationEntry[] = [];
  
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && parsed.type && parsed.content) {
        entries.push(parsed as ConversationEntry);
      }
    } catch {
      // Skip malformed lines
      continue;
    }
  }
  
  return entries;
}

/**
 * Analyzes recent conversation activity to determine session state
 */
function analyzeConversationActivity(entries: ConversationEntry[], lastModified: Date): SessionState {
  const now = new Date();
  const timeSinceLastModified = now.getTime() - lastModified.getTime();
  
  // If file hasn't been modified recently, it's likely idle or stalled
  if (timeSinceLastModified > ERROR_THRESHOLD) {
    return 'terminated';
  }
  
  if (timeSinceLastModified > STALE_THRESHOLD) {
    return 'stalled';
  }
  
  if (entries.length === 0) {
    return 'idle';
  }
  
  // Check the most recent entries for activity patterns
  const recentEntries = entries.slice(-5);
  const hasRecentUserMessage = recentEntries.some(e => e.type === 'user');
  const hasRecentAssistantMessage = recentEntries.some(e => e.type === 'assistant');
  const hasRecentToolActivity = recentEntries.some(e => e.type === 'tool_use' || e.type === 'tool_result');
  
  // Look for error indicators
  const hasErrors = recentEntries.some(e => e.isError || 
    (e.content && e.content.toLowerCase().includes('error')));
  
  if (hasErrors) {
    return 'error';
  }
  
  // Determine activity level
  if (hasRecentToolActivity || (hasRecentUserMessage && hasRecentAssistantMessage)) {
    return 'active';
  }
  
  if (hasRecentUserMessage && !hasRecentAssistantMessage) {
    // User sent a message but no response yet - likely active and processing
    return 'active';
  }
  
  return 'idle';
}

/**
 * Calculates token usage from conversation entries
 */
function calculateTokenUsage(entries: ConversationEntry[]) {
  let inputTokens = 0;
  let outputTokens = 0;
  
  for (const entry of entries) {
    if (entry.metadata?.tokenCount) {
      if (entry.type === 'user') {
        inputTokens += entry.metadata.tokenCount;
      } else if (entry.type === 'assistant') {
        outputTokens += entry.metadata.tokenCount;
      }
    }
  }
  
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}

/**
 * Estimates current activity from recent entries
 */
function getCurrentActivity(entries: ConversationEntry[]): string | undefined {
  const recentEntries = entries.slice(-3);
  
  for (const entry of recentEntries.reverse()) {
    if (entry.type === 'tool_use' && entry.toolName) {
      return `Using tool: ${entry.toolName}`;
    }
    
    if (entry.type === 'assistant' && entry.content) {
      const content = entry.content.toLowerCase();
      if (content.includes('reading') || content.includes('analyzing')) {
        return 'Analyzing code';
      }
      if (content.includes('writing') || content.includes('creating')) {
        return 'Writing code';
      }
      if (content.includes('searching') || content.includes('finding')) {
        return 'Searching files';
      }
      return 'Processing request';
    }
  }
  
  return undefined;
}

export const sessionStateDetector: SessionStateDetector = {
  /**
   * Detects the current state of a session
   */
  async detectSessionState(projectId: string, sessionId: string): Promise<SessionState> {
    try {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
      const validatedPath = validateProjectPath(projectPath);
      const sessionFilePath = path.join(validatedPath, 'conversations', `${sessionId}.jsonl`);
      
      // Check if session file exists
      if (!(await isFileAccessible(sessionFilePath))) {
        return 'terminated';
      }
      
      // Get file modification time
      const lastModified = await getFileModificationTime(sessionFilePath);
      if (!lastModified) {
        return 'error';
      }
      
      // Read recent conversation entries
      const recentLines = await readLastLines(sessionFilePath, 20);
      const recentEntries = parseConversationEntries(recentLines);
      
      return analyzeConversationActivity(recentEntries, lastModified);
    } catch (error) {
      console.error(`Failed to detect session state for ${sessionId}:`, error);
      return 'error';
    }
  },

  /**
   * Analyzes session health metrics
   */
  async analyzeSessionHealth(projectId: string, sessionId: string): Promise<SessionHealth> {
    try {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
      const validatedPath = validateProjectPath(projectPath);
      const sessionFilePath = path.join(validatedPath, 'conversations', `${sessionId}.jsonl`);
      
      const lastModified = await getFileModificationTime(sessionFilePath);
      const lastActivityAt = lastModified ? lastModified.toISOString() : new Date().toISOString();
      
      // Read recent entries to analyze health
      const recentLines = await readLastLines(sessionFilePath, 50);
      const recentEntries = parseConversationEntries(recentLines);
      
      // Count errors in recent entries
      const errorCount = recentEntries.filter(e => 
        e.isError || (e.content && e.content.toLowerCase().includes('error'))
      ).length;
      
      // Generate warnings based on patterns
      const warnings: string[] = [];
      
      if (lastModified) {
        const timeSinceActivity = Date.now() - lastModified.getTime();
        if (timeSinceActivity > STALE_THRESHOLD) {
          warnings.push('Session has been inactive for an extended period');
        }
      }
      
      if (errorCount > 3) {
        warnings.push('High error rate detected in recent activity');
      }
      
      // Calculate response time from recent assistant messages
      let responseTime: number | undefined;
      const assistantEntries = recentEntries.filter(e => e.type === 'assistant');
      if (assistantEntries.length > 0) {
        const durations = assistantEntries
          .map(e => e.metadata?.duration)
          .filter((d): d is number => typeof d === 'number');
        
        if (durations.length > 0) {
          responseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        }
      }
      
      return {
        lastActivityAt,
        responseTime,
        errorCount,
        warnings
      };
    } catch (error) {
      console.error(`Failed to analyze session health for ${sessionId}:`, error);
      return {
        lastActivityAt: new Date().toISOString(),
        errorCount: 1,
        warnings: ['Failed to analyze session health']
      };
    }
  },

  /**
   * Generates a complete monitoring update for a session
   */
  async generateMonitoringUpdate(projectId: string, sessionId: string): Promise<MonitoringUpdate> {
    try {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
      const validatedPath = validateProjectPath(projectPath);
      const sessionFilePath = path.join(validatedPath, 'conversations', `${sessionId}.jsonl`);
      
      // Get session state and health
      const [state, health] = await Promise.all([
        this.detectSessionState(projectId, sessionId),
        this.analyzeSessionHealth(projectId, sessionId)
      ]);
      
      // Read all conversation entries to calculate comprehensive stats
      const allLines = await readLastLines(sessionFilePath, 1000); // Last 1000 lines for performance
      const allEntries = parseConversationEntries(allLines);
      
      // Calculate token usage and other metrics
      const tokenUsage = calculateTokenUsage(allEntries);
      const currentActivity = getCurrentActivity(allEntries);
      
      // Calculate session duration
      let duration = 0;
      if (allEntries.length > 0) {
        const firstEntry = allEntries[0];
        const lastEntry = allEntries[allEntries.length - 1];
        const startTime = new Date(firstEntry.timestamp).getTime();
        const endTime = new Date(lastEntry.timestamp).getTime();
        duration = endTime - startTime;
      }
      
      // Get file stats for additional metadata
      const stats = await fs.stat(sessionFilePath).catch(() => null);
      const startedAt = stats ? stats.birthtime.toISOString() : new Date().toISOString();
      
      return {
        sessionId,
        projectId,
        state,
        health,
        progress: {
          currentActivity,
          tokenUsage,
          messagesCount: allEntries.filter(e => e.type === 'user' || e.type === 'assistant').length,
          duration
        },
        metadata: {
          startedAt,
          lastUpdateAt: new Date().toISOString(),
          version: process.env.CLAUDE_VERSION,
          environment: process.env.NODE_ENV || 'development'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to generate monitoring update for ${sessionId}:`, error);
      
      // Return error state update
      return {
        sessionId,
        projectId,
        state: 'error',
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
  },

  /**
   * Checks if a session is currently active based on metadata
   */
  isSessionActive(sessionMetadata: SessionMetadata): boolean {
    if (!sessionMetadata.isAccessible) {
      return false;
    }
    
    const lastModified = new Date(sessionMetadata.lastModified);
    const timeSinceModified = Date.now() - lastModified.getTime();
    
    // Consider session active if modified within the last 30 minutes
    return timeSinceModified < ERROR_THRESHOLD;
  },

  /**
   * Scans for active Claude Code processes (simplified implementation)
   */
  async scanActiveProcesses(): Promise<number[]> {
    try {
      // This is a simplified implementation
      // In a real scenario, you might use process scanning utilities
      // to find Claude Code processes by name or other identifiers
      
      // For now, return empty array as process detection
      // would require platform-specific implementations
      return [];
    } catch (error) {
      console.error('Failed to scan active processes:', error);
      return [];
    }
  }
};

export const mockSessionStateDetector = sessionStateDetector;