#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Integration test script for conversation service
 * Tests performance, memory usage, and error handling
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Test data generation
function generateMockConversationEntry(type, index) {
  const timestamp = new Date(Date.now() + index * 1000).toISOString();
  
  const baseEntry = {
    type,
    timestamp,
    id: `entry-${index}`
  };

  switch (type) {
    case 'user':
      return {
        ...baseEntry,
        content: `User message ${index}: This is a test message with some content.`
      };
    
    case 'assistant':
      return {
        ...baseEntry,
        content: `Assistant response ${index}: Here's a detailed response with **markdown** and \`code snippets\`. This simulates a typical Claude response.`,
        metadata: {
          tokenCount: Math.floor(Math.random() * 500) + 100,
          duration: Math.floor(Math.random() * 3000) + 500
        }
      };
    
    case 'tool_use':
      return {
        ...baseEntry,
        content: `Tool use ${index}`,
        toolName: 'bash',
        parameters: {
          command: `ls -la /test/path${index}`,
          description: 'List directory contents'
        }
      };
    
    case 'tool_result':
      return {
        ...baseEntry,
        content: `Tool result ${index}: Command executed successfully`,
        toolUseId: `entry-${index - 1}`,
        isError: false
      };
    
    default:
      return baseEntry;
  }
}

function generateLargeJSONL(entryCount) {
  const types = ['user', 'assistant', 'tool_use', 'tool_result'];
  const lines = [];
  
  for (let i = 0; i < entryCount; i++) {
    const type = types[i % types.length];
    const entry = generateMockConversationEntry(type, i);
    lines.push(JSON.stringify(entry));
  }
  
  return lines.join('\n');
}

function generateMalformedJSONL() {
  return [
    '{"type": "user", "content": "Valid entry"}',
    '{"type": "user", "content": "Another valid entry", "timestamp": "2024-01-01T00:00:00Z"}',
    '{invalid json syntax',
    '{"type": "invalid_type", "content": "Invalid type"}',
    '',
    '{"type": "assistant"} // missing content',
    '{"type": "assistant", "content": "Valid assistant message", "timestamp": "2024-01-01T00:01:00Z"}'
  ].join('\n');
}

async function createTestFiles(testDir) {
  // Create test directory structure
  const conversationsDir = path.join(testDir, 'conversations');
  await fs.mkdir(conversationsDir, { recursive: true });
  
  // Small test file (normal case)
  const smallContent = generateLargeJSONL(50);
  await fs.writeFile(path.join(conversationsDir, 'test-small.jsonl'), smallContent);
  
  // Large test file (performance test)
  const largeContent = generateLargeJSONL(1000);
  await fs.writeFile(path.join(conversationsDir, 'test-large.jsonl'), largeContent);
  
  // Malformed test file (error handling)
  const malformedContent = generateMalformedJSONL();
  await fs.writeFile(path.join(conversationsDir, 'test-malformed.jsonl'), malformedContent);
  
  return {
    small: 'test-small',
    large: 'test-large', 
    malformed: 'test-malformed'
  };
}

async function runTests() {
  console.log('ｧｪ Starting conversation service integration tests...\n');
  
  // Set up test environment
  const testDir = path.join(os.tmpdir(), 'claude-conversation-test', Math.random().toString(36).substring(7));
  await fs.mkdir(testDir, { recursive: true });
  
  console.log(`刀 Test directory: ${testDir}`);
  
  const files = await createTestFiles(testDir);
  
  // Import conversation service dynamically
  const { conversationService } = await import('../lib/services/conversationService.ts');
  
  const results = {
    tests: [],
    passed: 0,
    failed: 0
  };
  
  function addResult(name, success, details) {
    results.tests.push({ name, success, details });
    if (success) {
      results.passed++;
      console.log(`笨・${name}`);
    } else {
      results.failed++;
      console.log(`笶・${name}: ${details}`);
    }
  }
  
  // Test 1: Small file parsing (basic functionality)
  try {
    console.log('\n統 Test 1: Basic conversation parsing...');
    const startTime = Date.now();
    
    // Temporarily override CLAUDE_PROJECTS_DIR for testing
    const originalEnv = process.env.CLAUDE_PROJECTS_DIR;
    process.env.CLAUDE_PROJECTS_DIR = testDir;
    
    const entries = await conversationService.parseConversationFile('.', files.small);
    const duration = Date.now() - startTime;
    
    addResult(
      'Small file parsing', 
      entries.length > 0 && duration < 5000, 
      `${entries.length} entries parsed in ${duration}ms`
    );
    
    // Test statistics calculation
    const stats = conversationService.getSessionStats(entries);
    addResult(
      'Statistics calculation',
      stats.totalEntries === entries.length,
      `Stats: ${stats.totalEntries} total, ${stats.userMessages} user, ${stats.assistantMessages} assistant`
    );
    
    process.env.CLAUDE_PROJECTS_DIR = originalEnv;
  } catch (error) {
    addResult('Small file parsing', false, error.message);
  }
  
  // Test 2: Large file performance
  try {
    console.log('\n笞｡ Test 2: Large file performance...');
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    process.env.CLAUDE_PROJECTS_DIR = testDir;
    const entries = await conversationService.parseConversationFile('.', files.large);
    const duration = Date.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed - startMemory;
    
    addResult(
      'Large file performance',
      duration < 5000 && memoryUsed < 50 * 1024 * 1024, // 5s load time, <50MB memory
      `${entries.length} entries in ${duration}ms, ${Math.round(memoryUsed / 1024 / 1024)}MB memory`
    );
    
    process.env.CLAUDE_PROJECTS_DIR = process.env.CLAUDE_PROJECTS_DIR;
  } catch (error) {
    addResult('Large file performance', false, error.message);
  }
  
  // Test 3: Malformed file handling
  try {
    console.log('\n孱・・Test 3: Malformed file handling...');
    process.env.CLAUDE_PROJECTS_DIR = testDir;
    
    const entries = await conversationService.parseConversationFile('.', files.malformed);
    
    // Should gracefully handle malformed entries and return valid ones
    addResult(
      'Malformed file handling',
      entries.length >= 2, // Should have at least 2 valid entries
      `${entries.length} valid entries extracted from malformed file`
    );
    
    process.env.CLAUDE_PROJECTS_DIR = process.env.CLAUDE_PROJECTS_DIR;
  } catch (error) {
    addResult('Malformed file handling', false, error.message);
  }
  
  // Test 4: Content sanitization
  try {
    console.log('\n孱・・Test 4: Content sanitization...');
    const maliciousContent = '<script>alert("xss")</script>Normal content<iframe src="evil"></iframe>';
    const sanitized = conversationService.sanitizeContent(maliciousContent);
    
    addResult(
      'Content sanitization',
      !sanitized.includes('<script>') && !sanitized.includes('<iframe>') && sanitized.includes('Normal content'),
      'XSS content properly removed'
    );
  } catch (error) {
    addResult('Content sanitization', false, error.message);
  }
  
  // Test 5: Invalid file paths
  try {
    console.log('\n白 Test 5: Path validation...');
    process.env.CLAUDE_PROJECTS_DIR = testDir;
    
    let errorThrown = false;
    try {
      await conversationService.parseConversationFile('../../../etc', 'passwd');
    } catch (error) {
      errorThrown = error.message.includes('outside Claude projects directory');
    }
    
    addResult(
      'Path validation',
      errorThrown,
      'Directory traversal properly prevented'
    );
    
    process.env.CLAUDE_PROJECTS_DIR = process.env.CLAUDE_PROJECTS_DIR;
  } catch (error) {
    addResult('Path validation', false, error.message);
  }
  
  // Cleanup
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`笞・・Failed to cleanup test directory: ${error.message}`);
  }
  
  // Print summary
  console.log('\n投 Test Results Summary:');
  console.log(`笨・Passed: ${results.passed}`);
  console.log(`笶・Failed: ${results.failed}`);
  console.log(`嶋 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n笶・Failed Tests:');
    results.tests.filter(t => !t.success).forEach(test => {
      console.log(`  - ${test.name}: ${test.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n脂 All tests passed!');
  }
}

if (require.main === module) {
  runTests().catch(error => {
    console.error('笶・Test runner failed:', error);
    process.exit(1);
  });
}
