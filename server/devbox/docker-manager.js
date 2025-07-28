/**
 * Docker-based Environment Manager
 * 替代原有的Devbox方案，使用Docker容器实现用户环境隔离
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';

const execAsync = promisify(exec);

class DockerEnvironmentManager {
  constructor() {
    this.userContainers = new Map(); // userId -> containers[]
    this.baseImage = 'claudecode:latest';
    this.networkName = 'claude-multi-tenant';
    this.volumePrefix = 'claude-user';
    this.usedPorts = new Set(); // 跟踪已使用的端口
    this.portRange = { min: 20000, max: 30000 }; // 端口范围
    
    this.init();
  }

  async init() {
    console.log('🐳 Initializing Docker Environment Manager...');
    
    // 创建专用网络
    try {
      await this.createNetwork();
    } catch (error) {
      console.log('⚠️ Network already exists or creation failed:', error.message);
    }
    
    console.log('✅ Docker Environment Manager initialized');
  }

  async createNetwork() {
    const command = `docker network create ${this.networkName} --driver bridge`;
    await execAsync(command);
    console.log(`📡 Created Docker network: ${this.networkName}`);
  }

  /**
   * 为用户创建独立的Docker环境
   */
  async createUserEnvironment(userId, template = 'default', options = {}) {
    const envId = `user-${userId}-${Date.now()}`;
    const containerName = `claude-env-${envId}`;
    const volumeName = `${this.volumePrefix}-${envId}`;
    const workspaceDir = `/workspace/user-${userId}`;
    
    try {
      // 分配端口
      const ports = await this.allocatePorts(userId);
      
      // 创建数据卷
      await this.createVolume(volumeName);
      
      // 构建容器启动命令
      const dockerCommand = this.buildDockerCommand({
        containerName,
        volumeName,
        workspaceDir,
        userId,
        template,
        ports,
        ...options
      });
      
      // 启动容器
      console.log(`🚀 Creating Docker environment for user ${userId}...`);
      await execAsync(dockerCommand);
      
      // 初始化工作空间
      await this.initializeWorkspace(containerName, workspaceDir, template);
      
      const environment = {
        id: envId,
        userId,
        containerName,
        volumeName,
        workspaceDir,
        template,
        status: 'running',
        createdAt: new Date(),
        ports,
        resources: {
          cpuLimit: options.cpuLimit || '1.0',
          memoryLimit: options.memoryLimit || '1g',
          storageLimit: options.storageLimit || '10g'
        }
      };
      
      // 存储环境信息
      if (!this.userContainers.has(userId)) {
        this.userContainers.set(userId, []);
      }
      this.userContainers.get(userId).push(environment);
      
      console.log(`✅ Docker environment created: ${containerName}`);
      return environment;
      
    } catch (error) {
      console.error(`❌ Failed to create environment for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 构建Docker启动命令
   */
  buildDockerCommand({ containerName, volumeName, workspaceDir, userId, template, ports, cpuLimit = '1.0', memoryLimit = '1g' }) {
    return `docker run -d \
      --name ${containerName} \
      --network ${this.networkName} \
      --cpus="${cpuLimit}" \
      --memory="${memoryLimit}" \
      --mount source=${volumeName},target=${workspaceDir} \
      --workdir ${workspaceDir} \
      -p ${ports.claude}:8080 \
      -p ${ports.terminal}:3000 \
      -e USER_ID=${userId} \
      -e WORKSPACE_DIR=${workspaceDir} \
      -e TEMPLATE=${template} \
      -e CLAUDEBOX_PROJECT_NAME=claude-code-env \
      --restart unless-stopped \
      ${this.baseImage} \
      tail -f /dev/null`;
  }

  /**
   * 为用户分配端口
   */
  async allocatePorts(userId) {
    const ports = {};
    const portTypes = ['claude', 'terminal', 'jupyter', 'web'];
    
    for (const type of portTypes) {
      ports[type] = await this.findAvailablePort();
    }
    
    return ports;
  }

  /**
   * 查找可用端口
   */
  async findAvailablePort() {
    const net = require('net');
    
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in range');
  }

  /**
   * 检查端口是否可用
   */
  isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * 释放端口
   */
  releasePorts(ports) {
    if (ports && typeof ports === 'object') {
      Object.values(ports).forEach(port => {
        if (typeof port === 'number') {
          this.usedPorts.delete(port);
        }
      });
    }
  }

  /**
   * 创建Docker数据卷
   */
  async createVolume(volumeName) {
    const command = `docker volume create ${volumeName}`;
    await execAsync(command);
    console.log(`💾 Created Docker volume: ${volumeName}`);
  }

  /**
   * 初始化工作空间
   */
  async initializeWorkspace(containerName, workspaceDir, template) {
    const initCommands = this.getTemplateInitCommands(template);
    
    for (const command of initCommands) {
      await this.executeInContainer(containerName, command);
    }
    
    // 创建基础目录结构
    await this.executeInContainer(containerName, `mkdir -p ${workspaceDir}/{projects,temp,logs}`);
    
    // 创建README文件
    const readmeContent = this.generateReadmeContent(template);
    await this.executeInContainer(containerName, 
      `echo '${readmeContent}' > ${workspaceDir}/README.md`
    );
  }

  /**
   * 获取模板初始化命令
   */
  getTemplateInitCommands(template) {
    const templates = {
      'python': [
        'python3 -m pip install --upgrade pip',
        'pip install jupyter notebook pandas numpy matplotlib'
      ],
      'nodejs': [
        'npm install -g npm@latest',
        'npm install -g typescript ts-node nodemon'
      ],
      'go': [
        'go version',
        'go mod init workspace'
      ],
      'rust': [
        'rustc --version',
        'cargo --version'
      ],
      'default': [
        'echo "Environment initialized"'
      ]
    };
    
    return templates[template] || templates['default'];
  }

  /**
   * 生成README内容
   */
  generateReadmeContent(template) {
    return `# Claude Code Environment (${template})

## 环境信息
- 模板: ${template}
- 创建时间: ${new Date().toISOString()}
- 基础镜像: ${this.baseImage}

## 目录结构
- \`projects/\`: 项目代码目录
- \`temp/\`: 临时文件目录
- \`logs/\`: 日志文件目录

## 使用说明
这是您的专属开发环境，所有文件都会持久化保存。
您可以在这里进行代码开发、测试和调试。

---
Powered by Claude Code UI Multi-tenant Platform`;
  }

  /**
   * 在容器中执行命令
   */
  async executeInContainer(containerName, command) {
    const dockerCommand = `docker exec ${containerName} sh -c '${command}'`;
    try {
      const { stdout, stderr } = await execAsync(dockerCommand);
      return { stdout: stdout.trim(), stderr, success: true };
    } catch (error) {
      console.error(`❌ Command failed in ${containerName}:`, error.message);
      return { stdout: '', stderr: error.message, success: false };
    }
  }

  /**
   * 在用户环境中执行命令
   */
  async executeInEnvironment(userId, envId, command) {
    const environment = this.getUserEnvironment(userId, envId);
    if (!environment) {
      throw new Error(`Environment ${envId} not found for user ${userId}`);
    }
    
    return this.executeInContainer(environment.containerName, command);
  }

  /**
   * 获取用户环境
   */
  getUserEnvironment(userId, envId) {
    const userEnvs = this.userContainers.get(userId);
    if (!userEnvs) return null;
    
    return userEnvs.find(env => env.id === envId);
  }

  /**
   * 获取用户所有环境
   */
  getUserEnvironments(userId) {
    return this.userContainers.get(userId) || [];
  }

  /**
   * 停止用户环境
   */
  async stopEnvironment(userId, envId) {
    const environment = this.getUserEnvironment(userId, envId);
    if (!environment) {
      throw new Error(`Environment ${envId} not found`);
    }
    
    try {
      await execAsync(`docker stop ${environment.containerName}`);
      environment.status = 'stopped';
      console.log(`⏹️ Stopped environment: ${environment.containerName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to stop environment:`, error);
      return false;
    }
  }

  /**
   * 启动用户环境
   */
  async startEnvironment(userId, envId) {
    const environment = this.getUserEnvironment(userId, envId);
    if (!environment) {
      throw new Error(`Environment ${envId} not found`);
    }
    
    try {
      await execAsync(`docker start ${environment.containerName}`);
      environment.status = 'running';
      console.log(`▶️ Started environment: ${environment.containerName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to start environment:`, error);
      return false;
    }
  }

  /**
   * 删除用户环境
   */
  async destroyEnvironment(userId, envId) {
    const environment = this.getUserEnvironment(userId, envId);
    if (!environment) {
      return false;
    }
    
    try {
      // 停止并删除容器
      await execAsync(`docker stop ${environment.containerName}`).catch(() => {});
      await execAsync(`docker rm ${environment.containerName}`).catch(() => {});
      
      // 删除数据卷
      await execAsync(`docker volume rm ${environment.volumeName}`).catch(() => {});
      
      // 释放端口
      this.releasePorts(environment.ports);
      
      // 从内存中移除
      const userEnvs = this.userContainers.get(userId);
      const index = userEnvs.findIndex(env => env.id === envId);
      if (index > -1) {
        userEnvs.splice(index, 1);
      }
      
      console.log(`🗑️ Destroyed environment: ${environment.containerName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to destroy environment:`, error);
      return false;
    }
  }

  /**
   * 获取环境状态
   */
  async getEnvironmentStatus(userId, envId) {
    const environment = this.getUserEnvironment(userId, envId);
    if (!environment) {
      return null;
    }
    
    try {
      const { stdout } = await execAsync(`docker inspect ${environment.containerName} --format='{{.State.Status}}'`);
      const dockerStatus = stdout.trim();
      
      // 更新环境状态
      environment.status = dockerStatus;
      
      return {
        ...environment,
        dockerStatus,
        uptime: await this.getContainerUptime(environment.containerName)
      };
    } catch (error) {
      environment.status = 'error';
      return { ...environment, error: error.message };
    }
  }

  /**
   * 获取容器运行时间
   */
  async getContainerUptime(containerName) {
    try {
      const { stdout } = await execAsync(`docker inspect ${containerName} --format='{{.State.StartedAt}}'`);
      const startTime = new Date(stdout.trim());
      const uptime = Date.now() - startTime.getTime();
      return Math.floor(uptime / 1000); // 返回秒数
    } catch (error) {
      return 0;
    }
  }

  /**
   * 清理所有用户环境
   */
  async cleanup() {
    console.log('🧹 Cleaning up Docker environments...');
    
    for (const [userId, environments] of this.userContainers) {
      for (const env of environments) {
        await this.destroyEnvironment(userId, env.id);
      }
    }
    
    // 清理网络
    try {
      await execAsync(`docker network rm ${this.networkName}`);
      console.log(`🗑️ Removed Docker network: ${this.networkName}`);
    } catch (error) {
      console.log('⚠️ Network cleanup failed:', error.message);
    }
    
    console.log('✅ Docker Environment Manager cleanup complete');
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStats() {
    const stats = {
      totalEnvironments: 0,
      runningEnvironments: 0,
      totalUsers: this.userContainers.size,
      environments: []
    };
    
    for (const [userId, environments] of this.userContainers) {
      for (const env of environments) {
        stats.totalEnvironments++;
        if (env.status === 'running') {
          stats.runningEnvironments++;
        }
        
        stats.environments.push({
          userId,
          envId: env.id,
          status: env.status,
          template: env.template,
          createdAt: env.createdAt
        });
      }
    }
    
    return stats;
  }
}

export default DockerEnvironmentManager;