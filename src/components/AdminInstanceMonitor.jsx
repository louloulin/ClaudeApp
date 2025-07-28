import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Monitor,
  Activity,
  Users,
  Server,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  Filter,
  Search,
  Clock,
  Cpu,
  MemoryStick,
  HardDrive,
  Zap
} from 'lucide-react';

const AdminInstanceMonitor = () => {
  const { user } = useAuth();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInstances, setSelectedInstances] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    userId: '',
    sortBy: 'lastActivity',
    order: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchInstances = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(`/api/admin/instances?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances);
        setError('');
      } else {
        setError('Failed to load instances');
      }
    } catch (err) {
      setError('Error loading instances');
      console.error('Instances fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInstances();
  };

  const handleInstanceAction = async (userId, action) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/admin/instances/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchInstances(); // Refresh the list
      } else {
        const data = await response.json();
        setError(data.error || `Failed to ${action} instance`);
      }
    } catch (err) {
      setError(`Error ${action}ing instance`);
      console.error(`Instance ${action} error:`, err);
    }
  };

  const handleBatchAction = async (action) => {
    if (selectedInstances.length === 0) return;
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/admin/instances/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          userIds: selectedInstances
        })
      });

      if (response.ok) {
        setSelectedInstances([]);
        await fetchInstances();
      } else {
        const data = await response.json();
        setError(data.error || `Failed to perform batch ${action}`);
      }
    } catch (err) {
      setError(`Error performing batch ${action}`);
      console.error(`Batch ${action} error:`, err);
    }
  };

  const toggleInstanceSelection = (userId) => {
    setSelectedInstances(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusIcon = (status, health) => {
    if (status === 'active') {
      if (health?.status === 'healthy') {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      } else if (health?.status === 'unhealthy') {
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      }
      return <Activity className="w-4 h-4 text-yellow-500" />;
    }
    return <XCircle className="w-4 h-4 text-gray-500" />;
  };

  const getStatusBadge = (status, health) => {
    if (status === 'active') {
      if (health?.status === 'healthy') {
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      } else if (health?.status === 'unhealthy') {
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      }
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const filteredInstances = instances.filter(instance => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        instance.username.toLowerCase().includes(searchLower) ||
        instance.userEmail?.toLowerCase().includes(searchLower) ||
        instance.userId.toString().includes(searchLower)
      );
    }
    return true;
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchInstances();
    }
  }, [user, fetchInstances]);

  useEffect(() => {
    if (autoRefresh && user?.role === 'admin') {
      const interval = setInterval(fetchInstances, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, user, fetchInstances]);

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
          <Monitor className="w-6 h-6 mr-2" />
          Instance Monitor
        </h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Total: {filteredInstances.length} instances
          </div>
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

      {/* Filters and Search */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="lastActivity">Last Activity</option>
              <option value="createdAt">Created</option>
              <option value="username">Username</option>
              <option value="memoryUsage">Memory Usage</option>
            </select>
            <select
              value={filters.order}
              onChange={(e) => setFilters({ ...filters, order: e.target.value })}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedInstances.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 dark:text-blue-400">
              {selectedInstances.length} instance(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBatchAction('restart')}
                className="flex items-center space-x-2 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart</span>
              </button>
              <button
                onClick={() => handleBatchAction('terminate')}
                className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <Square className="w-4 h-4" />
                <span>Terminate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInstances.map((instance) => (
          <div
            key={instance.userId}
            className={`bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow ${
              selectedInstances.includes(instance.userId) ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Instance Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedInstances.includes(instance.userId)}
                  onChange={() => toggleInstanceSelection(instance.userId)}
                  className="rounded border-border"
                />
                <div>
                  <h3 className="font-semibold text-foreground">{instance.username}</h3>
                  <p className="text-sm text-muted-foreground">ID: {instance.userId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(instance.status, instance.health)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  getStatusBadge(instance.status, instance.health)
                }`}>
                  {instance.status}
                </span>
              </div>
            </div>

            {/* Instance Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">CPU</span>
                </div>
                <span className="text-sm font-medium">{instance.cpuUsage?.toFixed(1) || 0}%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Memory</span>
                </div>
                <span className="text-sm font-medium">{formatMemory(instance.memoryUsage)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Processes</span>
                </div>
                <span className="text-sm font-medium">{instance.activeProcesses || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Uptime</span>
                </div>
                <span className="text-sm font-medium">{formatUptime(instance.uptime)}</span>
              </div>
            </div>

            {/* Last Activity */}
            <div className="text-xs text-muted-foreground mb-4">
              Last activity: {new Date(instance.lastActivity).toLocaleString()}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleInstanceAction(instance.userId, 'restart')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart</span>
              </button>
              <button
                onClick={() => handleInstanceAction(instance.userId, 'terminate')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredInstances.length === 0 && (
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No instances found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search criteria.' : 'No Claude instances are currently running.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminInstanceMonitor;