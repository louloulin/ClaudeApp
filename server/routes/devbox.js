/**
 * Devbox API Routes
 * Docker环境管理的API接口
 */

import express from 'express';
import devboxIntegration from '../devbox/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 创建用户环境
 * POST /api/devbox/environments
 */
router.post('/environments', async (req, res) => {
  try {
    const { template = 'default', options = {} } = req.body;
    const userId = req.user.id;
    
    const environment = await devboxIntegration.createUserEnvironment(userId, template, options);
    
    res.json({
      success: true,
      data: environment,
      message: 'Environment created successfully'
    });
  } catch (error) {
    console.error('Failed to create environment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户环境列表
 * GET /api/devbox/environments
 */
router.get('/environments', async (req, res) => {
  try {
    const userId = req.user.id;
    const environments = await devboxIntegration.getUserEnvironments(userId);
    
    res.json({
      success: true,
      data: environments
    });
  } catch (error) {
    console.error('Failed to get environments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取特定环境状态
 * GET /api/devbox/environments/:envId
 */
router.get('/environments/:envId', async (req, res) => {
  try {
    const { envId } = req.params;
    const userId = req.user.id;
    
    const environment = devboxIntegration.dockerManager.getUserEnvironment(userId, envId);
    if (!environment) {
      return res.status(404).json({
        success: false,
        error: 'Environment not found'
      });
    }
    
    const status = await devboxIntegration.dockerManager.getEnvironmentStatus(userId, envId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Failed to get environment status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 在环境中执行命令
 * POST /api/devbox/environments/:envId/execute
 */
router.post('/environments/:envId/execute', async (req, res) => {
  try {
    const { envId } = req.params;
    const { command } = req.body;
    const userId = req.user.id;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }
    
    const result = await devboxIntegration.executeCommand(userId, envId, command);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Failed to execute command:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 启动环境
 * POST /api/devbox/environments/:envId/start
 */
router.post('/environments/:envId/start', async (req, res) => {
  try {
    const { envId } = req.params;
    const userId = req.user.id;
    
    const result = await devboxIntegration.startUserEnvironment(userId, envId);
    
    res.json({
      success: result,
      message: result ? 'Environment started successfully' : 'Failed to start environment'
    });
  } catch (error) {
    console.error('Failed to start environment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 停止环境
 * POST /api/devbox/environments/:envId/stop
 */
router.post('/environments/:envId/stop', async (req, res) => {
  try {
    const { envId } = req.params;
    const userId = req.user.id;
    
    const result = await devboxIntegration.stopUserEnvironment(userId, envId);
    
    res.json({
      success: result,
      message: result ? 'Environment stopped successfully' : 'Failed to stop environment'
    });
  } catch (error) {
    console.error('Failed to stop environment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除环境
 * DELETE /api/devbox/environments/:envId
 */
router.delete('/environments/:envId', async (req, res) => {
  try {
    const { envId } = req.params;
    const userId = req.user.id;
    
    const result = await devboxIntegration.destroyUserEnvironment(userId, envId);
    
    res.json({
      success: result,
      message: result ? 'Environment deleted successfully' : 'Failed to delete environment'
    });
  } catch (error) {
    console.error('Failed to delete environment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户配额信息
 * GET /api/devbox/quota
 */
router.get('/quota', async (req, res) => {
  try {
    const userId = req.user.id;
    const quotaInfo = await devboxIntegration.getUserQuotaInfo(userId);
    
    res.json({
      success: true,
      data: quotaInfo
    });
  } catch (error) {
    console.error('Failed to get quota info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取可用模板列表
 * GET /api/devbox/templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = {
      'default': {
        name: 'Default Environment',
        description: 'Basic environment with common tools',
        tools: ['bash', 'curl', 'git', 'vim']
      },
      'python': {
        name: 'Python Development',
        description: 'Python 3.x with pip, jupyter, and common packages',
        tools: ['python3', 'pip', 'jupyter', 'pandas', 'numpy']
      },
      'nodejs': {
        name: 'Node.js Development',
        description: 'Node.js with npm and TypeScript support',
        tools: ['node', 'npm', 'typescript', 'ts-node']
      },
      'go': {
        name: 'Go Development',
        description: 'Go programming environment',
        tools: ['go', 'gofmt', 'go mod']
      },
      'rust': {
        name: 'Rust Development',
        description: 'Rust programming environment with Cargo',
        tools: ['rustc', 'cargo', 'rustfmt']
      }
    };
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 管理员专用路由

/**
 * 获取系统统计信息（管理员）
 * GET /api/devbox/admin/stats
 */
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await devboxIntegration.getSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get system stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 清理用户所有环境（管理员）
 * DELETE /api/devbox/admin/users/:userId/environments
 */
router.delete('/admin/users/:userId/environments', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await devboxIntegration.cleanupUserEnvironments(parseInt(userId));
    
    res.json({
      success: true,
      message: `All environments for user ${userId} have been cleaned up`
    });
  } catch (error) {
    console.error('Failed to cleanup user environments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取所有用户环境列表（管理员）
 * GET /api/devbox/admin/environments
 */
router.get('/admin/environments', requireAdmin, async (req, res) => {
  try {
    const stats = await devboxIntegration.getSystemStats();
    
    res.json({
      success: true,
      data: {
        summary: {
          totalEnvironments: stats.totalEnvironments,
          runningEnvironments: stats.runningEnvironments,
          totalUsers: stats.totalUsers
        },
        environments: stats.environments
      }
    });
  } catch (error) {
    console.error('Failed to get all environments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;