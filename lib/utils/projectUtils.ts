import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * Error types for project operations
 */
export class ProjectError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProjectError';
  }
}

export class SecurityError extends ProjectError {
  constructor(message: string, originalError?: Error) {
    super(message, 'SECURITY_VIOLATION', originalError);
    this.name = 'SecurityError';
  }
}

export class FileAccessError extends ProjectError {
  constructor(message: string, originalError?: Error) {
    super(message, 'FILE_ACCESS_ERROR', originalError);
    this.name = 'FileAccessError';
  }
}

export class ValidationError extends ProjectError {
  constructor(message: string, originalError?: Error) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Safely validates and normalizes project paths to prevent directory traversal attacks
 * @param projectPath - The project path to validate
 * @returns Validated and normalized absolute path
 * @throws SecurityError if path is outside Claude projects directory
 */
export function validateProjectPath(projectPath: string): string {
  try {
    // Normalize and resolve the path to handle '..' and other path traversal attempts
    const normalizedPath = path.normalize(projectPath);
    const resolvedPath = path.resolve(normalizedPath);
    const claudeProjectsResolved = path.resolve(CLAUDE_PROJECTS_DIR);
    
    // Ensure the path is within the Claude projects directory
    if (!resolvedPath.startsWith(claudeProjectsResolved)) {
      throw new SecurityError(
        `Invalid project path: '${projectPath}' is outside Claude projects directory`
      );
    }
    
    return resolvedPath;
  } catch (error) {
    if (error instanceof SecurityError) {
      throw error;
    }
    throw new ValidationError(
      `Failed to validate project path: ${projectPath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Validates a project ID to ensure it's safe for file system operations
 * @param projectId - The project ID to validate
 * @returns The validated project ID
 * @throws ValidationError if project ID is invalid
 */
export function validateProjectId(projectId: string): string {
  if (!projectId || typeof projectId !== 'string') {
    throw new ValidationError('Project ID must be a non-empty string');
  }
  
  // Remove whitespace
  const trimmedId = projectId.trim();
  
  if (trimmedId.length === 0) {
    throw new ValidationError('Project ID cannot be empty or whitespace only');
  }
  
  // Check for path traversal attempts
  if (trimmedId.includes('..') || trimmedId.includes('/') || trimmedId.includes('\\')) {
    throw new ValidationError('Project ID cannot contain path separators or traversal sequences');
  }
  
  // Check for invalid characters that could cause file system issues
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(trimmedId)) {
    throw new ValidationError('Project ID contains invalid characters');
  }
  
  return trimmedId;
}

/**
 * Validates a session file name to ensure it's a valid JSONL file
 * @param fileName - The session file name to validate
 * @returns The validated file name
 * @throws ValidationError if file name is invalid
 */
export function validateSessionFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    throw new ValidationError('Session file name must be a non-empty string');
  }
  
  const trimmedName = fileName.trim();
  
  if (!trimmedName.endsWith('.jsonl')) {
    throw new ValidationError('Session file must have .jsonl extension');
  }
  
  // Check for path traversal attempts
  if (trimmedName.includes('..') || trimmedName.includes('/') || trimmedName.includes('\\')) {
    throw new ValidationError('Session file name cannot contain path separators or traversal sequences');
  }
  
  // Check for invalid file name characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(trimmedName)) {
    throw new ValidationError('Session file name contains invalid characters');
  }
  
  return trimmedName;
}

/**
 * Checks if a file exists and is accessible
 * @param filePath - The file path to check
 * @returns Promise resolving to true if file is accessible, false otherwise
 */
export async function isFileAccessible(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Checks if a directory exists and is accessible
 * @param dirPath - The directory path to check
 * @returns Promise resolving to true if directory is accessible, false otherwise
 */
export async function isDirectoryAccessible(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Safely gets file statistics with error handling
 * @param filePath - The file path to get stats for
 * @returns Promise resolving to file stats or null if inaccessible
 */
export async function getFileStats(filePath: string): Promise<fs.Stats | null> {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    console.warn(`Unable to get file stats for ${filePath}:`, error);
    return null;
  }
}

/**
 * Formats file size in human-readable format
 * @param bytes - The file size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/**
 * Formats a date for display in the UI
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch {
    return 'Unknown date';
  }
}

/**
 * Creates an error message for display to users
 * @param error - The error that occurred
 * @param context - Additional context about where the error occurred
 * @returns User-friendly error message
 */
export function formatErrorMessage(error: unknown, context?: string): string {
  const contextPrefix = context ? `${context}: ` : '';
  
  if (error instanceof SecurityError) {
    return `${contextPrefix}Access denied - invalid path`;
  }
  
  if (error instanceof FileAccessError) {
    return `${contextPrefix}Unable to access file or directory`;
  }
  
  if (error instanceof ValidationError) {
    return `${contextPrefix}${error.message}`;
  }
  
  if (error instanceof ProjectError) {
    return `${contextPrefix}${error.message}`;
  }
  
  if (error instanceof Error) {
    return `${contextPrefix}${error.message}`;
  }
  
  return `${contextPrefix}An unexpected error occurred`;
}

/**
 * Generates a session ID from a file name
 * @param fileName - The session file name
 * @returns Session ID without extension
 */
export function generateSessionId(fileName: string): string {
  return path.basename(fileName, '.jsonl');
}

/**
 * Gets the Claude projects directory path
 * @returns The absolute path to Claude projects directory
 */
export function getClaudeProjectsDir(): string {
  return CLAUDE_PROJECTS_DIR;
}

/**
 * Constructs a safe project path from project ID
 * @param projectId - The project ID
 * @returns Validated absolute path to the project directory
 * @throws SecurityError or ValidationError if validation fails
 */
export function getProjectPath(projectId: string): string {
  const validatedId = validateProjectId(projectId);
  const projectPath = path.join(CLAUDE_PROJECTS_DIR, validatedId);
  return validateProjectPath(projectPath);
}

/**
 * Constructs a safe session file path
 * @param projectId - The project ID
 * @param sessionFileName - The session file name
 * @returns Validated absolute path to the session file
 * @throws SecurityError or ValidationError if validation fails
 */
export function getSessionFilePath(projectId: string, sessionFileName: string): string {
  const validatedId = validateProjectId(projectId);
  const validatedFileName = validateSessionFileName(sessionFileName);
  const projectPath = getProjectPath(validatedId);
  
  return path.join(projectPath, 'conversations', validatedFileName);
}