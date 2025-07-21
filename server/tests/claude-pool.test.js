import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import claudeInstancePool from '../claude-pool.js';
import { initializeDatabase, userDb, resourceDb } from '../database/db.js';

describe('Claude Instance Pool', () => {
  let testUserId1, testUserId2;
  let originalWorkspacesDir;

  beforeEach(async () => {
    // Set up test workspace directory
    originalWorkspacesDir = process.env.USER_WORKSPACES_DIR;
    process.env.USER_WORKSPACES_DIR = path.join(os.tmpdir(), 'claude-ui-test-workspaces');

    // Initialize test database
    await initializeDatabase();

    // Create test users with unique identifiers
    const timestamp = Date.now();
    const user1 = userDb.createUser(`testuser1_${timestamp}`, 'hashedpassword1', `test1_${timestamp}@example.com`, 'user');
    const user2 = userDb.createUser(`testuser2_${timestamp}`, 'hashedpassword2', `test2_${timestamp}@example.com`, 'user');
    testUserId1 = user1.id;
    testUserId2 = user2.id;

    // Initialize the pool
    await claudeInstancePool.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await claudeInstancePool.shutdown();
    
    // Restore original workspace directory
    if (originalWorkspacesDir) {
      process.env.USER_WORKSPACES_DIR = originalWorkspacesDir;
    } else {
      delete process.env.USER_WORKSPACES_DIR;
    }
    
    // Clean up test workspace
    try {
      await fs.rm(path.join(os.tmpdir(), 'claude-ui-test-workspaces'), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Instance Creation', () => {
    it('should create a new Claude instance for a user', async () => {
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      
      expect(instance).toBeDefined();
      expect(instance.userId).toBe(testUserId1);
      expect(instance.id).toMatch(/^claude-\d+-\d+$/);
      expect(instance.status).toBe('active');
      expect(instance.workspace).toContain(`user-${testUserId1}`);
      
      // Check if workspace directory exists
      const workspaceExists = await fs.access(instance.workspace).then(() => true).catch(() => false);
      expect(workspaceExists).toBe(true);
    });

    it('should reuse existing instance for the same user', async () => {
      const instance1 = await claudeInstancePool.getOrCreateInstance(testUserId1);
      const instance2 = await claudeInstancePool.getOrCreateInstance(testUserId1);
      
      expect(instance1.id).toBe(instance2.id);
      expect(instance1.workspace).toBe(instance2.workspace);
    });

    it('should create separate instances for different users', async () => {
      const instance1 = await claudeInstancePool.getOrCreateInstance(testUserId1);
      const instance2 = await claudeInstancePool.getOrCreateInstance(testUserId2);
      
      expect(instance1.id).not.toBe(instance2.id);
      expect(instance1.workspace).not.toBe(instance2.workspace);
      expect(instance1.userId).toBe(testUserId1);
      expect(instance2.userId).toBe(testUserId2);
    });
  });

  describe('Workspace Management', () => {
    it('should create user workspace with proper structure', async () => {
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      const workspace = instance.workspace;
      
      // Check main workspace directory
      const workspaceStats = await fs.stat(workspace);
      expect(workspaceStats.isDirectory()).toBe(true);
      
      // Check projects subdirectory
      const projectsDir = path.join(workspace, 'projects');
      const projectsStats = await fs.stat(projectsDir);
      expect(projectsStats.isDirectory()).toBe(true);
      
      // Check README file
      const readmeFile = path.join(workspace, 'README.md');
      const readmeExists = await fs.access(readmeFile).then(() => true).catch(() => false);
      expect(readmeExists).toBe(true);
      
      const readmeContent = await fs.readFile(readmeFile, 'utf8');
      expect(readmeContent).toContain('Welcome to Your Claude Code Workspace');
    });

    it('should not recreate README if it already exists', async () => {
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      const readmeFile = path.join(instance.workspace, 'README.md');
      
      // Modify the README
      const customContent = 'Custom README content';
      await fs.writeFile(readmeFile, customContent);
      
      // Get instance again (should not overwrite README)
      await claudeInstancePool.getOrCreateInstance(testUserId1);
      
      const readmeContent = await fs.readFile(readmeFile, 'utf8');
      expect(readmeContent).toBe(customContent);
    });
  });

  describe('Instance Statistics', () => {
    it('should return correct instance statistics', async () => {
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      const stats = claudeInstancePool.getInstanceStats(testUserId1);
      
      expect(stats).toBeDefined();
      expect(stats.id).toBe(instance.id);
      expect(stats.userId).toBe(testUserId1);
      expect(stats.status).toBe('active');
      expect(stats.activeProcesses).toBe(0);
      expect(stats.workspace).toBe(instance.workspace);
      expect(stats.health).toBeDefined();
      expect(stats.health.status).toBe('healthy');
    });

    it('should return null for non-existent user', () => {
      const stats = claudeInstancePool.getInstanceStats(99999);
      expect(stats).toBeNull();
    });

    it('should return all instances statistics', async () => {
      await claudeInstancePool.getOrCreateInstance(testUserId1);
      await claudeInstancePool.getOrCreateInstance(testUserId2);
      
      const allStats = claudeInstancePool.getAllInstancesStats();
      expect(allStats).toHaveLength(2);
      
      const userIds = allStats.map(stat => stat.userId);
      expect(userIds).toContain(testUserId1);
      expect(userIds).toContain(testUserId2);
    });
  });

  describe('Process Management', () => {
    it('should register and unregister processes', async () => {
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      const sessionId = 'test-session-123';
      const processInfo = { pid: 12345, command: 'claude' };
      
      // Register process
      claudeInstancePool.registerProcess(testUserId1, sessionId, processInfo);
      
      const stats = claudeInstancePool.getInstanceStats(testUserId1);
      expect(stats.activeProcesses).toBe(1);
      
      // Unregister process
      claudeInstancePool.unregisterProcess(testUserId1, sessionId);
      
      const updatedStats = claudeInstancePool.getInstanceStats(testUserId1);
      expect(updatedStats.activeProcesses).toBe(0);
    });
  });

  describe('Health Monitoring', () => {
    it('should mark instance as healthy initially', async () => {
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      
      expect(claudeInstancePool.isInstanceHealthy(instance.id)).toBe(true);
    });

    it('should perform health checks', async () => {
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      
      // Perform health check
      await claudeInstancePool.checkInstanceHealth(instance);
      
      const stats = claudeInstancePool.getInstanceStats(testUserId1);
      expect(stats.health.status).toBe('healthy');
      expect(stats.health.consecutiveFailures).toBe(0);
    });
  });

  describe('Instance Cleanup', () => {
    it('should destroy user instance', async () => {
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      const instanceId = instance.id;
      
      const destroyed = await claudeInstancePool.destroyUserInstance(testUserId1);
      expect(destroyed).toBe(true);
      
      // Instance should no longer exist
      const stats = claudeInstancePool.getInstanceStats(testUserId1);
      expect(stats).toBeNull();
      
      // Health status should be removed
      expect(claudeInstancePool.isInstanceHealthy(instanceId)).toBe(false);
    });

    it('should return false when destroying non-existent instance', async () => {
      const destroyed = await claudeInstancePool.destroyUserInstance(99999);
      expect(destroyed).toBe(false);
    });
  });

  describe('Quota Enforcement', () => {
    it('should respect user quotas', async () => {
      // Set very low quota for test user
      userDb.updateUserQuotas(testUserId1, { quota_claude_instances: 0 });
      
      // Should throw error due to quota exceeded
      await expect(claudeInstancePool.getOrCreateInstance(testUserId1))
        .rejects.toThrow('Claude instance quota exceeded');
    });

    it('should allow instance creation within quota', async () => {
      // Set reasonable quota
      userDb.updateUserQuotas(testUserId1, { quota_claude_instances: 5 });
      
      // Should succeed
      const instance = await claudeInstancePool.getOrCreateInstance(testUserId1);
      expect(instance).toBeDefined();
    });
  });
});
