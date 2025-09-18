/**
 * Integration tests for Claude Code Project Browser functionality
 * Tests end-to-end project discovery flow and performance
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { projectService } from '@/lib/services/projectService';
import { sessionService } from '@/lib/services/sessionService';
import { Project } from '@/lib/types/project';

const TEST_PROJECTS_DIR = path.join(os.tmpdir(), 'test-claude-projects');

// Mock the projects directory for testing
const originalProjectsDir = (projectService as any).CLAUDE_PROJECTS_DIR;

describe('Project Browser Integration Tests', () => {
  beforeAll(async () => {
    // Create test projects directory
    await fs.mkdir(TEST_PROJECTS_DIR, { recursive: true });
    
    // Mock the Claude projects directory
    Object.defineProperty(projectService, 'CLAUDE_PROJECTS_DIR', {
      value: TEST_PROJECTS_DIR,
      writable: true
    });
  });

  afterAll(async () => {
    // Cleanup test directory
    await fs.rm(TEST_PROJECTS_DIR, { recursive: true, force: true });
    
    // Restore original directory
    Object.defineProperty(projectService, 'CLAUDE_PROJECTS_DIR', {
      value: originalProjectsDir,
      writable: true
    });
  });

  beforeEach(async () => {
    // Clean up before each test
    const entries = await fs.readdir(TEST_PROJECTS_DIR).catch(() => []);
    for (const entry of entries) {
      await fs.rm(path.join(TEST_PROJECTS_DIR, entry), { recursive: true, force: true });
    }
  });

  describe('Project Discovery Flow', () => {
    test('should handle empty projects directory', async () => {
      const projects = await projectService.listProjects();
      expect(projects).toEqual([]);
    });

    test('should discover projects with basic metadata', async () => {
      // Create test project structure
      const projectPath = path.join(TEST_PROJECTS_DIR, 'test-project');
      await fs.mkdir(projectPath, { recursive: true });
      await fs.mkdir(path.join(projectPath, 'conversations'), { recursive: true });

      // Create meta.json
      const meta = {
        name: 'Test Project',
        description: 'A test project for integration testing'
      };
      await fs.writeFile(
        path.join(projectPath, 'meta.json'),
        JSON.stringify(meta, null, 2)
      );

      // Create test conversation file
      const conversationContent = [
        '{"type": "user", "content": "Hello", "timestamp": "2024-01-01T10:00:00Z"}',
        '{"type": "assistant", "content": "Hi there!", "timestamp": "2024-01-01T10:00:01Z"}'
      ].join('\n');
      
      await fs.writeFile(
        path.join(projectPath, 'conversations', 'session-1.jsonl'),
        conversationContent
      );

      const projects = await projectService.listProjects();
      
      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        id: 'test-project',
        name: 'Test Project',
        description: 'A test project for integration testing',
        sessionCount: 1,
        hasValidMeta: true
      });
      expect(projects[0].lastActivity).toBeDefined();
    });

    test('should handle projects without meta.json', async () => {
      const projectPath = path.join(TEST_PROJECTS_DIR, 'no-meta-project');
      await fs.mkdir(projectPath, { recursive: true });

      const projects = await projectService.listProjects();
      
      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        id: 'no-meta-project',
        name: 'no-meta-project',
        sessionCount: 0,
        hasValidMeta: false
      });
    });

    test('should handle corrupted project directories gracefully', async () => {
      // Create valid project
      const validPath = path.join(TEST_PROJECTS_DIR, 'valid-project');
      await fs.mkdir(validPath, { recursive: true });

      // Create file that looks like directory (should be ignored)
      await fs.writeFile(path.join(TEST_PROJECTS_DIR, 'not-a-directory'), 'content');

      // Create directory with invalid meta.json
      const invalidMetaPath = path.join(TEST_PROJECTS_DIR, 'invalid-meta');
      await fs.mkdir(invalidMetaPath, { recursive: true });
      await fs.writeFile(path.join(invalidMetaPath, 'meta.json'), 'invalid json{');

      const projects = await projectService.listProjects();
      
      expect(projects).toHaveLength(2);
      expect(projects.find(p => p.id === 'valid-project')).toBeDefined();
      expect(projects.find(p => p.id === 'invalid-meta')).toBeDefined();
      expect(projects.find(p => p.id === 'not-a-directory')).toBeUndefined();
    });
  });

  describe('Performance Validation', () => {
    test('should handle multiple projects efficiently', async () => {
      const startTime = Date.now();
      
      // Create 20 test projects
      const projectPromises = Array.from({ length: 20 }, async (_, i) => {
        const projectPath = path.join(TEST_PROJECTS_DIR, `project-${i}`);
        await fs.mkdir(projectPath, { recursive: true });
        await fs.mkdir(path.join(projectPath, 'conversations'), { recursive: true });

        // Create meta.json
        await fs.writeFile(
          path.join(projectPath, 'meta.json'),
          JSON.stringify({ name: `Project ${i}`, description: `Test project ${i}` })
        );

        // Create multiple conversation files
        for (let j = 0; j < 5; j++) {
          const content = `{"type": "user", "content": "Message ${j}", "timestamp": "2024-01-01T10:0${j}:00Z"}`;
          await fs.writeFile(
            path.join(projectPath, 'conversations', `session-${j}.jsonl`),
            content
          );
        }
      });

      await Promise.all(projectPromises);

      const projects = await projectService.listProjects();
      const endTime = Date.now();
      
      expect(projects).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify all projects have correct session counts
      projects.forEach(project => {
        expect(project.sessionCount).toBe(5);
      });
    });

    test('should handle large conversation files without memory issues', async () => {
      const projectPath = path.join(TEST_PROJECTS_DIR, 'large-project');
      await fs.mkdir(projectPath, { recursive: true });
      await fs.mkdir(path.join(projectPath, 'conversations'), { recursive: true });

      // Create large conversation file (simulating 1000 entries)
      const entries = Array.from({ length: 1000 }, (_, i) => 
        JSON.stringify({
          type: i % 2 === 0 ? 'user' : 'assistant',
          content: `This is message number ${i} with some content to make it realistic`,
          timestamp: new Date(Date.now() + i * 1000).toISOString()
        })
      );

      await fs.writeFile(
        path.join(projectPath, 'conversations', 'large-session.jsonl'),
        entries.join('\n')
      );

      const startTime = Date.now();
      const projects = await projectService.listProjects();
      const endTime = Date.now();

      expect(projects).toHaveLength(1);
      expect(projects[0].sessionCount).toBe(1);
      expect(endTime - startTime).toBeLessThan(2000); // Should be fast for metadata only
    });
  });

  describe('Error Handling', () => {
    test('should prevent directory traversal attacks', async () => {
      await expect(
        projectService.extractProjectMetadata('../../../etc/passwd')
      ).rejects.toThrow('Invalid project path: outside Claude projects directory');
    });

    test('should handle permission errors gracefully', async () => {
      // Create a project directory
      const projectPath = path.join(TEST_PROJECTS_DIR, 'permission-test');
      await fs.mkdir(projectPath, { recursive: true });

      // Mock fs.stat to throw permission error
      const originalStat = fs.stat;
      (fs as any).stat = jest.fn().mockRejectedValue(new Error('EACCES: permission denied'));

      try {
        const projects = await projectService.listProjects();
        expect(Array.isArray(projects)).toBe(true);
      } finally {
        (fs as any).stat = originalStat;
      }
    });

    test('should handle missing Claude projects directory', async () => {
      // Temporarily point to non-existent directory
      Object.defineProperty(projectService, 'CLAUDE_PROJECTS_DIR', {
        value: '/non/existent/path',
        writable: true
      });

      const projects = await projectService.listProjects();
      expect(projects).toEqual([]);

      // Restore test directory
      Object.defineProperty(projectService, 'CLAUDE_PROJECTS_DIR', {
        value: TEST_PROJECTS_DIR,
        writable: true
      });
    });
  });

  describe('Session Integration', () => {
    test('should integrate with session service for session metadata', async () => {
      const projectPath = path.join(TEST_PROJECTS_DIR, 'session-test');
      await fs.mkdir(projectPath, { recursive: true });
      await fs.mkdir(path.join(projectPath, 'conversations'), { recursive: true });

      // Create conversation file
      const conversationContent = [
        '{"type": "user", "content": "Test message", "timestamp": "2024-01-01T10:00:00Z"}',
        '{"type": "assistant", "content": "Test response", "timestamp": "2024-01-01T10:00:01Z"}'
      ].join('\n');
      
      await fs.writeFile(
        path.join(projectPath, 'conversations', 'test-session.jsonl'),
        conversationContent
      );

      const projects = await projectService.listProjects();
      expect(projects).toHaveLength(1);

      const project = projects[0];
      const sessions = await sessionService.listSessions(project.id);
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('test-session');
      expect(sessions[0].size).toBeGreaterThan(0);
      expect(sessions[0].lastModified).toBeDefined();
    });
  });

  describe('Navigation Flow', () => {
    test('should support complete project browsing workflow', async () => {
      // Setup test projects
      const projects = ['project-a', 'project-b', 'project-c'];
      
      for (const projectId of projects) {
        const projectPath = path.join(TEST_PROJECTS_DIR, projectId);
        await fs.mkdir(projectPath, { recursive: true });
        await fs.mkdir(path.join(projectPath, 'conversations'), { recursive: true });

        await fs.writeFile(
          path.join(projectPath, 'meta.json'),
          JSON.stringify({ name: `Project ${projectId.toUpperCase()}` })
        );

        // Create sessions
        for (let i = 1; i <= 3; i++) {
          await fs.writeFile(
            path.join(projectPath, 'conversations', `session-${i}.jsonl`),
            `{"type": "user", "content": "Session ${i} content", "timestamp": "2024-01-01T10:0${i}:00Z"}`
          );
        }
      }

      // Test complete workflow
      
      // 1. List all projects
      const allProjects = await projectService.listProjects();
      expect(allProjects).toHaveLength(3);

      // 2. Get specific project
      const specificProject = await projectService.getProject('project-a');
      expect(specificProject).toBeDefined();
      expect(specificProject?.name).toBe('Project PROJECT-A');

      // 3. List sessions for project
      const sessions = await sessionService.listSessions('project-a');
      expect(sessions).toHaveLength(3);

      // 4. Get session metadata
      const sessionMeta = await sessionService.getSessionMetadata('project-a', 'session-1');
      expect(sessionMeta).toBeDefined();
      expect(sessionMeta.id).toBe('session-1');
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory with repeated operations', async () => {
      // Create test project
      const projectPath = path.join(TEST_PROJECTS_DIR, 'memory-test');
      await fs.mkdir(projectPath, { recursive: true });
      await fs.mkdir(path.join(projectPath, 'conversations'), { recursive: true });

      // Perform repeated operations
      for (let i = 0; i < 100; i++) {
        await projectService.listProjects();
        
        if (i % 10 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      // Should complete without running out of memory
      const finalProjects = await projectService.listProjects();
      expect(Array.isArray(finalProjects)).toBe(true);
    });

    test('should handle concurrent access safely', async () => {
      // Create test project
      const projectPath = path.join(TEST_PROJECTS_DIR, 'concurrent-test');
      await fs.mkdir(projectPath, { recursive: true });

      // Perform concurrent operations
      const concurrentPromises = Array.from({ length: 10 }, () => 
        projectService.listProjects()
      );

      const results = await Promise.all(concurrentPromises);
      
      // All should succeed and return consistent results
      results.forEach(projects => {
        expect(Array.isArray(projects)).toBe(true);
        expect(projects.length).toBe(results[0].length);
      });
    });
  });
});

// Helper function to simulate user interaction flow
async function simulateUserFlow(projectId: string) {
  // 1. User visits projects page - loads all projects
  const projects = await projectService.listProjects();
  
  // 2. User clicks on specific project
  const project = projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  
  // 3. User navigates to project detail page - loads sessions
  const sessions = await sessionService.listSessions(projectId);
  
  // 4. User clicks on session to view content
  if (sessions.length > 0) {
    const sessionMeta = await sessionService.getSessionMetadata(projectId, sessions[0].id);
    return { project, sessions, sessionMeta };
  }
  
  return { project, sessions, sessionMeta: null };
}

describe('User Journey Integration', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_PROJECTS_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_PROJECTS_DIR, { recursive: true, force: true });
  });

  test('should support complete user journey from project list to session view', async () => {
    // Setup test project
    const projectPath = path.join(TEST_PROJECTS_DIR, 'journey-test');
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'conversations'), { recursive: true });

    await fs.writeFile(
      path.join(projectPath, 'meta.json'),
      JSON.stringify({ name: 'Journey Test Project' })
    );

    await fs.writeFile(
      path.join(projectPath, 'conversations', 'journey-session.jsonl'),
      '{"type": "user", "content": "Journey test", "timestamp": "2024-01-01T10:00:00Z"}'
    );

    // Simulate complete user journey
    const result = await simulateUserFlow('journey-test');
    
    expect(result.project.name).toBe('Journey Test Project');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessionMeta?.id).toBe('journey-session');
  });
});