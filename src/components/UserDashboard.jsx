import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Settings, 
  Activity, 
  HardDrive, 
  Cpu, 
  Memory, 
  Users,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

const UserDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/auth/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('Error loading dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsageColor = (current, quota) => {
    const percentage = (current / quota) * 100;
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUsageBarColor = (current, quota) => {
    const percentage = (current / quota) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
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

  const { resourceUsage, quotaCheck } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{user?.username}</h2>
            <p className="text-muted-foreground">{user?.email || 'No email provided'}</p>
            <div className="flex items-center mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user?.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                user?.role === 'moderator' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {user?.role?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Cpu className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-foreground">CPU</span>
            </div>
            <span className={`text-sm font-medium ${getUsageColor(resourceUsage?.cpu_usage || 0, user?.quotas?.cpu || 2)}`}>
              {(resourceUsage?.cpu_usage || 0).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getUsageBarColor(resourceUsage?.cpu_usage || 0, user?.quotas?.cpu || 2)}`}
              style={{ width: `${Math.min((resourceUsage?.cpu_usage || 0) / (user?.quotas?.cpu || 2) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Limit: {user?.quotas?.cpu || 2} cores
          </p>
        </div>

        {/* Memory Usage */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Memory className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-foreground">Memory</span>
            </div>
            <span className={`text-sm font-medium ${getUsageColor(resourceUsage?.memory_usage || 0, user?.quotas?.memory || 4096)}`}>
              {formatBytes(resourceUsage?.memory_usage || 0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getUsageBarColor(resourceUsage?.memory_usage || 0, user?.quotas?.memory || 4096)}`}
              style={{ width: `${Math.min((resourceUsage?.memory_usage || 0) / (user?.quotas?.memory || 4096) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Limit: {formatBytes(user?.quotas?.memory || 4096)}
          </p>
        </div>

        {/* Storage Usage */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <HardDrive className="w-5 h-5 text-purple-500 mr-2" />
              <span className="text-sm font-medium text-foreground">Storage</span>
            </div>
            <span className={`text-sm font-medium ${getUsageColor(resourceUsage?.storage_usage || 0, user?.quotas?.storage || 10240)}`}>
              {formatBytes(resourceUsage?.storage_usage || 0)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getUsageBarColor(resourceUsage?.storage_usage || 0, user?.quotas?.storage || 10240)}`}
              style={{ width: `${Math.min((resourceUsage?.storage_usage || 0) / (user?.quotas?.storage || 10240) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Limit: {formatBytes(user?.quotas?.storage || 10240)}
          </p>
        </div>

        {/* Claude Instances */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-orange-500 mr-2" />
              <span className="text-sm font-medium text-foreground">Instances</span>
            </div>
            <span className={`text-sm font-medium ${getUsageColor(resourceUsage?.active_claude_instances || 0, user?.quotas?.instances || 3)}`}>
              {resourceUsage?.active_claude_instances || 0}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getUsageBarColor(resourceUsage?.active_claude_instances || 0, user?.quotas?.instances || 3)}`}
              style={{ width: `${Math.min((resourceUsage?.active_claude_instances || 0) / (user?.quotas?.instances || 3) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Limit: {user?.quotas?.instances || 3} instances
          </p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Account Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-foreground">Account Active</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-blue-500 mr-2" />
            <span className="text-foreground">
              Last Login: {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
            </span>
          </div>
          {quotaCheck?.instances_exceeded && (
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-500">Claude instance limit reached</span>
            </div>
          )}
          {quotaCheck?.memory_exceeded && (
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-500">Memory quota exceeded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
