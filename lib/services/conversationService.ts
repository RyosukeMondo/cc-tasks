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
 * Finds the first accessible JSONL file for the given session within supported directories.
 */
async function findSessionFilePath(validatedPath: string, sessionFileName: string): Promise<string | null> {
  const candidateDirs = [
    path.join(validatedPath, 'conversations'),
    validatedPath,
  ];

  for (const dir of candidateDirs) {
    const candidate = path.join(dir, sessionFileName);
    if (await isFileAccessible(candidate)) {
      return candidate;
    }
  }

  return null;
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
 * Sanitizes content to prevent XSS while preserving formatting
 */
function sanitizeContent(content: string): string {
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
}

/**
 * Validates and normalizes conversation entry data (internal function)
 */
function validateConversationEntryInternal(entry: unknown): ConversationEntry | null {
  try {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const rawEntry = entry as Record<string, unknown>;
    const type = rawEntry.type;

    const validTypes = ["user", "assistant", "tool_use", "tool_result"] as const;
    if (typeof type !== "string" || !validTypes.includes(type as (typeof validTypes)[number])) {
      return null;
    }

    // Handle Claude Code JSONL format where content is nested in message.content
    let content: string;
    if (rawEntry.message && typeof rawEntry.message === "object") {
      const message = rawEntry.message as Record<string, unknown>;
      if (typeof message.content === "string") {
        content = message.content;
      } else if (Array.isArray(message.content)) {
        // Handle assistant messages where content is an array of objects
        const contentArray = message.content as Array<unknown>;
        const textContent = contentArray
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .filter((item) => item.type === "text" && typeof item.text === "string")
          .map((item) => item.text as string)
          .join("\n");
        content = textContent || "";
      } else {
        return null;
      }
    } else if (typeof rawEntry.content === "string") {
      content = rawEntry.content;
    } else {
      return null;
    }

    const sanitizedContent = sanitizeContent(content);

    const validatedEntry: ConversationEntry = {
      type: type as "user" | "assistant" | "tool_use" | "tool_result",
      content: sanitizedContent,
      timestamp:
        typeof rawEntry.timestamp === "string" ? rawEntry.timestamp : new Date().toISOString(),
    };

    // Handle both id and uuid fields
    if (typeof rawEntry.id === "string") {
      validatedEntry.id = rawEntry.id;
    } else if (typeof rawEntry.uuid === "string") {
      validatedEntry.id = rawEntry.uuid;
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
}

/**
 * Extracts conversation entries from JSONL content
 */
function extractConversationEntries(content: string): ConversationEntry[] {
  const lines = content.split('\n');
  const entries: ConversationEntry[] = [];

  let processedLines = 0;
  let validatedCount = 0;
  let parsedCount = 0;

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
    parsedCount++;

    const validated = validateConversationEntryInternal(parsed);
    if (validated) {
      entries.push(validated);
      validatedCount++;
    }

    processedLines++;
  }

  // console.log(`JSONL parsing stats: ${processedLines} lines processed, ${parsedCount} parsed, ${validatedCount} validated`);
  return entries;
}

export const conversationService: ConversationService = {
  /**
   * Validates and normalizes conversation entry data
   */
  validateConversationEntry(entry: unknown): ConversationEntry | null {
    return validateConversationEntryInternal(entry);
  },

  /**
   * Sanitizes content to prevent XSS while preserving formatting
   */
  sanitizeContent(content: string): string {
    return sanitizeContent(content);
  },

  /**
   * Parses a conversation JSONL file and returns conversation entries
   */
  async parseConversationFile(projectId: string, sessionId: string): Promise<ConversationEntry[]> {
    try {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
      const validatedPath = validateProjectPath(projectPath);
      const sessionFileName = `${sessionId}.jsonl`;
      const sessionFilePath = await findSessionFilePath(validatedPath, sessionFileName);

      if (!sessionFilePath) {
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
