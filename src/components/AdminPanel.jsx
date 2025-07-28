import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  Users,
  Monitor,
  Activity,
  Settings,
  AlertCircle,
  BarChart3,
  Server,
  Database
} from 'lucide-react';

import AdminUserManagement from './AdminUserManagement';
import AdminInstanceMonitor from './AdminInstanceMonitor';
import AdminHealthDashboard from './AdminHealthDashboard';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: BarChart3,
      description: 'System overview and key metrics'
    },
    {
      id: 'instances',
      name: 'Instance Monitor',
      icon: Monitor,
      description: 'Monitor and manage Claude instances'
    },
    {
      id: 'health',
      name: 'Health Dashboard',
      icon: Activity,
      description: 'System health and performance metrics'
    },
    {
      id: 'users',
      name: 'User Management',
      icon: Users,
      description: 'Manage users, roles, and quotas'
    }
  ];

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-8 max-w-md">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Access Denied</h2>
          </div>
          <p className="text-red-600 dark:text-red-300 mb-4">
            Administrator privileges are required to access this panel.
          </p>
          <div className="text-sm text-red-500 dark:text-red-400">
            Current role: {user?.role || 'Not authenticated'}
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview />;
      case 'instances':
        return <AdminInstanceMonitor />;
      case 'health':
        return <AdminHealthDashboard />;
      case 'users':
        return <AdminUserManagement />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Claude Code UI Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Welcome, {user.username}
              </div>
              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-sm font-medium">
                Administrator
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  <Icon className={`mr-2 h-5 w-5 ${
                    activeTab === tab.id
                      ? 'text-blue-500'
                      : 'text-muted-foreground group-hover:text-foreground'
                  }`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Overview Component
const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        const response = await fetch('/api/admin/stats/overview', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          setError('Failed to load overview stats');
        }
      } catch (err) {
        setError('Error loading overview stats');
        console.error('Overview stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">System Overview</h2>
        <p className="text-muted-foreground">
          Real-time overview of your Claude Code UI multi-tenant platform
        </p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-foreground">{stats.users.total}</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {stats.users.active} active
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          {/* Active Instances */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Claude Instances</p>
                <p className="text-3xl font-bold text-foreground">{stats.instances.active}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.instances.total} total
                </p>
              </div>
              <Server className="w-12 h-12 text-green-500" />
            </div>
          </div>

          {/* System Health */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats.instances.total > 0 
                    ? Math.round((stats.instances.healthy / stats.instances.total) * 100)
                    : 100}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.instances.healthy} healthy
                </p>
              </div>
              <Activity className="w-12 h-12 text-purple-500" />
            </div>
          </div>

          {/* System Uptime */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Uptime</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatUptime(stats.system?.uptime || 0)}
                </p>
              </div>
              <Database className="w-12 h-12 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* System Resources */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CPU Usage */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              CPU Usage
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="text-lg font-semibold text-foreground">
                  {stats.system?.cpu?.usage?.toFixed(1) || '0.0'}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    (stats.system?.cpu?.usage || 0) > 80 ? 'bg-red-500' :
                    (stats.system?.cpu?.usage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${stats.system?.cpu?.usage || 0}%` }}
                ></div>
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.system?.cpu?.cores || 'N/A'} cores available
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Memory Usage
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="text-lg font-semibold text-foreground">
                  {stats.system?.memory?.usage?.toFixed(1) || '0.0'}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    (stats.system?.memory?.usage || 0) > 80 ? 'bg-red-500' :
                    (stats.system?.memory?.usage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${stats.system?.memory?.usage || 0}%` }}
                ></div>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatBytes(stats.system?.memory?.used)} / {formatBytes(stats.system?.memory?.total)}
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Server className="w-5 h-5 mr-2" />
              Disk Usage
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="text-lg font-semibold text-foreground">
                  {stats.system?.disk?.usage?.toFixed(1) || '0.0'}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    (stats.system?.disk?.usage || 0) > 80 ? 'bg-red-500' :
                    (stats.system?.disk?.usage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${stats.system?.disk?.usage || 0}%` }}
                ></div>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatBytes(stats.system?.disk?.used)} / {formatBytes(stats.system?.disk?.total)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center space-x-2 p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Monitor className="w-5 h-5" />
            <span>View Instances</span>
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center space-x-2 p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Activity className="w-5 h-5" />
            <span>Health Check</span>
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center space-x-2 p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Users className="w-5 h-5" />
            <span>Manage Users</span>
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center space-x-2 p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>System Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;