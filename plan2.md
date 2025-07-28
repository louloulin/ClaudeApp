# Claude Code UI 管理员扩展功能计划 (Plan 2)

## 1. 项目概述

### 1.1 基于Plan 1的扩展
基于Plan 1已完成的95%功能（多租户认证、Claude实例池、移动端支持、Docker环境隔离），本计划专注于增强管理员功能，提供全面的Claude实例池管理UI界面。

### 1.2 新增核心功能
- **管理员实例监控面板**：实时显示所有用户的Claude实例状态
- **实例操作界面**：支持查看、重启、终止实例的管理操作
- **健康监控仪表板**：实时显示实例池健康状态和性能指标
- **管理API端点**：支持前端管理操作的完整后端API
- **多租户管理增强**：深度集成多租户功能的管理界面

## 2. 管理员扩展功能架构设计

### 2.1 整体架构扩展

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        管理员扩展UI层 (新增)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  实例监控面板  │  操作界面  │  健康监控仪表板  │  多租户管理控制台        │
├─────────────────────────────────────────────────────────────────────────────┤
│                        管理API层 (新增)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  实例管理API  │  健康监控API  │  统计分析API  │  操作日志API             │
├─────────────────────────────────────────────────────────────────────────────┤
│                        现有多租户Web界面层                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  React UI  │  Mobile Responsive  │  PWA Support  │  Touch Optimized      │
├─────────────────────────────────────────────────────────────────────────────┤
│                        现有多用户管理层                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  User Auth  │  Session Manager  │  Resource Quota  │  Permission Control   │
├─────────────────────────────────────────────────────────────────────────────┤
│                        现有Claude实例管理层                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Claude Pool │  Instance Router │  Load Balancer │  Health Monitor       │
├─────────────────────────────────────────────────────────────────────────────┤
│                        现有Docker环境隔离层                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  User1-Env1  │  User1-Env2  │  User2-Env1  │  User2-Env2  │  UserN-EnvN  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 新增组件详细设计

#### 2.2.1 管理员实例监控面板
**功能特性：**
- 实时显示所有用户的Claude实例状态
- 支持按用户、状态、创建时间等维度筛选
- 显示实例详细信息：进程ID、内存使用、CPU使用、运行时间
- 支持批量操作和单个实例操作
- 实时更新，支持WebSocket推送

**技术实现：**
```javascript
// 前端组件：src/components/admin/InstanceMonitorPanel.jsx
function InstanceMonitorPanel() {
  const [instances, setInstances] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', user: 'all' });
  const [selectedInstances, setSelectedInstances] = useState([]);
  
  // 实时数据更新
  useEffect(() => {
    const ws = new WebSocket('/ws/admin/instances');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'instance_update') {
        setInstances(prev => updateInstanceData(prev, data.instances));
      }
    };
    return () => ws.close();
  }, []);
  
  return (
    <div className="instance-monitor-panel">
      <div className="panel-header">
        <h2>Claude实例监控</h2>
        <div className="filter-controls">
          <select value={filters.status} onChange={handleStatusFilter}>
            <option value="all">所有状态</option>
            <option value="running">运行中</option>
            <option value="idle">空闲</option>
            <option value="error">错误</option>
          </select>
          <select value={filters.user} onChange={handleUserFilter}>
            <option value="all">所有用户</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.username}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="instances-grid">
        {filteredInstances.map(instance => (
          <InstanceCard 
            key={instance.id} 
            instance={instance}
            onSelect={handleInstanceSelect}
            onAction={handleInstanceAction}
          />
        ))}
      </div>
      
      <div className="batch-operations">
        <button 
          disabled={selectedInstances.length === 0}
          onClick={() => handleBatchAction('restart')}
        >
          批量重启
        </button>
        <button 
          disabled={selectedInstances.length === 0}
          onClick={() => handleBatchAction('terminate')}
        >
          批量终止
        </button>
      </div>
    </div>
  );
}
```

#### 2.2.2 实例操作界面
**功能特性：**
- 查看实例详细信息和日志
- 支持重启、终止、暂停、恢复操作
- 实例性能图表和历史数据
- 操作确认和权限验证
- 操作日志记录

**技术实现：**
```javascript
// 前端组件：src/components/admin/InstanceOperationPanel.jsx
function InstanceOperationPanel({ instanceId }) {
  const [instance, setInstance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [operationInProgress, setOperationInProgress] = useState(false);
  
  const handleOperation = async (operation) => {
    if (!confirm(`确认要${operation}此实例吗？`)) return;
    
    setOperationInProgress(true);
    try {
      const response = await fetch(`/api/admin/instances/${instanceId}/${operation}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        showNotification(`实例${operation}成功`, 'success');
        // 刷新实例数据
        await fetchInstanceData();
      } else {
        throw new Error(`操作失败: ${response.statusText}`);
      }
    } catch (error) {
      showNotification(`操作失败: ${error.message}`, 'error');
    } finally {
      setOperationInProgress(false);
    }
  };
  
  return (
    <div className="instance-operation-panel">
      <div className="instance-info">
        <h3>实例详情</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>实例ID:</label>
            <span>{instance?.id}</span>
          </div>
          <div className="info-item">
            <label>用户:</label>
            <span>{instance?.user?.username}</span>
          </div>
          <div className="info-item">
            <label>状态:</label>
            <span className={`status ${instance?.status}`}>
              {instance?.status}
            </span>
          </div>
          <div className="info-item">
            <label>运行时间:</label>
            <span>{formatDuration(instance?.uptime)}</span>
          </div>
        </div>
      </div>
      
      <div className="operation-controls">
        <h3>操作控制</h3>
        <div className="control-buttons">
          <button 
            onClick={() => handleOperation('restart')}
            disabled={operationInProgress || instance?.status !== 'running'}
            className="btn-warning"
          >
            重启实例
          </button>
          <button 
            onClick={() => handleOperation('terminate')}
            disabled={operationInProgress}
            className="btn-danger"
          >
            终止实例
          </button>
          <button 
            onClick={() => handleOperation('pause')}
            disabled={operationInProgress || instance?.status !== 'running'}
            className="btn-secondary"
          >
            暂停实例
          </button>
          <button 
            onClick={() => handleOperation('resume')}
            disabled={operationInProgress || instance?.status !== 'paused'}
            className="btn-primary"
          >
            恢复实例
          </button>
        </div>
      </div>
      
      <div className="performance-metrics">
        <h3>性能指标</h3>
        <div className="metrics-charts">
          <CPUChart data={metrics.cpu} />
          <MemoryChart data={metrics.memory} />
          <NetworkChart data={metrics.network} />
        </div>
      </div>
      
      <div className="instance-logs">
        <h3>实例日志</h3>
        <div className="log-viewer">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.level}`}>
              <span className="timestamp">{log.timestamp}</span>
              <span className="level">{log.level}</span>
              <span className="message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 2.2.3 健康监控仪表板
**功能特性：**
- 实时显示实例池整体健康状态
- 系统性能指标监控（CPU、内存、网络、磁盘）
- 告警和通知系统
- 历史数据分析和趋势图表
- 自动化健康检查和报告

**技术实现：**
```javascript
// 前端组件：src/components/admin/HealthMonitorDashboard.jsx
function HealthMonitorDashboard() {
  const [healthData, setHealthData] = useState({
    overall: { status: 'healthy', score: 95 },
    instances: { total: 0, healthy: 0, warning: 0, critical: 0 },
    system: { cpu: 0, memory: 0, disk: 0, network: 0 },
    alerts: []
  });
  
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // 实时数据更新
  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const response = await fetch('/api/admin/health/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setHealthData(data);
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      }
    };
    
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000); // 30秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeRange]);
  
  return (
    <div className="health-monitor-dashboard">
      <div className="dashboard-header">
        <h2>健康监控仪表板</h2>
        <div className="controls">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="1h">最近1小时</option>
            <option value="6h">最近6小时</option>
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
          </select>
          <label>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            自动刷新
          </label>
        </div>
      </div>
      
      <div className="health-overview">
        <div className="health-score">
          <div className={`score-circle ${getHealthStatus(healthData.overall.score)}`}>
            <span className="score">{healthData.overall.score}</span>
            <span className="label">健康分数</span>
          </div>
        </div>
        
        <div className="instance-summary">
          <h3>实例状态概览</h3>
          <div className="status-grid">
            <div className="status-item healthy">
              <span className="count">{healthData.instances.healthy}</span>
              <span className="label">健康</span>
            </div>
            <div className="status-item warning">
              <span className="count">{healthData.instances.warning}</span>
              <span className="label">警告</span>
            </div>
            <div className="status-item critical">
              <span className="count">{healthData.instances.critical}</span>
              <span className="label">严重</span>
            </div>
            <div className="status-item total">
              <span className="count">{healthData.instances.total}</span>
              <span className="label">总计</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="system-metrics">
        <h3>系统性能指标</h3>
        <div className="metrics-grid">
          <MetricCard 
            title="CPU使用率" 
            value={healthData.system.cpu} 
            unit="%"
            threshold={80}
          />
          <MetricCard 
            title="内存使用率" 
            value={healthData.system.memory} 
            unit="%"
            threshold={85}
          />
          <MetricCard 
            title="磁盘使用率" 
            value={healthData.system.disk} 
            unit="%"
            threshold={90}
          />
          <MetricCard 
            title="网络负载" 
            value={healthData.system.network} 
            unit="Mbps"
            threshold={100}
          />
        </div>
      </div>
      
      <div className="alerts-panel">
        <h3>告警信息</h3>
        <div className="alerts-list">
          {healthData.alerts.length === 0 ? (
            <div className="no-alerts">暂无告警信息</div>
          ) : (
            healthData.alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          )}
        </div>
      </div>
      
      <div className="trend-charts">
        <h3>趋势分析</h3>
        <div className="charts-container">
          <TrendChart 
            title="实例数量趋势" 
            data={healthData.trends?.instances} 
            timeRange={timeRange}
          />
          <TrendChart 
            title="系统负载趋势" 
            data={healthData.trends?.system} 
            timeRange={timeRange}
          />
        </div>
      </div>
    </div>
  );
}
```

## 3. 后端API端点设计

### 3.1 管理员实例管理API

```javascript
// 新增文件：server/routes/admin.js
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const claudePool = require('../claude-pool');
const resourceMonitor = require('../resource-monitor');

// 获取所有实例列表
router.get('/instances', requireAdmin, async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 20 } = req.query;
    
    const instances = await claudePool.getAllInstances({
      status,
      userId: userId ? parseInt(userId) : undefined,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    const enrichedInstances = await Promise.all(
      instances.map(async (instance) => {
        const metrics = await resourceMonitor.getInstanceMetrics(instance.id);
        const user = await userDb.getUserById(instance.userId);
        
        return {
          ...instance,
          metrics,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        };
      })
    );
    
    res.json({
      instances: enrichedInstances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await claudePool.getInstanceCount({ status, userId })
      }
    });
  } catch (error) {
    console.error('Failed to get instances:', error);
    res.status(500).json({ error: 'Failed to get instances' });
  }
});

// 获取单个实例详情
router.get('/instances/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const instance = await claudePool.getInstance(id);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    const metrics = await resourceMonitor.getInstanceMetrics(id);
    const logs = await claudePool.getInstanceLogs(id, { limit: 100 });
    const user = await userDb.getUserById(instance.userId);
    
    res.json({
      ...instance,
      metrics,
      logs,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Failed to get instance details:', error);
    res.status(500).json({ error: 'Failed to get instance details' });
  }
});

// 重启实例
router.post('/instances/:id/restart', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const instance = await claudePool.getInstance(id);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    await claudePool.restartInstance(id);
    
    // 记录操作日志
    await logAdminOperation({
      adminId: req.user.id,
      action: 'restart_instance',
      targetInstanceId: id,
      targetUserId: instance.userId,
      timestamp: new Date()
    });
    
    res.json({ message: 'Instance restarted successfully' });
  } catch (error) {
    console.error('Failed to restart instance:', error);
    res.status(500).json({ error: 'Failed to restart instance' });
  }
});

// 终止实例
router.post('/instances/:id/terminate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const instance = await claudePool.getInstance(id);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    await claudePool.terminateInstance(id);
    
    // 记录操作日志
    await logAdminOperation({
      adminId: req.user.id,
      action: 'terminate_instance',
      targetInstanceId: id,
      targetUserId: instance.userId,
      timestamp: new Date()
    });
    
    res.json({ message: 'Instance terminated successfully' });
  } catch (error) {
    console.error('Failed to terminate instance:', error);
    res.status(500).json({ error: 'Failed to terminate instance' });
  }
});

// 暂停实例
router.post('/instances/:id/pause', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await claudePool.pauseInstance(id);
    
    await logAdminOperation({
      adminId: req.user.id,
      action: 'pause_instance',
      targetInstanceId: id,
      timestamp: new Date()
    });
    
    res.json({ message: 'Instance paused successfully' });
  } catch (error) {
    console.error('Failed to pause instance:', error);
    res.status(500).json({ error: 'Failed to pause instance' });
  }
});

// 恢复实例
router.post('/instances/:id/resume', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await claudePool.resumeInstance(id);
    
    await logAdminOperation({
      adminId: req.user.id,
      action: 'resume_instance',
      targetInstanceId: id,
      timestamp: new Date()
    });
    
    res.json({ message: 'Instance resumed successfully' });
  } catch (error) {
    console.error('Failed to resume instance:', error);
    res.status(500).json({ error: 'Failed to resume instance' });
  }
});

// 批量操作
router.post('/instances/batch', requireAdmin, async (req, res) => {
  try {
    const { action, instanceIds } = req.body;
    
    if (!['restart', 'terminate', 'pause', 'resume'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const results = await Promise.allSettled(
      instanceIds.map(id => {
        switch (action) {
          case 'restart': return claudePool.restartInstance(id);
          case 'terminate': return claudePool.terminateInstance(id);
          case 'pause': return claudePool.pauseInstance(id);
          case 'resume': return claudePool.resumeInstance(id);
        }
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    // 记录批量操作日志
    await logAdminOperation({
      adminId: req.user.id,
      action: `batch_${action}`,
      targetInstanceIds: instanceIds,
      result: { successful, failed },
      timestamp: new Date()
    });
    
    res.json({
      message: `Batch ${action} completed`,
      successful,
      failed,
      details: results
    });
  } catch (error) {
    console.error('Failed to execute batch operation:', error);
    res.status(500).json({ error: 'Failed to execute batch operation' });
  }
});

module.exports = router;
```

### 3.2 健康监控API

```javascript
// 新增文件：server/routes/health.js
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const healthMonitor = require('../health-monitor');
const claudePool = require('../claude-pool');
const resourceMonitor = require('../resource-monitor');

// 获取健康监控仪表板数据
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    // 获取实例健康状态
    const instanceHealth = await claudePool.getHealthSummary();
    
    // 获取系统性能指标
    const systemMetrics = await resourceMonitor.getSystemMetrics();
    
    // 获取告警信息
    const alerts = await healthMonitor.getActiveAlerts();
    
    // 获取趋势数据
    const trends = await healthMonitor.getTrendData(timeRange);
    
    // 计算整体健康分数
    const healthScore = calculateHealthScore({
      instanceHealth,
      systemMetrics,
      alerts
    });
    
    res.json({
      overall: {
        status: getHealthStatus(healthScore),
        score: healthScore
      },
      instances: {
        total: instanceHealth.total,
        healthy: instanceHealth.healthy,
        warning: instanceHealth.warning,
        critical: instanceHealth.critical
      },
      system: {
        cpu: systemMetrics.cpu.usage,
        memory: systemMetrics.memory.usage,
        disk: systemMetrics.disk.usage,
        network: systemMetrics.network.usage
      },
      alerts,
      trends
    });
  } catch (error) {
    console.error('Failed to get health dashboard data:', error);
    res.status(500).json({ error: 'Failed to get health dashboard data' });
  }
});

// 获取详细健康报告
router.get('/report', requireAdmin, async (req, res) => {
  try {
    const report = await healthMonitor.generateHealthReport();
    res.json(report);
  } catch (error) {
    console.error('Failed to generate health report:', error);
    res.status(500).json({ error: 'Failed to generate health report' });
  }
});

// 获取性能指标历史数据
router.get('/metrics/:metric', requireAdmin, async (req, res) => {
  try {
    const { metric } = req.params;
    const { timeRange = '1h', interval = '5m' } = req.query;
    
    const data = await resourceMonitor.getMetricHistory(metric, {
      timeRange,
      interval
    });
    
    res.json(data);
  } catch (error) {
    console.error('Failed to get metric history:', error);
    res.status(500).json({ error: 'Failed to get metric history' });
  }
});

// 创建自定义告警规则
router.post('/alerts/rules', requireAdmin, async (req, res) => {
  try {
    const { name, metric, threshold, condition, severity } = req.body;
    
    const rule = await healthMonitor.createAlertRule({
      name,
      metric,
      threshold,
      condition,
      severity,
      createdBy: req.user.id
    });
    
    res.json(rule);
  } catch (error) {
    console.error('Failed to create alert rule:', error);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

// 获取告警规则列表
router.get('/alerts/rules', requireAdmin, async (req, res) => {
  try {
    const rules = await healthMonitor.getAlertRules();
    res.json(rules);
  } catch (error) {
    console.error('Failed to get alert rules:', error);
    res.status(500).json({ error: 'Failed to get alert rules' });
  }
});

// 确认告警
router.post('/alerts/:id/acknowledge', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    await healthMonitor.acknowledgeAlert(id, {
      acknowledgedBy: req.user.id,
      note,
      timestamp: new Date()
    });
    
    res.json({ message: 'Alert acknowledged successfully' });
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

module.exports = router;
```

### 3.3 WebSocket实时更新

```javascript
// 新增文件：server/websocket/admin.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const claudePool = require('../claude-pool');
const healthMonitor = require('../health-monitor');

class AdminWebSocketManager {
  constructor() {
    this.clients = new Map(); // adminId -> WebSocket
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // 监听实例状态变化
    claudePool.on('instance_status_changed', (data) => {
      this.broadcastToAdmins({
        type: 'instance_update',
        data
      });
    });
    
    // 监听健康状态变化
    healthMonitor.on('health_status_changed', (data) => {
      this.broadcastToAdmins({
        type: 'health_update',
        data
      });
    });
    
    // 监听新告警
    healthMonitor.on('new_alert', (alert) => {
      this.broadcastToAdmins({
        type: 'new_alert',
        data: alert
      });
    });
  }
  
  handleConnection(ws, request) {
    try {
      // 验证管理员身份
      const token = this.extractToken(request);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = userDb.getUserById(decoded.userId);
      
      if (!user || user.role !== 'admin') {
        ws.close(1008, 'Unauthorized');
        return;
      }
      
      // 注册客户端
      this.clients.set(user.id, ws);
      
      // 发送初始数据
      this.sendInitialData(ws);
      
      // 处理客户端消息
      ws.on('message', (message) => {
        this.handleMessage(ws, user.id, message);
      });
      
      // 处理连接关闭
      ws.on('close', () => {
        this.clients.delete(user.id);
      });
      
    } catch (error) {
      console.error('Admin WebSocket connection error:', error);
      ws.close(1008, 'Authentication failed');
    }
  }
  
  async sendInitialData(ws) {
    try {
      const instances = await claudePool.getAllInstances();
      const healthData = await healthMonitor.getCurrentStatus();
      
      ws.send(JSON.stringify({
        type: 'initial_data',
        data: {
          instances,
          health: healthData
        }
      }));
    } catch (error) {
      console.error('Failed to send initial data:', error);
    }
  }
  
  handleMessage(ws, adminId, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe_instance':
          this.subscribeToInstance(ws, data.instanceId);
          break;
        case 'unsubscribe_instance':
          this.unsubscribeFromInstance(ws, data.instanceId);
          break;
        case 'request_health_update':
          this.sendHealthUpdate(ws);
          break;
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to handle admin WebSocket message:', error);
    }
  }
  
  broadcastToAdmins(message) {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((ws, adminId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        this.clients.delete(adminId);
      }
    });
  }
  
  extractToken(request) {
    const url = new URL(request.url, 'http://localhost');
    return url.searchParams.get('token');
  }
}

module.exports = AdminWebSocketManager;
```

## 4. 数据库扩展

### 4.1 新增表结构

```sql
-- 新增文件：server/database/admin_extensions.sql

-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'instance', 'user', 'system'
  target_id TEXT,
  target_user_id INTEGER,
  details TEXT, -- JSON格式的详细信息
  result TEXT, -- 'success', 'failed', 'partial'
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (target_user_id) REFERENCES users(id)
);

-- 健康监控告警规则表
CREATE TABLE IF NOT EXISTS health_alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  metric TEXT NOT NULL, -- 'cpu', 'memory', 'disk', 'instance_count', etc.
  threshold REAL NOT NULL,
  condition TEXT NOT NULL, -- 'gt', 'lt', 'eq', 'gte', 'lte'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  enabled BOOLEAN DEFAULT 1,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 告警记录表
CREATE TABLE IF NOT EXISTS health_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL,
  metric_value REAL NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by INTEGER,
  acknowledged_at DATETIME,
  acknowledged_note TEXT,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rule_id) REFERENCES health_alert_rules(id),
  FOREIGN KEY (acknowledged_by) REFERENCES users(id)
);

-- 性能指标历史数据表
CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_type TEXT NOT NULL, -- 'system_cpu', 'system_memory', 'instance_cpu', etc.
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  instance_id TEXT, -- 可选，用于实例级别的指标
  user_id INTEGER, -- 可选，用于用户级别的指标
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_operation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_operation_logs(action);

CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON health_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON health_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON health_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_metrics_type_name ON performance_metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_instance_id ON performance_metrics(instance_id);
```

### 4.2 数据库操作类

```javascript
// 新增文件：server/database/admin-db.js
const Database = require('better-sqlite3');
const path = require('path');

class AdminDatabase {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.initTables();
  }
  
  initTables() {
    const sql = require('fs').readFileSync(
      path.join(__dirname, 'admin_extensions.sql'),
      'utf8'
    );
    this.db.exec(sql);
  }
  
  // 管理员操作日志
  logAdminOperation(operation) {
    const stmt = this.db.prepare(`
      INSERT INTO admin_operation_logs (
        admin_id, action, target_type, target_id, target_user_id,
        details, result, error_message, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      operation.adminId,
      operation.action,
      operation.targetType || 'instance',
      operation.targetId,
      operation.targetUserId,
      JSON.stringify(operation.details || {}),
      operation.result || 'success',
      operation.errorMessage,
      operation.ipAddress,
      operation.userAgent
    );
  }
  
  getAdminOperationLogs(options = {}) {
    const {
      adminId,
      action,
      targetType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = options;
    
    let query = `
      SELECT aol.*, u.username as admin_username
      FROM admin_operation_logs aol
      JOIN users u ON aol.admin_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (adminId) {
      query += ' AND aol.admin_id = ?';
      params.push(adminId);
    }
    
    if (action) {
      query += ' AND aol.action = ?';
      params.push(action);
    }
    
    if (targetType) {
      query += ' AND aol.target_type = ?';
      params.push(targetType);
    }
    
    if (startDate) {
      query += ' AND aol.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND aol.created_at <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY aol.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }
  
  // 告警规则管理
  createAlertRule(rule) {
    const stmt = this.db.prepare(`
      INSERT INTO health_alert_rules (
        name, metric, threshold, condition, severity, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      rule.name,
      rule.metric,
      rule.threshold,
      rule.condition,
      rule.severity,
      rule.createdBy
    );
  }
  
  getAlertRules(enabled = null) {
    let query = 'SELECT * FROM health_alert_rules';
    const params = [];
    
    if (enabled !== null) {
      query += ' WHERE enabled = ?';
      params.push(enabled ? 1 : 0);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }
  
  updateAlertRule(id, updates) {
    const fields = [];
    const params = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value);
    });
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE health_alert_rules 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);
    
    return stmt.run(...params);
  }
  
  // 告警记录管理
  createAlert(alert) {
    const stmt = this.db.prepare(`
      INSERT INTO health_alerts (
        rule_id, metric_value, message, severity
      ) VALUES (?, ?, ?, ?)
    `);
    
    return stmt.run(
      alert.ruleId,
      alert.metricValue,
      alert.message,
      alert.severity
    );
  }
  
  getActiveAlerts() {
    const stmt = this.db.prepare(`
      SELECT ha.*, har.name as rule_name, har.metric
      FROM health_alerts ha
      JOIN health_alert_rules har ON ha.rule_id = har.id
      WHERE ha.status = 'active'
      ORDER BY ha.created_at DESC
    `);
    
    return stmt.all();
  }
  
  acknowledgeAlert(alertId, acknowledgment) {
    const stmt = this.db.prepare(`
      UPDATE health_alerts 
      SET status = 'acknowledged',
          acknowledged_by = ?,
          acknowledged_at = ?,
          acknowledged_note = ?
      WHERE id = ?
    `);
    
    return stmt.run(
      acknowledgment.acknowledgedBy,
      acknowledgment.timestamp.toISOString(),
      acknowledgment.note,
      alertId
    );
  }
  
  // 性能指标存储
  saveMetric(metric) {
    const stmt = this.db.prepare(`
      INSERT INTO performance_metrics (
        metric_type, metric_name, value, instance_id, user_id
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      metric.type,
      metric.name,
      metric.value,
      metric.instanceId,
      metric.userId
    );
  }
  
  getMetricHistory(metricType, metricName, options = {}) {
    const {
      startTime,
      endTime,
      instanceId,
      userId,
      interval = '5m',
      limit = 1000
    } = options;
    
    let query = `
      SELECT * FROM performance_metrics
      WHERE metric_type = ? AND metric_name = ?
    `;
    const params = [metricType, metricName];
    
    if (instanceId) {
      query += ' AND instance_id = ?';
      params.push(instanceId);
    }
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (startTime) {
      query += ' AND timestamp >= ?';
      params.push(startTime);
    }
    
    if (endTime) {
      query += ' AND timestamp <= ?';
      params.push(endTime);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }
  
  // 清理旧数据
  cleanupOldData(retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // 清理旧的性能指标数据
    const metricsStmt = this.db.prepare(`
      DELETE FROM performance_metrics 
      WHERE timestamp < ?
    `);
    
    // 清理已解决的旧告警
    const alertsStmt = this.db.prepare(`
      DELETE FROM health_alerts 
      WHERE status = 'resolved' AND resolved_at < ?
    `);
    
    const metricsDeleted = metricsStmt.run(cutoffDate.toISOString());
    const alertsDeleted = alertsStmt.run(cutoffDate.toISOString());
    
    return {
      metricsDeleted: metricsDeleted.changes,
      alertsDeleted: alertsDeleted.changes
    };
  }
}

module.exports = AdminDatabase;
```

## 5. 前端路由和导航扩展

### 5.1 管理员路由配置

```javascript
// 修改文件：src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// 新增管理员组件导入
import AdminLayout from './components/admin/AdminLayout';
import InstanceMonitorPanel from './components/admin/InstanceMonitorPanel';
import InstanceOperationPanel from './components/admin/InstanceOperationPanel';
import HealthMonitorDashboard from './components/admin/HealthMonitorDashboard';
import AdminUserManagement from './components/admin/AdminUserManagement';
import AdminOperationLogs from './components/admin/AdminOperationLogs';
import AdminSettings from './components/admin/AdminSettings';

function App() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  
  return (
    <Router>
      <Routes>
        {/* 公共路由 */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        
        {/* 用户路由 */}
        <Route path="/" element={
          <ProtectedRoute user={user}>
            <MainLayout />
          </ProtectedRoute>
        } />
        
        {/* 管理员路由 */}
        <Route path="/admin" element={
          <AdminRoute user={user}>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<HealthMonitorDashboard />} />
          <Route path="instances" element={<InstanceMonitorPanel />} />
          <Route path="instances/:id" element={<InstanceOperationPanel />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route path="logs" element={<AdminOperationLogs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        
        {/* 404路由 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

// 管理员路由保护组件
function AdminRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

export default App;
```

### 5.2 管理员布局组件

```javascript
// 新增文件：src/components/admin/AdminLayout.jsx
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  
  return (
    <div className="admin-layout">
      <AdminHeader 
        user={user}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="admin-content">
        <AdminSidebar 
          isOpen={sidebarOpen}
          currentPath={location.pathname}
        />
        
        <main className={`admin-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <div className="admin-main-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
```

### 5.3 管理员侧边栏

```javascript
// 新增文件：src/components/admin/AdminSidebar.jsx
import { Link } from 'react-router-dom';
import { 
  ChartBarIcon, 
  ServerIcon, 
  UsersIcon, 
  DocumentTextIcon, 
  CogIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

function AdminSidebar({ isOpen, currentPath }) {
  const menuItems = [
    {
      path: '/admin/dashboard',
      name: '健康监控',
      icon: ChartBarIcon,
      description: '系统健康状态和性能监控'
    },
    {
      path: '/admin/instances',
      name: '实例管理',
      icon: ServerIcon,
      description: 'Claude实例监控和操作'
    },
    {
      path: '/admin/users',
      name: '用户管理',
      icon: UsersIcon,
      description: '用户账户和配额管理'
    },
    {
      path: '/admin/logs',
      name: '操作日志',
      icon: DocumentTextIcon,
      description: '管理员操作记录'
    },
    {
      path: '/admin/settings',
      name: '系统设置',
      icon: CogIcon,
      description: '系统配置和参数'
    }
  ];
  
  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>管理控制台</h2>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <Link 
            to="/" 
            className="nav-item back-to-main"
            title="返回主界面"
          >
            <HomeIcon className="nav-icon" />
            {isOpen && <span>返回主界面</span>}
          </Link>
        </div>
        
        <div className="nav-section">
          <div className="nav-section-title">
            {isOpen && '管理功能'}
          </div>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={item.description}
              >
                <Icon className="nav-icon" />
                {isOpen && (
                  <div className="nav-text">
                    <span className="nav-name">{item.name}</span>
                    <span className="nav-description">{item.description}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

export default AdminSidebar;
```

## 6. 样式和主题扩展

### 6.1 管理员界面样式

```css
/* 新增文件：src/styles/admin.css */

/* 管理员布局 */
.admin-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8fafc;
}

.admin-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 管理员头部 */
.admin-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 1rem;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.admin-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.admin-header-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.admin-header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* 管理员侧边栏 */
.admin-sidebar {
  background: white;
  border-right: 1px solid #e2e8f0;
  transition: width 0.3s ease;
  overflow-y: auto;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
}

.admin-sidebar.open {
  width: 280px;
}

.admin-sidebar.closed {
  width: 64px;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.sidebar-nav {
  padding: 1rem 0;
}

.nav-section {
  margin-bottom: 1.5rem;
}

.nav-section-title {
  padding: 0 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: #475569;
  text-decoration: none;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.nav-item.active {
  background-color: #eff6ff;
  color: #2563eb;
  border-left-color: #2563eb;
}

.nav-item.back-to-main {
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0.5rem;
}

.nav-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.nav-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nav-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.nav-description {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
}

/* 管理员主内容区 */
.admin-main {
  flex: 1;
  overflow: hidden;
  transition: margin-left 0.3s ease;
}

.admin-main.sidebar-open {
  margin-left: 0;
}

.admin-main.sidebar-closed {
  margin-left: 0;
}

.admin-main-content {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

/* 实例监控面板 */
.instance-monitor-panel {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.filter-controls {
  display: flex;
  gap: 1rem;
}

.filter-controls select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
}

.instances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
}

.instance-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.instance-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.instance-card.selected {
  border-color: #2563eb;
  background-color: #eff6ff;
}

.instance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.instance-id {
  font-weight: 600;
  color: #1e293b;
}

.instance-status {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.instance-status.running {
  background-color: #dcfce7;
  color: #166534;
}

.instance-status.idle {
  background-color: #fef3c7;
  color: #92400e;
}

.instance-status.error {
  background-color: #fee2e2;
  color: #991b1b;
}

.instance-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.125rem;
}

.info-value {
  font-weight: 500;
  color: #1e293b;
}

.instance-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: #f9fafb;
}

.action-btn.danger {
  border-color: #ef4444;
  color: #ef4444;
}

.action-btn.danger:hover {
  background-color: #fef2f2;
}

.action-btn.warning {
  border-color: #f59e0b;
  color: #f59e0b;
}

.action-btn.warning:hover {
  background-color: #fffbeb;
}

.batch-operations {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
  display: flex;
  gap: 1rem;
}

.batch-operations button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.batch-operations button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-warning {
  background-color: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background-color: #d97706;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
}

/* 健康监控仪表板 */
.health-monitor-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.dashboard-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.controls select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.health-overview {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.health-score {
  display: flex;
  justify-content: center;
  align-items: center;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 4px solid;
  position: relative;
}

.score-circle.healthy {
  border-color: #10b981;
  background-color: #ecfdf5;
}

.score-circle.warning {
  border-color: #f59e0b;
  background-color: #fffbeb;
}

.score-circle.critical {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.score {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.instance-summary h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.status-item {
  text-align: center;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 2px solid;
}

.status-item.healthy {
  border-color: #10b981;
  background-color: #ecfdf5;
}

.status-item.warning {
  border-color: #f59e0b;
  background-color: #fffbeb;
}

.status-item.critical {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.status-item.total {
  border-color: #6b7280;
  background-color: #f9fafb;
}

.status-item .count {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.status-item .label {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.system-metrics {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.system-metrics h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metric-card {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  text-align: center;
}

.metric-title {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.metric-unit {
  font-size: 0.875rem;
  color: #64748b;
  margin-left: 0.25rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .admin-sidebar.open {
    position: fixed;
    top: 64px;
    left: 0;
    height: calc(100vh - 64px);
    z-index: 50;
    width: 280px;
  }
  
  .admin-main {
    margin-left: 0;
  }
  
  .instances-grid {
    grid-template-columns: 1fr;
  }
  
  .health-overview {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .panel-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .filter-controls {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .admin-main-content {
    padding: 1rem;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .instance-info {
    grid-template-columns: 1fr;
  }
  
  .instance-actions {
    flex-direction: column;
  }
}

/* 深色主题支持 */
@media (prefers-color-scheme: dark) {
  .admin-layout {
    background-color: #0f172a;
  }
  
  .admin-header,
  .admin-sidebar,
  .instance-monitor-panel,
  .health-monitor-dashboard > *,
  .system-metrics {
    background-color: #1e293b;
    border-color: #334155;
  }
  
  .admin-header-title,
  .panel-header h2,
  .dashboard-header h2,
  .system-metrics h3,
  .instance-summary h3 {
    color: #f1f5f9;
  }
  
  .nav-item {
    color: #cbd5e1;
  }
  
  .nav-item:hover {
    background-color: #334155;
    color: #f1f5f9;
  }
  
  .nav-item.active {
    background-color: #1e40af;
    color: #dbeafe;
  }
  
  .instance-card {
    background-color: #1e293b;
    border-color: #334155;
  }
  
  .instance-card:hover {
    border-color: #3b82f6;
  }
  
  .filter-controls select,
  .controls select {
    background-color: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }
}

## 7. 实施计划和时间安排

### 7.1 开发阶段

#### 阶段一：后端API开发（1-2周）
- **目标**：完成管理员功能的后端API端点
- **任务**：
  - 实现实例管理API（获取、操作、批量处理）
  - 开发健康监控API（仪表板数据、指标历史）
  - 创建管理员操作日志系统
  - 扩展数据库表结构
  - 实现WebSocket实时推送

#### 阶段二：前端UI组件开发（2-3周）
- **目标**：构建完整的管理员界面
- **任务**：
  - 开发实例监控面板组件
  - 创建实例操作界面
  - 构建健康监控仪表板
  - 实现管理员布局和导航
  - 添加响应式设计支持

#### 阶段三：数据可视化和图表（1-2周）
- **目标**：增强数据展示和分析能力
- **任务**：
  - 集成图表库（Chart.js或D3.js）
  - 实现性能指标图表
  - 开发趋势分析功能
  - 创建实时数据更新机制

#### 阶段四：测试和优化（1-2周）
- **目标**：确保功能稳定性和性能
- **任务**：
  - 单元测试和集成测试
  - 性能优化和内存管理
  - 安全性测试和权限验证
  - 用户体验优化

### 7.2 关键里程碑

| 里程碑 | 时间 | 交付物 | 优先级 |
|--------|------|--------|--------|
| 后端API完成 | 第2周 | 完整的管理员API端点 | 高 |
| 基础UI组件 | 第4周 | 核心管理界面组件 | 高 |
| 数据可视化 | 第6周 | 图表和趋势分析 | 中 |
| 完整功能测试 | 第7周 | 全功能管理员界面 | 高 |

## 8. 技术实现细节

### 8.1 实时数据更新机制

```javascript
// 实时数据更新服务
class RealTimeDataService {
  constructor() {
    this.subscribers = new Map();
    this.updateInterval = 5000; // 5秒更新间隔
    this.isRunning = false;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.updateData();
    }, this.updateInterval);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }
  
  subscribe(component, dataType) {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, new Set());
    }
    this.subscribers.get(dataType).add(component);
  }
  
  unsubscribe(component, dataType) {
    if (this.subscribers.has(dataType)) {
      this.subscribers.get(dataType).delete(component);
    }
  }
  
  async updateData() {
    try {
      // 获取实例数据
      if (this.subscribers.has('instances')) {
        const instances = await this.fetchInstances();
        this.notifySubscribers('instances', instances);
      }
      
      // 获取健康数据
      if (this.subscribers.has('health')) {
        const health = await this.fetchHealthData();
        this.notifySubscribers('health', health);
      }
      
      // 获取系统指标
      if (this.subscribers.has('metrics')) {
        const metrics = await this.fetchSystemMetrics();
        this.notifySubscribers('metrics', metrics);
      }
    } catch (error) {
      console.error('Failed to update real-time data:', error);
    }
  }
  
  notifySubscribers(dataType, data) {
    if (this.subscribers.has(dataType)) {
      this.subscribers.get(dataType).forEach(component => {
        if (component.updateData) {
          component.updateData(data);
        }
      });
    }
  }
}
```

### 8.2 性能优化策略

```javascript
// 数据缓存和优化
class DataCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30秒缓存
  }
  
  async get(key, fetchFunction) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    try {
      const data = await fetchFunction();
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
      return data;
    } catch (error) {
      // 如果有缓存数据，返回缓存
      if (cached) {
        return cached.data;
      }
      throw error;
    }
  }
  
  invalidate(key) {
    this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
}
```

## 9. 安全性和权限控制

### 9.1 管理员权限验证

```javascript
// 增强的权限验证中间件
const requireAdminWithPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // 基础管理员验证
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // 检查具体权限
      const hasPermission = await checkAdminPermission(req.user.id, permission);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Permission '${permission}' required` 
        });
      }
      
      // 记录管理员操作
      req.adminOperation = {
        adminId: req.user.id,
        permission,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      };
      
      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// 使用示例
router.post('/instances/:id/terminate', 
  requireAdminWithPermission('instance.terminate'),
  async (req, res) => {
    // 终止实例逻辑
  }
);
```

### 9.2 操作审计日志

```javascript
// 管理员操作审计
class AdminAuditLogger {
  constructor(database) {
    this.db = database;
  }
  
  async logOperation(operation) {
    try {
      await this.db.logAdminOperation({
        ...operation,
        timestamp: new Date(),
        result: 'pending'
      });
    } catch (error) {
      console.error('Failed to log admin operation:', error);
    }
  }
  
  async updateOperationResult(operationId, result, errorMessage = null) {
    try {
      await this.db.updateAdminOperationResult(operationId, {
        result,
        errorMessage,
        completedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update operation result:', error);
    }
  }
  
  async getOperationHistory(adminId, options = {}) {
    return this.db.getAdminOperationLogs({
      adminId,
      ...options
    });
  }
}
```

## 10. 部署和维护

### 10.1 部署配置

```yaml
# docker-compose.admin.yml
version: '3.8'
services:
  claude-admin:
    build: .
    environment:
      - NODE_ENV=production
      - ADMIN_FEATURES_ENABLED=true
      - HEALTH_MONITORING_ENABLED=true
      - REAL_TIME_UPDATES_ENABLED=true
      - ADMIN_SESSION_TIMEOUT=3600
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 10.2 监控和告警

```javascript
// 系统健康检查
class SystemHealthChecker {
  constructor() {
    this.checks = [
      this.checkDatabaseConnection,
      this.checkClaudeInstances,
      this.checkSystemResources,
      this.checkWebSocketConnections
    ];
  }
  
  async performHealthCheck() {
    const results = await Promise.allSettled(
      this.checks.map(check => check.call(this))
    );
    
    const healthStatus = {
      overall: 'healthy',
      checks: {},
      timestamp: new Date()
    };
    
    results.forEach((result, index) => {
      const checkName = this.checks[index].name;
      
      if (result.status === 'fulfilled') {
        healthStatus.checks[checkName] = {
          status: 'healthy',
          ...result.value
        };
      } else {
        healthStatus.checks[checkName] = {
          status: 'unhealthy',
          error: result.reason.message
        };
        healthStatus.overall = 'unhealthy';
      }
    });
    
    return healthStatus;
  }
  
  async checkDatabaseConnection() {
    // 数据库连接检查
    const start = Date.now();
    await this.db.prepare('SELECT 1').get();
    return { responseTime: Date.now() - start };
  }
  
  async checkClaudeInstances() {
    // Claude实例健康检查
    const instances = await claudePool.getAllInstances();
    const healthyCount = instances.filter(i => i.status === 'running').length;
    
    return {
      total: instances.length,
      healthy: healthyCount,
      healthyPercentage: (healthyCount / instances.length) * 100
    };
  }
  
  async checkSystemResources() {
    // 系统资源检查
    const metrics = await resourceMonitor.getSystemMetrics();
    
    return {
      cpu: metrics.cpu.usage,
      memory: metrics.memory.usage,
      disk: metrics.disk.usage
    };
  }
  
  async checkWebSocketConnections() {
    // WebSocket连接检查
    const activeConnections = wsManager.getActiveConnectionCount();
    
    return {
      activeConnections,
      maxConnections: wsManager.maxConnections
    };
  }
}
```

## 11. 总结

### 11.1 新增功能概览

本Plan 2在Plan 1已完成的95%功能基础上，新增了完整的管理员扩展UI功能：

1. **管理员实例监控面板**
   - 实时显示所有用户的Claude实例状态
   - 支持多维度筛选和批量操作
   - 实例详细信息和性能指标展示

2. **实例操作界面**
   - 支持重启、终止、暂停、恢复等操作
   - 实例日志查看和性能图表
   - 操作确认和权限验证

3. **健康监控仪表板**
   - 系统整体健康状态评分
   - 实时性能指标监控
   - 告警管理和历史趋势分析

4. **完整的后端API支持**
   - RESTful API端点
   - WebSocket实时更新
   - 操作审计日志

### 11.2 技术优势

- **基于现有架构**：充分利用Plan 1的成熟基础，降低开发风险
- **模块化设计**：组件化开发，易于维护和扩展
- **实时性**：WebSocket支持实时数据更新
- **安全性**：完整的权限控制和操作审计
- **可扩展性**：支持未来功能扩展和定制

### 11.3 预期效果

- **管理效率提升**：管理员可以通过直观的界面管理所有Claude实例
- **系统可观测性**：全面的监控和告警机制
- **运维自动化**：减少手动操作，提高系统稳定性
- **用户体验优化**：更好的系统性能和可用性

### 11.4 实施建议

1. **分阶段实施**：按照计划分4个阶段逐步实现
2. **测试驱动**：每个阶段都要进行充分的测试
3. **用户反馈**：及时收集管理员用户的反馈意见
4. **性能监控**：持续监控系统性能和资源使用

通过实施Plan 2，Claude Code UI将成为一个功能完整、管理便捷的多租户AI编程平台，为管理员提供强大的系统管理和监控能力。