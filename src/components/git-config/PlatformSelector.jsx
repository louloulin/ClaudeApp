import React, { useState } from 'react';
import { Plus, Edit, Trash2, Check, X, Github, GitBranch, Globe } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';
import { gitTheme, getButtonStyle, getAlertStyle } from '../../styles/gitTheme';

const PlatformSelector = ({ platforms, onPlatformsChange, onError, onSuccess }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'github',
    baseUrl: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const platformTypes = [
    { value: 'github', label: 'GitHub', icon: Github, defaultUrl: 'https://github.com' },
    { value: 'gitee', label: 'Gitee', icon: GitBranch, defaultUrl: 'https://gitee.com' },
    { value: 'gitcode', label: 'GitCode', icon: Globe, defaultUrl: 'https://gitcode.net' },
    { value: 'gitlab', label: 'GitLab', icon: GitBranch, defaultUrl: 'https://gitlab.com' },
    { value: 'custom', label: '自定义', icon: Globe, defaultUrl: '' }
  ];

  const handleAdd = () => {
    setFormData({
      name: '',
      type: 'github',
      baseUrl: 'https://github.com',
      description: ''
    });
    setEditingPlatform(null);
    setShowAddModal(true);
  };

  const handleEdit = (platform) => {
    setFormData({
      name: platform.name,
      type: platform.type,
      baseUrl: platform.baseUrl,
      description: platform.description || ''
    });
    setEditingPlatform(platform);
    setShowAddModal(true);
  };

  const handleTypeChange = (type) => {
    const platformType = platformTypes.find(p => p.value === type);
    setFormData({
      ...formData,
      type,
      baseUrl: platformType?.defaultUrl || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.baseUrl.trim()) {
      onError('平台名称和URL不能为空');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingPlatform 
        ? `/api/git-config/platforms/${editingPlatform.id}`
        : '/api/git-config/platforms';
      const method = editingPlatform ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        if (editingPlatform) {
          onPlatformsChange(platforms.map(p => 
            p.id === editingPlatform.id ? { ...p, ...formData } : p
          ));
          onSuccess('平台配置已更新');
        } else {
          onPlatformsChange([...platforms, { ...formData, id: data.id }]);
          onSuccess('平台配置已添加');
        }
        setShowAddModal(false);
      } else {
        onError(data.error || '操作失败');
      }
    } catch (error) {
      onError('操作失败: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (platform) => {
    if (!confirm(`确定要删除平台 "${platform.name}" 吗？`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/git-config/platforms/${platform.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        onPlatformsChange(platforms.filter(p => p.id !== platform.id));
        onSuccess('平台配置已删除');
      } else {
        onError(data.error || '删除失败');
      }
    } catch (error) {
      onError('删除失败: ' + error.message);
    }
  };

  const getPlatformIcon = (type) => {
    const platformType = platformTypes.find(p => p.value === type);
    return platformType?.icon || Globe;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Git平台管理
        </h3>
        <button
          onClick={handleAdd}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getButtonStyle('primary')}`}
        >
          <Plus size={16} />
          <span>添加平台</span>
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          配置支持的Git平台，包括GitHub、Gitee、GitCode等。每个平台可以配置不同的认证方式和API端点。
        </p>
      </div>

      {/* Platform List */}
      <div className="space-y-4">
        {platforms.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无配置的平台，点击上方按钮添加平台
          </div>
        ) : (
          platforms.map(platform => {
            const Icon = getPlatformIcon(platform.type);
            return (
              <div
                key={platform.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon size={20} className="text-gray-600 dark:text-gray-400" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {platform.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {platform.baseUrl}
                      </p>
                      {platform.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {platform.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                      {platformTypes.find(p => p.value === platform.type)?.label || platform.type}
                    </span>
                    <button
                      onClick={() => handleEdit(platform)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(platform)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingPlatform ? '编辑平台' : '添加平台'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  平台名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="例如: 我的GitHub"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  平台类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {platformTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  基础URL
                </label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://github.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  描述 (可选)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="平台描述信息"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${getButtonStyle('primary')}`}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check size={16} />
                  )}
                  <span>{editingPlatform ? '更新' : '添加'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <X size={16} />
                  <span>取消</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformSelector;