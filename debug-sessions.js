const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function debugSessions() {
  try {
    const projectId = '-mnt-d-repos-cc-tasks';
    const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
    const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectId);

    console.log('Project path:', projectPath);

    // Check if directory exists
    try {
      const stats = await fs.stat(projectPath);
      console.log('Directory exists:', stats.isDirectory());
    } catch (error) {
      console.log('Directory access error:', error.message);
      return;
    }

    // List files
    try {
      const files = await fs.readdir(projectPath);
      console.log('Total files:', files.length);

      const sessionFiles = files.filter(file => file.endsWith('.jsonl') && file !== 'meta.json');
      console.log('Total session files count:', sessionFiles.length);

      // Get file stats for all sessions to check recency
      const sessions = [];
      for (const file of sessionFiles) {
        try {
          const filePath = path.join(projectPath, file);
          const stats = await fs.stat(filePath);
          const sessionId = file.replace('.jsonl', '');

          sessions.push({
            id: sessionId,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            createdAt: stats.birthtime.toISOString()
          });
        } catch (fileError) {
          console.log(`Error with file ${file}:`, fileError.message);
        }
      }

      // Sort by last modified and filter recent sessions
      const sortedSessions = sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentSessions = sortedSessions.filter(session =>
        new Date(session.lastModified).getTime() > twentyFourHoursAgo
      );

      console.log('Recent sessions (24h):', recentSessions.length);
      console.log('Will monitor (top 10):', Math.min(10, recentSessions.length));

      // Get stats for the first few sessions
      for (const file of sessionFiles.slice(0, 3)) {
        try {
          const filePath = path.join(projectPath, file);
          const stats = await fs.stat(filePath);
          const sessionId = file.replace('.jsonl', '');

          console.log(`Session ${sessionId}:`, {
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            createdAt: stats.birthtime.toISOString()
          });
        } catch (fileError) {
          console.log(`Error with file ${file}:`, fileError.message);
        }
      }

    } catch (readError) {
      console.log('Read directory error:', readError.message);
    }

  } catch (error) {
    console.log('General error:', error.message);
  }
}

debugSessions().then(() => {
  console.log('Debug complete');
}).catch(error => {
  console.log('Debug failed:', error.message);
});