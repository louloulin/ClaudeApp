/**
 * Devbox Integration Module
 * 集成Docker环境管理器到Claude Code UI多租户系统
 */

import DockerEnvironmentManager from './docker-manager.js';
import { userDb } from '../database/db.js';

class DevboxIntegration {
  constructor() {
    this.dockerManager = new DockerEnvironmentManager();
    this.userQuotas = new Map(); // userId -> quota info
  }

  async init() {
    console.log('🔧 Initializing Devbox Integration...');
    await this.dockerManager.init();
    console.log('✅ Devbox Integration initialized');
  }

  /**
   * 为用户创建环境（带配额检查）
   */
  async createUserEnvironment(userId, template = 'default', options = {}) {
    // 检查用户配额
    const canCreate = await this.checkUserQuota(userId);
    if (!canCreate) {
      throw new Error('User has reached environment quota limit');
    }

    // 获取用户信息
    const user = await userDb.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 根据用户角色设置资源限制
    const resourceLimits = this.getUserResourceLimits(user.role);
    const envOptions = {
      ...resourceLimits,
      ...options
    };

    // 创建环境
    const environment = await this.dockerManager.createUserEnvironment(userId, template, envOptions);
    
    // 更新用户配额使用情况
    await this.updateUserQuotaUsage(userId, 1);
    
    console.log(`🎉 Created environment for user ${userId}: ${environment.id}`);
    return environment;
  }

  /**
   * 检查用户配额
   */
  async checkUserQuota(userId) {
    const user = await userDb.getUserById(userId);
    if (!user) return false;

    const currentEnvs = this.dockerManager.getUserEnvironments(userId);
    const activeEnvs = currentEnvs.filter(env => env.status === 'running');
    
    const quotaLimits = this.getQuotaLimits(user.role);
    
    return activeEnvs.length < quotaLimits.maxEnvironments;
  }

  /**
   * 获取配额限制
   */
  getQuotaLimits(role) {
    const quotas = {
      'admin': {
        maxEnvironments: 10,
        cpuLimit: '4.0',
        memoryLimit: '8g',
        storageLimit: '50g'
      },
      'premium': {
        maxEnvironments: 5,
        cpuLimit: '2.0',
        memoryLimit: '4g',
        storageLimit: '20g'
      },
      'user': {
        maxEnvironments: 2,
        cpuLimit: '1.0',
        memoryLimit: '2g',
        storageLimit: '10g'
      }
    };
    
    return quotas[role] || quotas['user'];
  }

  /**
   * 获取用户资源限制
   */
  getUserResourceLimits(role) {
    const limits = this.getQuotaLimits(role);
    return {
      cpuLimit: limits.cpuLimit,
      memoryLimit: limits.memoryLimit,
      storageLimit: limits.storageLimit
    };
  }

  /**
   * 更新用户配额使用情况
   */
  async updateUserQuotaUsage(userId, delta) {
    if (!this.userQuotas.has(userId)) {
      this.userQuotas.set(userId, { environmentsUsed: 0 });
    }
    
    const quota = this.userQuotas.get(userId);
    quota.environmentsUsed += delta;
    quota.lastUpdated = new Date();
  }

  /**
   * 执行命令（带权限检查）
   */
  async executeCommand(userId, envId, command) {
    // 检查用户是否有权限访问该环境
    const environment = this.dockerManager.getUserEnvironment(userId, envId);
    if (!environment) {
      throw new Error('Environment not found or access denied');
    }

    // 安全检查：过滤危险命令
    if (this.isDangerousCommand(command)) {
      throw new Error('Command not allowed for security reasons');
    }

    return await this.dockerManager.executeInEnvironment(userId, envId, command);
  }

  /**
   * 检查是否为危险命令
   */
  isDangerousCommand(command) {
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,  // rm -rf /
      /dd\s+if=/,       // dd if=
      /mkfs/,           // mkfs
      /fdisk/,          // fdisk
      /shutdown/,       // shutdown
      /reboot/,         // reboot
      /halt/,           // halt
      /init\s+0/,       // init 0
      /kill\s+-9\s+1/,  // kill -9 1
      /:\(\)\{\s*:\|:&\s*\};:/ // fork bomb
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(command));
  }

  /**
   * 获取用户环境列表
   */
  async getUserEnvironments(userId) {
    const environments = this.dockerManager.getUserEnvironments(userId);
    
    // 获取每个环境的详细状态
    const detailedEnvs = await Promise.all(
      environments.map(async (env) => {
        const status = await this.dockerManager.getEnvironmentStatus(userId, env.id);
        return status || env;
      })
    );
    
    return detailedEnvs;
  }

  /**
   * 停止用户环境
   */
  async stopUserEnvironment(userId, envId) {
    const environment = this.dockerManager.getUserEnvironment(userId, envId);
    if (!environment) {
      throw new Error('Environment not found');
    }
    
    const result = await this.dockerManager.stopEnvironment(userId, envId);
    if (result) {
      console.log(`⏹️ User ${userId} stopped environment ${envId}`);
    }
    
    return result;
  }

  /**
   * 启动用户环境
   */
  async startUserEnvironment(userId, envId) {
    const environment = this.dockerManager.getUserEnvironment(userId, envId);
    if (!environment) {
      throw new Error('Environment not found');
    }
    
    const result = await this.dockerManager.startEnvironment(userId, envId);
    if (result) {
      console.log(`▶️ User ${userId} started environment ${envId}`);
    }
    
    return result;
  }

  /**
   * 删除用户环境
   */
  async destroyUserEnvironment(userId, envId) {
    const environment = this.dockerManager.getUserEnvironment(userId, envId);
    if (!environment) {
      return false;
    }
    
    const result = await this.dockerManager.destroyEnvironment(userId, envId);
    if (result) {
      // 更新配额使用情况
      await this.updateUserQuotaUsage(userId, -1);
      console.log(`🗑️ User ${userId} destroyed environment ${envId}`);
    }
    
    return result;
  }

  /**
   * 获取用户配额信息
   */
  async getUserQuotaInfo(userId) {
    const user = await userDb.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const quotaLimits = this.getQuotaLimits(user.role);
    const currentEnvs = this.dockerManager.getUserEnvironments(userId);
    const activeEnvs = currentEnvs.filter(env => env.status === 'running');
    
    return {
      role: user.role,
      limits: quotaLimits,
      usage: {
        environments: {
          used: activeEnvs.length,
          total: currentEnvs.length,
          limit: quotaLimits.maxEnvironments
        }
      },
      canCreateNew: activeEnvs.length < quotaLimits.maxEnvironments
    };
  }

  /**
   * 获取系统统计信息（管理员功能）
   */
  async getSystemStats() {
    const dockerStats = await this.dockerManager.getSystemStats();
    
    return {
      ...dockerStats,
      quotaInfo: Object.fromEntries(this.userQuotas)
    };
  }

  /**
   * 清理用户所有环境
   */
  async cleanupUserEnvironments(userId) {
    const environments = this.dockerManager.getUserEnvironments(userId);
    
    for (const env of environments) {
      await this.dockerManager.destroyEnvironment(userId, env.id);
    }
    
    // 重置配额使用情况
    this.userQuotas.delete(userId);
    
    console.log(`🧹 Cleaned up all environments for user ${userId}`);
  }

  /**
   * 系统关闭时的清理
   */
  async shutdown() {
    console.log('🛑 Shutting down Devbox Integration...');
    await this.dockerManager.cleanup();
    console.log('✅ Devbox Integration shutdown complete');
  }
}

// 创建单例实例
const devboxIntegration = new DevboxIntegration();

export default devboxIntegration;
export { DevboxIntegration };