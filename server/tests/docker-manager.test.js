/**
 * Docker Environment Manager Tests
 * 测试基于Docker的环境隔离功能
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import DockerEnvironmentManager from '../devbox/docker-manager.js';
import devboxIntegration from '../devbox/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Docker Environment Manager', () => {
  let dockerManager;
  let testUserId = 999;
  let createdEnvironments = [];

  beforeAll(async () => {
    // 检查Docker是否可用
    try {
      await execAsync('docker --version');
      console.log('✅ Docker is available for testing');
    } catch (error) {
      console.log('⚠️ Docker not available, skipping Docker tests');
      return;
    }

    // 检查claudecode:latest镜像是否存在
    try {
      await execAsync('docker image inspect claudecode:latest');
      console.log('✅ claudecode:latest image found');
    } catch (error) {
      console.log('⚠️ claudecode:latest image not found, creating a test image...');
      // 创建一个简单的测试镜像
      await execAsync('docker pull alpine:latest');
      await execAsync('docker tag alpine:latest claudecode:latest');
      console.log('✅ Created test image: claudecode:latest');
    }

    dockerManager = new DockerEnvironmentManager();
    await dockerManager.init();
  });

  afterAll(async () => {
    if (!dockerManager) return;

    // 清理测试环境
    for (const env of createdEnvironments) {
      try {
        await dockerManager.destroyEnvironment(testUserId, env.id);
      } catch (error) {
        console.log('Cleanup error:', error.message);
      }
    }

    // 清理Docker资源
    await dockerManager.cleanup();
    console.log('🧹 Test cleanup completed');
  });

  beforeEach(() => {
    createdEnvironments = [];
  });

  describe('Environment Creation', () => {
    it('should create a new Docker environment for a user', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const environment = await dockerManager.createUserEnvironment(testUserId, 'default');
      createdEnvironments.push(environment);

      expect(environment).toBeDefined();
      expect(environment.userId).toBe(testUserId);
      expect(environment.template).toBe('default');
      expect(environment.status).toBe('running');
      expect(environment.containerName).toMatch(/^claude-env-user-999-/);
      expect(environment.volumeName).toMatch(/^claude-user-user-999-/);
    });

    it('should create environments with different templates', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const pythonEnv = await dockerManager.createUserEnvironment(testUserId, 'python');
      createdEnvironments.push(pythonEnv);

      expect(pythonEnv.template).toBe('python');
      expect(pythonEnv.status).toBe('running');
    });

    it('should allocate unique ports for each user', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const env1 = await dockerManager.createUserEnvironment(testUserId, 'default');
      const env2 = await dockerManager.createUserEnvironment(testUserId + 1, 'default');
      
      createdEnvironments.push(env1, env2);

      expect(env1.ports.claude).not.toBe(env2.ports.claude);
      expect(env1.ports.terminal).not.toBe(env2.ports.terminal);
    });
  });

  describe('Environment Management', () => {
    it('should execute commands in environment', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const environment = await dockerManager.createUserEnvironment(testUserId, 'default');
      createdEnvironments.push(environment);

      // 等待容器完全启动
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await dockerManager.executeInEnvironment(testUserId, environment.id, 'echo "Hello Docker"');
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Hello Docker');
    });

    it('should get environment status', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const environment = await dockerManager.createUserEnvironment(testUserId, 'default');
      createdEnvironments.push(environment);

      const status = await dockerManager.getEnvironmentStatus(testUserId, environment.id);
      
      expect(status).toBeDefined();
      expect(status.dockerStatus).toMatch(/running|created/);
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should stop and start environment', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const environment = await dockerManager.createUserEnvironment(testUserId, 'default');
      createdEnvironments.push(environment);

      // 停止环境
      const stopResult = await dockerManager.stopEnvironment(testUserId, environment.id);
      expect(stopResult).toBe(true);

      // 检查状态
      const stoppedStatus = await dockerManager.getEnvironmentStatus(testUserId, environment.id);
      expect(stoppedStatus.dockerStatus).toBe('exited');

      // 重新启动
      const startResult = await dockerManager.startEnvironment(testUserId, environment.id);
      expect(startResult).toBe(true);
    });

    it('should destroy environment completely', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const environment = await dockerManager.createUserEnvironment(testUserId, 'default');
      
      const destroyResult = await dockerManager.destroyEnvironment(testUserId, environment.id);
      expect(destroyResult).toBe(true);

      // 验证环境已被删除
      const userEnvs = dockerManager.getUserEnvironments(testUserId);
      expect(userEnvs.find(env => env.id === environment.id)).toBeUndefined();
    });
  });

  describe('User Environment Isolation', () => {
    it('should isolate environments between different users', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      // 使用不同的用户ID来避免与之前的测试冲突
      const isolationUser1 = testUserId + 100;
      const isolationUser2 = testUserId + 101;
      
      const user1Env = await dockerManager.createUserEnvironment(isolationUser1, 'default');
      const user2Env = await dockerManager.createUserEnvironment(isolationUser2, 'default');
      
      createdEnvironments.push(user1Env, user2Env);

      // 用户1不应该能访问用户2的环境
      const user1Envs = dockerManager.getUserEnvironments(isolationUser1);
      const user2Envs = dockerManager.getUserEnvironments(isolationUser2);

      expect(user1Envs).toHaveLength(1);
      expect(user2Envs).toHaveLength(1);
      expect(user1Envs[0].id).not.toBe(user2Envs[0].id);
    });

    it('should use different volumes for different users', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const user1Env = await dockerManager.createUserEnvironment(testUserId, 'default');
      const user2Env = await dockerManager.createUserEnvironment(testUserId + 1, 'default');
      
      createdEnvironments.push(user1Env, user2Env);

      expect(user1Env.volumeName).not.toBe(user2Env.volumeName);
      expect(user1Env.workspaceDir).not.toBe(user2Env.workspaceDir);
    });
  });

  describe('System Statistics', () => {
    it('should provide accurate system statistics', async () => {
      if (!dockerManager) {
        console.log('⚠️ Skipping test - Docker not available');
        return;
      }

      const env1 = await dockerManager.createUserEnvironment(testUserId, 'default');
      const env2 = await dockerManager.createUserEnvironment(testUserId, 'python');
      
      createdEnvironments.push(env1, env2);

      const stats = await dockerManager.getSystemStats();
      
      expect(stats.totalEnvironments).toBeGreaterThanOrEqual(2);
      expect(stats.runningEnvironments).toBeGreaterThanOrEqual(2);
      expect(stats.totalUsers).toBeGreaterThanOrEqual(1);
      expect(stats.environments).toBeInstanceOf(Array);
    });
  });
});

describe('Devbox Integration', () => {
  let testUserId = 998;
  let createdEnvironments = [];

  afterAll(async () => {
    // 清理测试环境
    for (const env of createdEnvironments) {
      try {
        await devboxIntegration.destroyUserEnvironment(testUserId, env.id);
      } catch (error) {
        console.log('Cleanup error:', error.message);
      }
    }
  });

  describe('Quota Management', () => {
    it('should check user quota before creating environment', async () => {
      // 这个测试需要数据库支持，暂时跳过
      console.log('⚠️ Skipping quota test - requires database setup');
    });

    it('should enforce resource limits based on user role', async () => {
      const limits = devboxIntegration.getUserResourceLimits('user');
      
      expect(limits.cpuLimit).toBe('1.0');
      expect(limits.memoryLimit).toBe('2g');
      expect(limits.storageLimit).toBe('10g');
    });
  });

  describe('Security', () => {
    it('should block dangerous commands', async () => {
      const dangerousCommands = [
        'rm -rf /',
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda1',
        'shutdown -h now',
        'kill -9 1'
      ];

      for (const cmd of dangerousCommands) {
        const isDangerous = devboxIntegration.isDangerousCommand(cmd);
        expect(isDangerous).toBe(true);
      }
    });

    it('should allow safe commands', async () => {
      const safeCommands = [
        'ls -la',
        'python script.py',
        'npm install',
        'git status',
        'echo "hello world"'
      ];

      for (const cmd of safeCommands) {
        const isDangerous = devboxIntegration.isDangerousCommand(cmd);
        expect(isDangerous).toBe(false);
      }
    });
  });
});