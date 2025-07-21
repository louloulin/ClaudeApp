import { beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

// Set up test environment
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  
  // Use temporary directory for test database
  const testDbDir = path.join(os.tmpdir(), 'claude-ui-test-db');
  await fs.mkdir(testDbDir, { recursive: true });
  
  // Override database path for tests
  process.env.TEST_DB_PATH = path.join(testDbDir, 'test-auth.db');
  
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  // Clean up test database
  if (process.env.TEST_DB_PATH) {
    try {
      await fs.unlink(process.env.TEST_DB_PATH);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  console.log('🧹 Test environment cleaned up');
});
