import express from 'express';
import { userDb, resourceDb, sessionDb } from '../database/db.js';
import { requireAdmin } from '../middleware/auth.js';
import claudeInstancePool from '../claude-pool.js';
import resourceMonitor from '../resource-monitor.js';

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

// ===== 实例管理 API =====

// 获取所有Claude实例状态
router.get('/instances', async (req, res) => {
  try {
    const { status, userId, sortBy = 'lastActivity', order = 'desc' } = req.query;
    
    // 获取所有实例统计信息
    let instances = claudeInstancePool.getAllInstancesStats();
    
    // 添加用户信息
    const allUsers = userDb.getAllUsers();
    const userMap = new Map(allUsers.map(user => [user.id, user]));
    
    instances = instances.map(instance => {
      const user = userMap.get(instance.userId);
      return {
        ...instance,
        username: user?.username || 'Unknown',
        userEmail: user?.email || null,
        userRole: user?.role || 'user'
      };
    });
    
    // 过滤
    if (status) {
      instances = instances.filter(instance => instance.status === status);
    }
    if (userId) {
      instances = instances.filter(instance => instance.userId === parseInt(userId));
    }
    
    // 排序
    instances.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'lastActivity' || sortBy === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (order === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });
    
    res.json({
      instances,
      total: instances.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching instances:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取特定实例详细信息
router.get('/instances/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const instance = claudeInstancePool.getInstanceStats(userId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    // 获取用户信息
    const user = userDb.getUserById(userId);
    const resourceUsage = resourceDb.getUserResourceUsage(userId);
    const sessions = sessionDb.getUserSessions(userId);
    
    res.json({
      instance,
      user,
      resourceUsage,
      sessions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching instance details:', error);
    res.status(500).json({ error: error.message });
  }
});

// 重启实例
router.post('/instances/:userId/restart', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // 记录管理员操作
    console.log(`Admin ${req.user.username} restarting instance for user ${userId}`);
    
    // 销毁现有实例
    await claudeInstancePool.destroyUserInstance(userId);
    
    // 创建新实例
    const newInstance = await claudeInstancePool.getOrCreateInstance(userId);
    
    res.json({
      success: true,
      message: 'Instance restarted successfully',
      instance: claudeInstancePool.getInstanceStats(userId),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error restarting instance:', error);
    res.status(500).json({ error: error.message });
  }
});

// 终止实例
router.post('/instances/:userId/terminate', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // 记录管理员操作
    console.log(`Admin ${req.user.username} terminating instance for user ${userId}`);
    
    const success = await claudeInstancePool.destroyUserInstance(userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    res.json({
      success: true,
      message: 'Instance terminated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error terminating instance:', error);
    res.status(500).json({ error: error.message });
  }
});

// 批量操作实例
router.post('/instances/batch', async (req, res) => {
  try {
    const { action, userIds } = req.body;
    
    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Invalid action or userIds' });
    }
    
    console.log(`Admin ${req.user.username} performing batch ${action} on ${userIds.length} instances`);
    
    const results = [];
    
    for (const userId of userIds) {
      try {
        let result;
        switch (action) {
          case 'restart':
            await claudeInstancePool.destroyUserInstance(userId);
            await claudeInstancePool.getOrCreateInstance(userId);
            result = { userId, success: true, message: 'Restarted' };
            break;
          case 'terminate':
            const success = await claudeInstancePool.destroyUserInstance(userId);
            result = { userId, success, message: success ? 'Terminated' : 'Not found' };
            break;
          default:
            result = { userId, success: false, message: 'Unknown action' };
        }
        results.push(result);
      } catch (error) {
        results.push({ userId, success: false, message: error.message });
      }
    }
    
    res.json({
      success: true,
      action,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error performing batch operation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 健康监控 API =====

// 获取系统健康状态
router.get('/health', async (req, res) => {
  try {
    const instances = claudeInstancePool.getAllInstancesStats();
    const systemMetrics = resourceMonitor.getSystemResourceUsage();
    
    // 计算健康评分
    const totalInstances = instances.length;
    const healthyInstances = instances.filter(i => i.health?.status === 'healthy').length;
    const unhealthyInstances = instances.filter(i => i.health?.status === 'unhealthy').length;
    const inactiveInstances = instances.filter(i => i.health?.status === 'inactive').length;
    
    // 健康评分算法 (0-100)
    let healthScore = 100;
    if (totalInstances > 0) {
      const healthyRatio = healthyInstances / totalInstances;
      const unhealthyPenalty = (unhealthyInstances / totalInstances) * 50;
      const inactivePenalty = (inactiveInstances / totalInstances) * 20;
      healthScore = Math.max(0, Math.round(healthyRatio * 100 - unhealthyPenalty - inactivePenalty));
    }
    
    // 系统状态评估
    let systemStatus = 'healthy';
    if (healthScore < 50 || systemMetrics.cpu.usage > 90 || systemMetrics.memory.usage > 90) {
      systemStatus = 'critical';
    } else if (healthScore < 80 || systemMetrics.cpu.usage > 70 || systemMetrics.memory.usage > 70) {
      systemStatus = 'warning';
    }
    
    res.json({
      healthScore,
      systemStatus,
      instances: {
        total: totalInstances,
        healthy: healthyInstances,
        unhealthy: unhealthyInstances,
        inactive: inactiveInstances
      },
      systemMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching health status:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取系统指标历史
router.get('/metrics', async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    // 获取当前系统指标
    const currentMetrics = resourceMonitor.getSystemResourceUsage();
    
    // 获取实例统计
    const instances = claudeInstancePool.getAllInstancesStats();
    const activeInstances = instances.filter(i => i.status === 'active').length;
    const totalProcesses = instances.reduce((sum, i) => sum + i.activeProcesses, 0);
    
    // 获取用户统计
    const allUsers = userDb.getAllUsers();
    const activeUsers = allUsers.filter(u => u.is_active).length;
    
    res.json({
      current: {
        ...currentMetrics,
        instances: {
          active: activeInstances,
          total: instances.length
        },
        processes: totalProcesses,
        users: {
          active: activeUsers,
          total: allUsers.length
        }
      },
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// 强制健康检查
router.post('/health/check', async (req, res) => {
  try {
    console.log(`Admin ${req.user.username} triggered manual health check`);
    
    await claudeInstancePool.performHealthChecks();
    await claudeInstancePool.cleanupInactiveInstances();
    
    res.json({
      success: true,
      message: 'Health check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 用户管理 API =====

// 获取所有用户（增强版）
router.get('/users', async (req, res) => {
  try {
    const { role, active, sortBy = 'created_at', order = 'desc' } = req.query;
    
    let users = userDb.getAllUsers();
    
    // 添加实例信息
    const instances = claudeInstancePool.getAllInstancesStats();
    const instanceMap = new Map(instances.map(i => [i.userId, i]));
    
    users = users.map(user => {
      const instance = instanceMap.get(user.id);
      return {
        ...user,
        hasActiveInstance: !!instance,
        instanceStatus: instance?.status || null,
        instanceHealth: instance?.health?.status || null,
        lastInstanceActivity: instance?.lastActivity || null
      };
    });
    
    // 过滤
    if (role) {
      users = users.filter(user => user.role === role);
    }
    if (active !== undefined) {
      const isActive = active === 'true';
      users = users.filter(user => user.is_active === (isActive ? 1 : 0));
    }
    
    // 排序
    users.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'created_at' || sortBy === 'last_login') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (order === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });
    
    res.json({
      users,
      total: users.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新用户配额
router.put('/users/:userId/quotas', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { quota_cpu, quota_memory, quota_storage, quota_claude_instances } = req.body;
    
    console.log(`Admin ${req.user.username} updating quotas for user ${userId}`);
    
    const success = userDb.updateUserQuotas(userId, {
      quota_cpu,
      quota_memory,
      quota_storage,
      quota_claude_instances
    });
    
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User quotas updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user quotas:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新用户角色
router.put('/users/:userId/role', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    console.log(`Admin ${req.user.username} updating role for user ${userId} to ${role}`);
    
    const success = userDb.updateUserRole(userId, role);
    
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== 系统统计 API =====

// 获取系统概览统计
router.get('/stats/overview', async (req, res) => {
  try {
    const allUsers = userDb.getAllUsers();
    const instances = claudeInstancePool.getAllInstancesStats();
    const systemMetrics = resourceMonitor.getSystemResourceUsage();
    
    const stats = {
      users: {
        total: allUsers.length,
        active: allUsers.filter(u => u.is_active).length,
        admins: allUsers.filter(u => u.role === 'admin').length
      },
      instances: {
        total: instances.length,
        active: instances.filter(i => i.status === 'active').length,
        healthy: instances.filter(i => i.health?.status === 'healthy').length,
        unhealthy: instances.filter(i => i.health?.status === 'unhealthy').length
      },
      system: {
        cpu: systemMetrics.cpu,
        memory: systemMetrics.memory,
        disk: systemMetrics.disk,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;