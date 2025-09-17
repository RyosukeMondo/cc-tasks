import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SessionMetadata } from '@/lib/types/project';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

export type SessionService = {
  listSessionsForProject: (projectId: string) => Promise<SessionMetadata[]>;
  getSessionMetadata: (projectId: string, sessionFileName: string) => Promise<SessionMetadata | undefined>;
  scanConversationFiles: (projectPath: string) => Promise<string[]>;
  extractSessionMetadata: (sessionFilePath: string) => Promise<SessionMetadata>;
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
 * Checks if a directory exists and is accessible
 */
async function isDirectoryAccessible(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Generates a session ID from the filename
 */
function generateSessionId(fileName: string): string {
  // Remove the .jsonl extension and use as ID
  return path.basename(fileName, '.jsonl');
}

export const sessionService: SessionService = {
  /**
   * Scans conversation files in a project directory
   */
  async scanConversationFiles(projectPath: string): Promise<string[]> {
    try {
      const validatedPath = validateProjectPath(projectPath);
      const conversationsPath = path.join(validatedPath, 'conversations');
      
      if (!(await isDirectoryAccessible(conversationsPath))) {
        return [];
      }
      
      const files = await fs.readdir(conversationsPath);
      
      // Filter only .jsonl files
      const jsonlFiles = files.filter(file => file.endsWith('.jsonl'));
      
      return jsonlFiles.sort();
    } catch (error) {
      console.error(`Failed to scan conversation files in ${projectPath}:`, error);
      return [];
    }
  },

  /**
   * Extracts metadata for a specific session file
   */
  async extractSessionMetadata(sessionFilePath: string): Promise<SessionMetadata> {
    const fileName = path.basename(sessionFilePath);
    const sessionId = generateSessionId(fileName);
    
    try {
      const isAccessible = await isFileAccessible(sessionFilePath);
      
      if (!isAccessible) {
        return {
          id: sessionId,
          fileName,
          filePath: sessionFilePath,
          fileSize: 0,
          lastModified: new Date().toISOString(),
          isAccessible: false,
        };
      }
      
      const stats = await fs.stat(sessionFilePath);
      
      return {
        id: sessionId,
        fileName,
        filePath: sessionFilePath,
        fileSize: stats.size,
        lastModified: stats.mtime.toISOString(),
        isAccessible: true,
      };
    } catch (error) {
      console.error(`Failed to extract metadata for session ${fileName}:`, error);
      
      // Return minimal metadata on error
      return {
        id: sessionId,
        fileName,
        filePath: sessionFilePath,
        fileSize: 0,
        lastModified: new Date().toISOString(),
        isAccessible: false,
      };
    }
  },

  /**
   * Lists all session metadata for a specific project
   */
  async listSessionsForProject(projectId: string): Promise<SessionMetadata[]> {
    try {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
      const sessionFiles = await this.scanConversationFiles(projectPath);
      const sessions: SessionMetadata[] = [];
      
      for (const fileName of sessionFiles) {
        try {
          const filePath = path.join(projectPath, 'conversations', fileName);
          const metadata = await this.extractSessionMetadata(filePath);
          sessions.push(metadata);
        } catch (error) {
          console.error(`Failed to process session file ${fileName}:`, error);
          
          // Create minimal metadata for inaccessible files
          const sessionId = generateSessionId(fileName);
          sessions.push({
            id: sessionId,
            fileName,
            filePath: path.join(projectPath, 'conversations', fileName),
            fileSize: 0,
            lastModified: new Date().toISOString(),
            isAccessible: false,
          });
        }
      }
      
      // Sort by last modified date (most recent first)
      return sessions.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    } catch (error) {
      console.error(`Failed to list sessions for project ${projectId}:`, error);
      return [];
    }
  },

  /**
   * Gets metadata for a specific session file
   */
  async getSessionMetadata(projectId: string, sessionFileName: string): Promise<SessionMetadata | undefined> {
    try {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);
      const sessionFilePath = path.join(projectPath, 'conversations', sessionFileName);
      
      // Validate that the requested file is a JSONL file
      if (!sessionFileName.endsWith('.jsonl')) {
        return undefined;
      }
      
      return await this.extractSessionMetadata(sessionFilePath);
    } catch (error) {
      console.error(`Failed to get session metadata for ${sessionFileName} in project ${projectId}:`, error);
      return undefined;
    }
  },
};

export const mockSessionService = sessionService;