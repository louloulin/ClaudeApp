import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { resourceDb } from './database/db.js';

class ResourceMonitor {
  constructor() {
    this.userProcesses = new Map(); // userId -> { processes: [], startTime: Date }
    this.monitoringInterval = null;
    this.updateInterval = 30000; // Update every 30 seconds
  }

  start() {
    console.log('🔍 Starting resource monitor...');
    this.monitoringInterval = setInterval(() => {
      this.updateAllUserResources();
    }, this.updateInterval);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Resource monitor stopped');
    }
  }

  // Register a process for a user
  registerUserProcess(userId, processId, processType = 'claude') {
    if (!this.userProcesses.has(userId)) {
      this.userProcesses.set(userId, {
        processes: [],
        startTime: new Date()
      });
    }

    const userProcesses = this.userProcesses.get(userId);
    userProcesses.processes.push({
      pid: processId,
      type: processType,
      startTime: new Date()
    });

    console.log(`📊 Registered process ${processId} for user ${userId}`);
  }

  // Unregister a process for a user
  unregisterUserProcess(userId, processId) {
    if (this.userProcesses.has(userId)) {
      const userProcesses = this.userProcesses.get(userId);
      userProcesses.processes = userProcesses.processes.filter(p => p.pid !== processId);
      
      // If no processes left, remove the user entry
      if (userProcesses.processes.length === 0) {
        this.userProcesses.delete(userId);
      }

      console.log(`📊 Unregistered process ${processId} for user ${userId}`);
    }
  }

  // Get CPU usage for a specific process
  async getProcessCpuUsage(pid) {
    try {
      // On Unix systems, read from /proc/[pid]/stat
      if (process.platform === 'linux') {
        const statPath = `/proc/${pid}/stat`;
        const statData = await fs.readFile(statPath, 'utf8');
        const statFields = statData.split(' ');
        
        // Fields 13 and 14 are utime and stime (user and system CPU time)
        const utime = parseInt(statFields[13]);
        const stime = parseInt(statFields[14]);
        const totalTime = utime + stime;
        
        // Convert to percentage (this is a simplified calculation)
        const cpuUsage = (totalTime / os.cpus().length) * 0.01; // Rough estimate
        return Math.min(cpuUsage, 100);
      } else {
        // For non-Linux systems, return a mock value
        // In production, you might want to use a library like 'pidusage'
        return Math.random() * 10; // Mock CPU usage
      }
    } catch (error) {
      // Process might have ended
      return 0;
    }
  }

  // Get memory usage for a specific process
  async getProcessMemoryUsage(pid) {
    try {
      if (process.platform === 'linux') {
        const statusPath = `/proc/${pid}/status`;
        const statusData = await fs.readFile(statusPath, 'utf8');
        const vmRSSMatch = statusData.match(/VmRSS:\s+(\d+)\s+kB/);
        
        if (vmRSSMatch) {
          return parseInt(vmRSSMatch[1]) / 1024; // Convert KB to MB
        }
      } else {
        // Mock memory usage for non-Linux systems
        return Math.random() * 500 + 100; // Mock 100-600 MB
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  // Get storage usage for a user's workspace
  async getUserStorageUsage(userId) {
    try {
      const userWorkspace = path.join(process.env.USER_WORKSPACES_DIR || './user-workspaces', userId.toString());
      
      // Check if workspace exists
      try {
        await fs.access(userWorkspace);
      } catch {
        return 0; // Workspace doesn't exist yet
      }

      return await this.getDirectorySize(userWorkspace);
    } catch (error) {
      console.error(`Error calculating storage for user ${userId}:`, error);
      return 0;
    }
  }

  // Recursively calculate directory size
  async getDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath);
        } else {
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Directory might not be accessible
      console.warn(`Cannot access directory ${dirPath}:`, error.message);
    }

    return Math.round(totalSize / (1024 * 1024)); // Convert to MB
  }

  // Update resource usage for a specific user
  async updateUserResourceUsage(userId) {
    try {
      let totalCpuUsage = 0;
      let totalMemoryUsage = 0;
      let activeProcesses = 0;

      if (this.userProcesses.has(userId)) {
        const userProcesses = this.userProcesses.get(userId);
        
        for (const process of userProcesses.processes) {
          try {
            const cpuUsage = await this.getProcessCpuUsage(process.pid);
            const memoryUsage = await this.getProcessMemoryUsage(process.pid);
            
            totalCpuUsage += cpuUsage;
            totalMemoryUsage += memoryUsage;
            activeProcesses++;
          } catch (error) {
            // Process might have ended, remove it
            console.warn(`Process ${process.pid} no longer exists, removing from monitoring`);
            this.unregisterUserProcess(userId, process.pid);
          }
        }
      }

      // Get storage usage
      const storageUsage = await this.getUserStorageUsage(userId);

      // Update database
      const usage = {
        cpu_usage: Math.round(totalCpuUsage * 100) / 100, // Round to 2 decimal places
        memory_usage: Math.round(totalMemoryUsage),
        storage_usage: storageUsage,
        active_claude_instances: activeProcesses
      };

      resourceDb.updateResourceUsage(userId, usage);

      return usage;
    } catch (error) {
      console.error(`Error updating resource usage for user ${userId}:`, error);
      return null;
    }
  }

  // Update resource usage for all users
  async updateAllUserResources() {
    try {
      const userIds = Array.from(this.userProcesses.keys());
      
      for (const userId of userIds) {
        await this.updateUserResourceUsage(userId);
      }

      console.log(`📊 Updated resource usage for ${userIds.length} users`);
    } catch (error) {
      console.error('Error updating all user resources:', error);
    }
  }

  // Get current system resource usage
  getSystemResourceUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    return {
      memory: {
        total: Math.round(totalMemory / (1024 * 1024 * 1024)), // GB
        used: Math.round(usedMemory / (1024 * 1024 * 1024)), // GB
        free: Math.round(freeMemory / (1024 * 1024 * 1024)), // GB
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      cpu: {
        cores: cpus.length,
        loadAverage: loadAverage.map(load => Math.round(load * 100) / 100),
        model: cpus[0]?.model || 'Unknown'
      },
      uptime: Math.round(os.uptime() / 3600), // Hours
      platform: os.platform(),
      arch: os.arch()
    };
  }

  // Check if user is exceeding quotas
  async checkUserQuotaViolations(userId) {
    try {
      const quotaCheck = resourceDb.checkUserQuotas(userId);
      
      if (quotaCheck) {
        const violations = [];
        
        if (quotaCheck.cpu_exceeded) {
          violations.push('CPU quota exceeded');
        }
        if (quotaCheck.memory_exceeded) {
          violations.push('Memory quota exceeded');
        }
        if (quotaCheck.storage_exceeded) {
          violations.push('Storage quota exceeded');
        }
        if (quotaCheck.instances_exceeded) {
          violations.push('Claude instances quota exceeded');
        }

        if (violations.length > 0) {
          console.warn(`⚠️ User ${userId} quota violations: ${violations.join(', ')}`);
          return violations;
        }
      }

      return [];
    } catch (error) {
      console.error(`Error checking quota violations for user ${userId}:`, error);
      return [];
    }
  }
}

// Create singleton instance
const resourceMonitor = new ResourceMonitor();

export default resourceMonitor;
