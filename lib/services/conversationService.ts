import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ConversationEntry, SessionStats } from '@/lib/types/conversation';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
const MAX_LINES = 10000; // Maximum lines to process

export type ConversationService = {
  parseConversationFile: (projectId: string, sessionId: string) => Promise<ConversationEntry[]>;
  getSessionStats: (entries: ConversationEntry[]) => SessionStats;
  validateConversationEntry: (entry: unknown) => ConversationEntry | null;
  sanitizeContent: (content: string) => string;
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
 * Validates file size to prevent memory issues
 */
async function validateFileSize(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File size ${stats.size} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('exceeds maximum')) {
      throw error;
    }
    throw new Error('Unable to access file for size validation');
  }
}

/**
 * Safely parses a single JSONL line
 */
function parseJsonlLine(line: string, lineNumber: number): unknown | null {
  try {
    return JSON.parse(line);
  } catch (error) {
    console.warn(`Malformed JSON at line ${lineNumber}, skipping:`, error);
    return null;
  }
}

/**
 * Extracts conversation entries from JSONL content
 */
function extractConversationEntries(content: string): ConversationEntry[] {
  const lines = content.split('\n');
  const entries: ConversationEntry[] = [];
  
  let processedLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    // Prevent processing too many lines to avoid memory issues
    if (processedLines >= MAX_LINES) {
      console.warn(`Reached maximum line limit of ${MAX_LINES}, stopping processing`);
      break;
    }
    
    const parsed = parseJsonlLine(line, i + 1);
    if (parsed === null) {
      continue;
    }
    
    const validated = conversationService.validateConversationEntry(parsed);
    if (validated) {
      entries.push(validated);
    }
    
    processedLines++;
  }
  
  return entries;
}

export const conversationService: ConversationService = {
  /**
   * Validates and normalizes conversation entry data
   */
  validateConversationEntry(entry: unknown): ConversationEntry | null {
    try {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const rawEntry = entry as Record<string, unknown>;
      const type = rawEntry.type;
      const content = rawEntry.content;

      const validTypes = ["user", "assistant", "tool_use", "tool_result"] as const;
      if (typeof type !== "string" || !validTypes.includes(type as (typeof validTypes)[number])) {
        return null;
      }

      if (typeof content !== "string") {
        return null;
      }

      const sanitizedContent = this.sanitizeContent(content);

      const validatedEntry: ConversationEntry = {
        type,
        content: sanitizedContent,
        timestamp:
          typeof rawEntry.timestamp === "string" ? rawEntry.timestamp : new Date().toISOString(),
      };

      if (typeof rawEntry.id === "string") {
        validatedEntry.id = rawEntry.id;
      }

      if (rawEntry.metadata && typeof rawEntry.metadata === "object") {
        validatedEntry.metadata = rawEntry.metadata as ConversationEntry["metadata"];
      }

      if (typeof rawEntry.toolName === "string") {
        validatedEntry.toolName = rawEntry.toolName;
      }

      if (typeof rawEntry.toolUseId === "string") {
        validatedEntry.toolUseId = rawEntry.toolUseId;
      }

      if (rawEntry.parameters && typeof rawEntry.parameters === "object") {
        validatedEntry.parameters = rawEntry.parameters as ConversationEntry["parameters"];
      }

      if (typeof rawEntry.isError === "boolean") {
        validatedEntry.isError = rawEntry.isError;
      }

      return validatedEntry;
    } catch (error) {
      console.warn("Failed to validate conversation entry:", error);
      return null;
    }
  },

  /**
   * Sanitizes content to prevent XSS while preserving formatting
   */
  sanitizeContent(content: string): string {
    if (typeof content !== 'string') {
      return '';
    }
    
    // Basic XSS prevention - remove dangerous HTML tags and scripts
    // Note: This is a simple implementation. For production, consider using a library like DOMPurify
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },

  /**
   * Parses a conversation JSONL file and returns conversation entries
   */
  async parseConversationFile(projectId: string, sessionId: string): Promise<ConversationEntry[]> {
    try {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
      const validatedPath = validateProjectPath(projectPath);
      const sessionFilePath = path.join(validatedPath, 'conversations', `${sessionId}.jsonl`);
      
      // Validate file accessibility
      if (!(await isFileAccessible(sessionFilePath))) {
        throw new Error(`Session file not found or inaccessible: ${sessionId}`);
      }
      
      // Validate file size before reading
      await validateFileSize(sessionFilePath);
      
      // Read and parse file content
      const content = await fs.readFile(sessionFilePath, 'utf-8');
      
      if (!content.trim()) {
        return [];
      }
      
      const entries = extractConversationEntries(content);
      
      // Sort entries by timestamp for proper chronological order
      return entries.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error(`Failed to parse conversation file for session ${sessionId}:`, error);
      throw error;
    }
  },

  /**
   * Calculates statistics for a set of conversation entries
   */
  getSessionStats(entries: ConversationEntry[]): SessionStats {
    if (entries.length === 0) {
      const now = new Date().toISOString();
      return {
        totalEntries: 0,
        userMessages: 0,
        assistantMessages: 0,
        toolInvocations: 0,
        firstTimestamp: now,
        lastTimestamp: now,
      };
    }
    
    const stats: SessionStats = {
      totalEntries: entries.length,
      userMessages: 0,
      assistantMessages: 0,
      toolInvocations: 0,
      firstTimestamp: entries[0].timestamp,
      lastTimestamp: entries[entries.length - 1].timestamp,
    };
    
    let totalTokens = 0;
    let hasDuration = false;
    let totalDuration = 0;
    
    for (const entry of entries) {
      // Count by type
      switch (entry.type) {
        case 'user':
          stats.userMessages++;
          break;
        case 'assistant':
          stats.assistantMessages++;
          break;
        case 'tool_use':
        case 'tool_result':
          stats.toolInvocations++;
          break;
      }
      
      // Aggregate metadata if available
      if (entry.metadata) {
        if (typeof entry.metadata.tokenCount === 'number') {
          totalTokens += entry.metadata.tokenCount;
        }
        
        if (typeof entry.metadata.duration === 'number') {
          totalDuration += entry.metadata.duration;
          hasDuration = true;
        }
      }
    }
    
    // Add optional aggregated data
    if (totalTokens > 0) {
      stats.totalTokens = totalTokens;
    }
    
    if (hasDuration && totalDuration > 0) {
      stats.duration = totalDuration;
    }
    
    return stats;
  },
};

export const mockConversationService = conversationService;
