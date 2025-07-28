import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  Users,
  Zap,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Shield,
  Clock,
  Database
} from 'lucide-react';

const AdminHealthDashboard = () => {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHealthData = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      
      // Fetch health status
      const healthResponse = await fetch('/api/admin/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch metrics
      const metricsResponse = await fetch('/api/admin/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (healthResponse.ok && metricsResponse.ok) {
        const health = await healthResponse.json();
        const metrics = await metricsResponse.json();
        
        setHealthData(health);
        setMetricsData(metrics);
        setLastUpdated(new Date());
        setError('');
      } else {
        setError('Failed to load health data');
      }
    } catch (err) {
      setError('Error loading health data');
      console.error('Health data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealthData();
  };

  const triggerHealthCheck = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/health/check', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Refresh data after health check
        setTimeout(() => fetchHealthData(), 2000);
      } else {
        setError('Failed to trigger health check');
      }
    } catch (err) {
      setError('Error triggering health check');
      console.error('Health check error:', err);
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getSystemStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getUsageColor = (usage) => {
    if (usage >= 90) return 'text-red-600 dark:text-red-400';
    if (usage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getUsageBarColor = (usage) => {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchHealthData();
    }
  }, [user, fetchHealthData]);

  useEffect(() => {
    if (autoRefresh && user?.role === 'admin') {
      const interval = setInterval(fetchHealthData, 15000); // Refresh every 15 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, user, fetchHealthData]);

  if (user?.role !== 'admin') {
    return (
      <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700 dark:text-red-400">Admin access required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Activity className="w-6 h-6 mr-2" />
          Health Dashboard
        </h2>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">Auto-refresh</span>
          </label>
          <button
            onClick={triggerHealthCheck}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            <Shield className="w-4 h-4" />
            <span>Health Check</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* System Status Overview */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Overall Health Score */}
          <div className={`rounded-lg border border-border p-6 ${getHealthScoreBg(healthData.healthScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Health Score</p>
                <p className={`text-3xl font-bold ${getHealthScoreColor(healthData.healthScore)}`}>
                  {healthData.healthScore}%
                </p>
              </div>
              {getSystemStatusIcon(healthData.systemStatus)}
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getUsageBarColor(healthData.healthScore)}`}
                  style={{ width: `${healthData.healthScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <p className="text-xl font-semibold text-foreground capitalize">
                  {healthData.systemStatus}
                </p>
              </div>
              <Server className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          {/* Active Instances */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Instances</p>
                <p className="text-2xl font-bold text-foreground">
                  {healthData.instances.healthy}/{healthData.instances.total}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {healthData.instances.unhealthy} unhealthy, {healthData.instances.inactive} inactive
            </div>
          </div>

          {/* Active Users */}
          {metricsData && (
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold text-foreground">
                    {metricsData.current?.users?.active || 0}/{metricsData.current?.users?.total || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Metrics */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU Usage */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">CPU Usage</h3>
              </div>
              <span className={`text-lg font-bold ${getUsageColor(healthData.systemMetrics?.cpu?.usage || 0)}`}>
                {(healthData.systemMetrics?.cpu?.usage || 0).toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getUsageBarColor(healthData.systemMetrics?.cpu?.usage || 0)}`}
                  style={{ width: `${healthData.systemMetrics?.cpu?.usage || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Cores: {healthData.systemMetrics?.cpu?.cores || 'N/A'}</span>
                <span>Load: {typeof healthData.systemMetrics?.cpu?.loadAverage === 'number' ? healthData.systemMetrics.cpu.loadAverage.toFixed(2) : Array.isArray(healthData.systemMetrics?.cpu?.loadAverage) ? healthData.systemMetrics.cpu.loadAverage[0]?.toFixed(2) || 'N/A' : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MemoryStick className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Memory Usage</h3>
              </div>
              <span className={`text-lg font-bold ${getUsageColor(healthData.systemMetrics?.memory?.usage || 0)}`}>
                {(healthData.systemMetrics?.memory?.usage || 0).toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getUsageBarColor(healthData.systemMetrics?.memory?.usage || 0)}`}
                  style={{ width: `${healthData.systemMetrics?.memory?.usage || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Used: {formatBytes(healthData.systemMetrics?.memory?.used)}</span>
                <span>Total: {formatBytes(healthData.systemMetrics?.memory?.total)}</span>
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Disk Usage</h3>
              </div>
              <span className={`text-lg font-bold ${getUsageColor(healthData.systemMetrics?.disk?.usage || 0)}`}>
                {(healthData.systemMetrics?.disk?.usage || 0).toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getUsageBarColor(healthData.systemMetrics?.disk?.usage || 0)}`}
                  style={{ width: `${healthData.systemMetrics?.disk?.usage || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Used: {formatBytes(healthData.systemMetrics?.disk?.used)}</span>
                <span>Free: {formatBytes(healthData.systemMetrics?.disk?.free)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Metrics */}
      {metricsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Processes */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Processes</p>
                <p className="text-2xl font-bold text-foreground">
                  {metricsData.current?.processes || 0}
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          {/* System Uptime */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Uptime</p>
                <p className="text-lg font-bold text-foreground">
                  {formatUptime(metricsData.current?.system?.uptime || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-indigo-500" />
            </div>
          </div>

          {/* Instance Efficiency */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Instance Efficiency</p>
                <p className="text-2xl font-bold text-foreground">
                  {healthData.instances.total > 0 
                    ? Math.round((healthData.instances.healthy / healthData.instances.total) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          {/* Resource Utilization */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resource Usage</p>
                <p className="text-2xl font-bold text-foreground">
                  {(
                    ((healthData.systemMetrics?.cpu?.usage || 0) + 
                     (healthData.systemMetrics?.memory?.usage || 0) + 
                     (healthData.systemMetrics?.disk?.usage || 0)) / 3
                  ).toFixed(1)}%
                </p>
              </div>
              <Database className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Instance Status Breakdown */}
      {healthData && healthData.instances.total > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Server className="w-5 h-5 mr-2" />
            Instance Status Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {healthData.instances.healthy}
              </div>
              <div className="text-sm text-muted-foreground">Healthy</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="h-2 bg-green-500 rounded-full"
                  style={{ 
                    width: `${(healthData.instances.healthy / healthData.instances.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {healthData.instances.unhealthy}
              </div>
              <div className="text-sm text-muted-foreground">Unhealthy</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="h-2 bg-red-500 rounded-full"
                  style={{ 
                    width: `${(healthData.instances.unhealthy / healthData.instances.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {healthData.instances.inactive}
              </div>
              <div className="text-sm text-muted-foreground">Inactive</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="h-2 bg-gray-500 rounded-full"
                  style={{ 
                    width: `${(healthData.instances.inactive / healthData.instances.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHealthDashboard;