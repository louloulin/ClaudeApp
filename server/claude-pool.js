import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { resourceDb, sessionDb } from './database/db.js';
import resourceMonitor from './resource-monitor.js';

class ClaudeInstancePool {
  constructor() {
    this.instances = new Map(); // userId -> claudeInstance
    this.maxInstancesPerUser = 5; // Maximum instances per user
    this.userWorkspaces = new Map(); // userId -> workspace path
    this.instanceHealth = new Map(); // instanceId -> health status
    this.healthCheckInterval = null;
    this.healthCheckIntervalMs = 60000; // Check health every minute
  }

  async initialize() {
    console.log('🏊 Initializing Claude Instance Pool...');
    
    // Ensure user workspaces directory exists
    const workspacesDir = process.env.USER_WORKSPACES_DIR || path.join(process.cwd(), 'user-workspaces');
    process.env.USER_WORKSPACES_DIR = workspacesDir;
    
    try {
      await fs.mkdir(workspacesDir, { recursive: true });
      console.log(`📁 User workspaces directory: ${workspacesDir}`);
    } catch (error) {
      console.error('❌ Failed to create user workspaces directory:', error);
      throw error;
    }

    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log('✅ Claude Instance Pool initialized');
  }

  // Get or create a Claude instance for a user
  async getOrCreateInstance(userId) {
    try {
      // Check user quotas first
      const quotaCheck = resourceDb.checkUserQuotas(userId);
      if (quotaCheck && quotaCheck.instances_exceeded) {
        throw new Error(`Claude instance quota exceeded. Limit: ${quotaCheck.quotas.instances}, Current: ${quotaCheck.usage.instances}`);
      }

      // Get existing instance if available
      if (this.instances.has(userId)) {
        const instance = this.instances.get(userId);
        if (this.isInstanceHealthy(instance.id)) {
          console.log(`♻️ Reusing existing Claude instance for user ${userId}`);
          return instance;
        } else {
          console.log(`🔄 Existing instance unhealthy, creating new one for user ${userId}`);
          await this.destroyUserInstance(userId);
        }
      }

      // Create new instance
      const instance = await this.createUserInstance(userId);
      this.instances.set(userId, instance);
      
      console.log(`🆕 Created new Claude instance for user ${userId}`);
      return instance;
    } catch (error) {
      console.error(`❌ Failed to get/create Claude instance for user ${userId}:`, error);
      throw error;
    }
  }

  // Create a new Claude instance for a user
  async createUserInstance(userId) {
    const instanceId = `claude-${userId}-${Date.now()}`;
    const userWorkspace = await this.ensureUserWorkspace(userId);
    
    const instance = {
      id: instanceId,
      userId: userId,
      workspace: userWorkspace,
      activeProcesses: new Map(), // sessionId -> process info
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'active', // active, inactive, terminated
      resourceUsage: {
        cpu: 0,
        memory: 0,
        processes: 0
      }
    };

    // Initialize health status
    this.instanceHealth.set(instanceId, {
      status: 'healthy',
      lastCheck: new Date(),
      consecutiveFailures: 0
    });

    // Store workspace mapping
    this.userWorkspaces.set(userId, userWorkspace);

    return instance;
  }

  // Ensure user workspace exists
  async ensureUserWorkspace(userId) {
    const workspacesDir = process.env.USER_WORKSPACES_DIR;
    const userWorkspace = path.join(workspacesDir, `user-${userId}`);
    
    try {
      await fs.mkdir(userWorkspace, { recursive: true });
      
      // Create default project structure
      const projectsDir = path.join(userWorkspace, 'projects');
      await fs.mkdir(projectsDir, { recursive: true });
      
      // Create a welcome file
      const welcomeFile = path.join(userWorkspace, 'README.md');
      const welcomeContent = `# Welcome to Your Claude Code Workspace

This is your personal workspace for Claude Code projects.

## Directory Structure
- \`projects/\` - Your Claude Code projects
- \`temp/\` - Temporary files
- \`uploads/\` - File uploads

## Getting Started
1. Create a new project or import an existing one
2. Start chatting with Claude to get coding assistance
3. All your work is automatically saved in this workspace

Happy coding! 🚀
`;
      
      try {
        await fs.access(welcomeFile);
      } catch {
        await fs.writeFile(welcomeFile, welcomeContent);
      }
      
      console.log(`📁 User workspace ready: ${userWorkspace}`);
      return userWorkspace;
    } catch (error) {
      console.error(`❌ Failed to create user workspace for user ${userId}:`, error);
      throw error;
    }
  }

  // Register a process with an instance
  registerProcess(userId, sessionId, processInfo) {
    const instance = this.instances.get(userId);
    if (instance) {
      instance.activeProcesses.set(sessionId, {
        ...processInfo,
        startTime: new Date()
      });
      instance.lastActivity = new Date();
      
      // Register with resource monitor
      if (processInfo.pid) {
        resourceMonitor.registerUserProcess(userId, processInfo.pid, 'claude');
      }
      
      console.log(`📝 Registered process ${processInfo.pid} for user ${userId}, session ${sessionId}`);
    }
  }

  // Unregister a process from an instance
  unregisterProcess(userId, sessionId) {
    const instance = this.instances.get(userId);
    if (instance && instance.activeProcesses.has(sessionId)) {
      const processInfo = instance.activeProcesses.get(sessionId);
      instance.activeProcesses.delete(sessionId);
      instance.lastActivity = new Date();
      
      // Unregister from resource monitor
      if (processInfo.pid) {
        resourceMonitor.unregisterUserProcess(userId, processInfo.pid);
      }
      
      console.log(`🗑️ Unregistered process ${processInfo.pid} for user ${userId}, session ${sessionId}`);
    }
  }

  // Get instance statistics
  getInstanceStats(userId) {
    const instance = this.instances.get(userId);
    if (!instance) {
      return null;
    }

    return {
      id: instance.id,
      userId: instance.userId,
      status: instance.status,
      activeProcesses: instance.activeProcesses.size,
      createdAt: instance.createdAt,
      lastActivity: instance.lastActivity,
      workspace: instance.workspace,
      health: this.instanceHealth.get(instance.id)
    };
  }

  // Get all instances statistics
  getAllInstancesStats() {
    const stats = [];
    for (const [userId, instance] of this.instances) {
      stats.push(this.getInstanceStats(userId));
    }
    return stats;
  }

  // Check if instance is healthy
  isInstanceHealthy(instanceId) {
    const health = this.instanceHealth.get(instanceId);
    if (!health) {
      return false; // Instance doesn't exist or has been destroyed
    }
    return health.status === 'healthy' && health.consecutiveFailures < 3;
  }

  // Destroy a user's instance
  async destroyUserInstance(userId) {
    const instance = this.instances.get(userId);
    if (!instance) {
      return false;
    }

    console.log(`🗑️ Destroying Claude instance for user ${userId}`);

    // Terminate all active processes
    for (const [sessionId, processInfo] of instance.activeProcesses) {
      if (processInfo.pid) {
        try {
          process.kill(processInfo.pid, 'SIGTERM');
          resourceMonitor.unregisterUserProcess(userId, processInfo.pid);
        } catch (error) {
          console.warn(`Failed to kill process ${processInfo.pid}:`, error.message);
        }
      }
    }

    // Clean up
    this.instances.delete(userId);
    this.instanceHealth.delete(instance.id);
    
    // Update instance status
    instance.status = 'terminated';

    return true;
  }

  // Start health monitoring
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      return;
    }

    console.log('🏥 Starting Claude instance health monitoring...');
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckIntervalMs);
  }

  // Stop health monitoring
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Stopped Claude instance health monitoring');
    }
  }

  // Perform health checks on all instances
  async performHealthChecks() {
    const instanceCount = this.instances.size;
    if (instanceCount === 0) {
      return;
    }

    console.log(`🏥 Performing health checks on ${instanceCount} instances...`);
    
    for (const [userId, instance] of this.instances) {
      await this.checkInstanceHealth(instance);
    }
  }

  // Check health of a specific instance
  async checkInstanceHealth(instance) {
    const health = this.instanceHealth.get(instance.id);
    if (!health) {
      return;
    }

    try {
      // Check if workspace is accessible
      await fs.access(instance.workspace);
      
      // Check if instance has been inactive for too long (2 hours)
      const inactiveTime = Date.now() - instance.lastActivity.getTime();
      const maxInactiveTime = 2 * 60 * 60 * 1000; // 2 hours
      
      if (inactiveTime > maxInactiveTime && instance.activeProcesses.size === 0) {
        console.log(`⏰ Instance ${instance.id} inactive for ${Math.round(inactiveTime / 60000)} minutes, marking for cleanup`);
        health.status = 'inactive';
        health.consecutiveFailures++;
      } else {
        health.status = 'healthy';
        health.consecutiveFailures = 0;
      }
      
      health.lastCheck = new Date();
      
    } catch (error) {
      console.warn(`❌ Health check failed for instance ${instance.id}:`, error.message);
      health.status = 'unhealthy';
      health.consecutiveFailures++;
      health.lastCheck = new Date();
      
      // If too many consecutive failures, destroy the instance
      if (health.consecutiveFailures >= 3) {
        console.log(`💀 Instance ${instance.id} has ${health.consecutiveFailures} consecutive failures, destroying...`);
        await this.destroyUserInstance(instance.userId);
      }
    }
  }

  // Cleanup inactive instances
  async cleanupInactiveInstances() {
    const instancesToCleanup = [];
    
    for (const [userId, instance] of this.instances) {
      const health = this.instanceHealth.get(instance.id);
      if (health && (health.status === 'inactive' || health.status === 'unhealthy')) {
        instancesToCleanup.push(userId);
      }
    }
    
    for (const userId of instancesToCleanup) {
      await this.destroyUserInstance(userId);
    }
    
    if (instancesToCleanup.length > 0) {
      console.log(`🧹 Cleaned up ${instancesToCleanup.length} inactive instances`);
    }
  }

  // Shutdown the pool
  async shutdown() {
    console.log('🛑 Shutting down Claude Instance Pool...');
    
    this.stopHealthMonitoring();
    
    // Destroy all instances
    const userIds = Array.from(this.instances.keys());
    for (const userId of userIds) {
      await this.destroyUserInstance(userId);
    }
    
    console.log('✅ Claude Instance Pool shutdown complete');
  }
}

// Create singleton instance
const claudeInstancePool = new ClaudeInstancePool();

export default claudeInstancePool;
