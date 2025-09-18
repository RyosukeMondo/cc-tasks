import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Project, ProjectMeta } from '@/lib/types/project';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

export type ProjectService = {
  listProjects: () => Promise<Project[]>;
  getProject: (projectId: string) => Promise<Project | undefined>;
  scanProjectsDirectory: () => Promise<string[]>;
  extractProjectMetadata: (projectPath: string) => Promise<ProjectMeta>;
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
 * Safely reads and parses meta.json file
 */
async function readProjectMeta(projectPath: string): Promise<Partial<ProjectMeta> | null> {
  try {
    const metaPath = path.join(projectPath, 'meta.json');
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(metaContent);
  } catch {
    // Return null if meta.json doesn't exist or is invalid
    return null;
  }
}

/**
 * Collects absolute paths to JSONL session files for a project.
 */
async function listSessionFilePaths(projectPath: string): Promise<string[]> {
  const files: string[] = [];
  const candidateDirs = [
    path.join(projectPath, 'conversations'),
    projectPath,
  ];

  for (const dir of candidateDirs) {
    if (!(await isDirectoryAccessible(dir))) {
      continue;
    }

    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      if (entry.endsWith('.jsonl')) {
        files.push(path.join(dir, entry));
      }
    }
  }

  return files;
}

/**
 * Counts JSONL files stored for the project regardless of directory structure
 */
async function countConversationFiles(projectPath: string): Promise<number> {
  try {
    const files = await listSessionFilePaths(projectPath);
    return files.length;
  } catch {
    // Return 0 if directories don't exist or are inaccessible
    return 0;
  }
}

/**
 * Gets the most recent activity timestamp from conversation files
 */
async function getLastActivity(projectPath: string): Promise<string | undefined> {
  try {
    const files = await listSessionFilePaths(projectPath);
    if (files.length === 0) {
      return undefined;
    }

    let latestTime = 0;

    for (const filePath of files) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.mtime.getTime() > latestTime) {
          latestTime = stats.mtime.getTime();
        }
      } catch {
        // Skip files that can't be accessed
        continue;
      }
    }

    return latestTime > 0 ? new Date(latestTime).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

export const projectService: ProjectService = {
  /**
   * Scans the Claude projects directory and returns list of project directory names
   */
  async scanProjectsDirectory(): Promise<string[]> {
    try {
      if (!(await isDirectoryAccessible(CLAUDE_PROJECTS_DIR))) {
        return [];
      }

      const entries = await fs.readdir(CLAUDE_PROJECTS_DIR);
      const projectDirs: string[] = [];

      for (const entry of entries) {
        const entryPath = path.join(CLAUDE_PROJECTS_DIR, entry);
        if (await isDirectoryAccessible(entryPath)) {
          projectDirs.push(entry);
        }
      }

      return projectDirs.sort();
    } catch (error) {
      console.error('Failed to scan projects directory:', error);
      return [];
    }
  },

  /**
   * Extracts metadata for a specific project
   */
  async extractProjectMetadata(projectPath: string): Promise<ProjectMeta> {
    const validatedPath = validateProjectPath(projectPath);
    const projectName = path.basename(validatedPath);

    try {
      const stats = await fs.stat(validatedPath);
      const sessionCount = await countConversationFiles(validatedPath);
      const lastActivity = await getLastActivity(validatedPath);

      // Try to read meta.json for additional metadata
      const metaData = await readProjectMeta(validatedPath);
      const description = (typeof metaData?.description === 'string' && metaData.description.trim().length > 0)
        ? metaData.description.trim()
        : undefined;

      return {
        name: metaData?.name || projectName,
        path: validatedPath,
        lastModified: stats.mtime.toISOString(),
        sessionCount,
        lastActivity,
        description,
      };
    } catch (error) {
      console.error(`Failed to extract metadata for project ${projectName}:`, error);

      // Return minimal metadata on error
      return {
        name: projectName,
        path: validatedPath,
        lastModified: new Date().toISOString(),
        sessionCount: 0,
      };
    }
  },

  /**
   * Lists all projects with their metadata
   */
  async listProjects(): Promise<Project[]> {
    try {
      const projectDirs = await this.scanProjectsDirectory();
      const projects: Project[] = [];

      for (const projectDir of projectDirs) {
        try {
          const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
          const meta = await this.extractProjectMetadata(projectPath);

          const project: Project = {
            id: projectDir,
            name: meta.name,
            path: meta.path,
            meta,
            sessions: [], // Sessions will be populated by sessionService
            lastModified: meta.lastModified,
            sessionCount: meta.sessionCount,
            lastActivity: meta.lastActivity,
            description: meta.description,
            hasValidMeta: await readProjectMeta(projectPath) !== null,
          };

          projects.push(project);
        } catch (error) {
          console.error(`Failed to process project ${projectDir}:`, error);
          // Continue processing other projects even if one fails
        }
      }

      // Sort by last modified date (most recent first)
      return projects.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  },

  /**
   * Gets a specific project by ID
   */
  async getProject(projectId: string): Promise<Project | undefined> {
    try {
      const projects = await this.listProjects();
      return projects.find(project => project.id === projectId);
    } catch (error) {
      console.error(`Failed to get project ${projectId}:`, error);
      return undefined;
    }
  },
};

export const mockProjectService = projectService;
