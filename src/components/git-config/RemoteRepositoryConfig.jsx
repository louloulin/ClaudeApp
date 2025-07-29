import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Globe, CheckCircle, AlertCircle, X, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';
import { gitTheme, getButtonStyle, getAlertStyle } from '../../styles/gitTheme';

const RemoteRepositoryConfig = ({ selectedProject, platforms, credentials, onError, onSuccess }) => {
  const [remotes, setRemotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRemote, setEditingRemote] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    platform: '',
    credentialId: ''
  });

  useEffect(() => {
    if (selectedProject) {
      loadRemotes();
    }
  }, [selectedProject]);

  const loadRemotes = async () => {
    if (!selectedProject) return;
    
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/git/remotes?project=${encodeURIComponent(selectedProject)}`);
      const data = await response.json();
      if (data.success) {
        setRemotes(data.remotes || []);
      } else {
        onError(data.error || '加载远程仓库失败');
      }
    } catch (error) {
      onError('加载远程仓库失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url) {
      onError('请填写远程仓库名称和URL');
      return;
    }

    try {
      const url = editingRemote 
        ? `/api/git/remotes/${editingRemote.name}`
        : '/api/git/remotes';
      const method = editingRemote ? 'PUT' : 'POST';
      
      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          project: selectedProject
        })
      });
      
      const data = await response.json();
      if (data.success) {
        onSuccess(editingRemote ? '远程仓库已更新' : '远程仓库已添加');
        resetForm();
        loadRemotes();
      } else {
        onError(data.error || '操作失败');
      }
    } catch (error) {
      onError('操作失败: ' + error.message);
    }
  };

  const handleDelete = async (remoteName) => {
    if (!confirm(`确定要删除远程仓库 "${remoteName}" 吗？`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/git/remotes/${remoteName}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: selectedProject })
      });
      
      const data = await response.json();
      if (data.success) {
        onSuccess('远程仓库已删除');
        loadRemotes();
      } else {
        onError(data.error || '删除失败');
      }
    } catch (error) {
      onError('删除失败: ' + error.message);
    }
  };

  const handleEdit = (remote) => {
    setEditingRemote(remote);
    setFormData({
      name: remote.name,
      url: remote.url,
      platform: remote.platform || '',
      credentialId: remote.credentialId || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      platform: '',
      credentialId: ''
    });
    setEditingRemote(null);
    setShowAddForm(false);
  };

  const testConnection = async (remote) => {
    try {
      const response = await authenticatedFetch('/api/git/remotes/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: selectedProject,
          remoteName: remote.name
        })
      });
      
      const data = await response.json();
      if (data.success) {
        onSuccess(`远程仓库 "${remote.name}" 连接正常`);
      } else {
        onError(data.error || '连接测试失败');
      }
    } catch (error) {
      onError('连接测试失败: ' + error.message);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'github':
        return '🐙';
      case 'gitee':
        return '🦄';
      case 'gitcode':
        return '🚀';
      default:
        return '🌐';
    }
  };

  if (!selectedProject) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Globe size={48} className="mx-auto mb-4 opacity-50" />
        <p>请先选择一个项目来管理远程仓库</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            远程仓库配置
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            项目: {selectedProject}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={loadRemotes}
            disabled={isLoading}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${getButtonStyle('primary')}`}
          >
            <Plus size={16} />
            <span>添加远程仓库</span>
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            {editingRemote ? '编辑远程仓库' : '添加远程仓库'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  远程仓库名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: origin"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  仓库URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  平台类型
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">选择平台</option>
                  {platforms.map(platform => (
                    <option key={platform.id} value={platform.type}>
                      {platform.name} ({platform.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  认证凭据
                </label>
                <select
                  value={formData.credentialId}
                  onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">选择凭据</option>
                  {credentials
                    .filter(cred => !formData.platform || cred.platform === formData.platform)
                    .map(credential => (
                    <option key={credential.id} value={credential.id}>
                      {credential.name} ({credential.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-md transition-colors ${getButtonStyle('primary')}`}
              >
                {editingRemote ? '更新' : '添加'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Remotes List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw size={32} className="animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400 mt-2">加载中...</p>
          </div>
        ) : remotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Globe size={48} className="mx-auto mb-4 opacity-50" />
            <p>暂无远程仓库配置</p>
            <p className="text-sm mt-2">点击上方按钮添加远程仓库</p>
          </div>
        ) : (
          remotes.map((remote) => (
            <div
              key={remote.name}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getPlatformIcon(remote.platform)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {remote.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                        {remote.url}
                      </p>
                      {remote.platform && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {remote.platform}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testConnection(remote)}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-md transition-colors"
                    title="测试连接"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(remote)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
                    title="编辑"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(remote.name)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-md transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RemoteRepositoryConfig;