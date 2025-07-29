import React, { useState } from 'react';
import { Plus, Edit, Trash2, Check, X, Eye, EyeOff, Key, Lock, User } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';

const CredentialManager = ({ credentials, platforms, onCredentialsChange, onError, onSuccess }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'token',
    platformId: '',
    username: '',
    token: '',
    password: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testingCredential, setTestingCredential] = useState(null);

  const credentialTypes = [
    { value: 'token', label: 'Personal Access Token', icon: Key },
    { value: 'oauth', label: 'OAuth Token', icon: Lock },
    { value: 'password', label: '用户名密码', icon: User }
  ];

  const handleAdd = () => {
    setFormData({
      name: '',
      type: 'token',
      platformId: platforms.length > 0 ? platforms[0].id : '',
      username: '',
      token: '',
      password: '',
      description: ''
    });
    setEditingCredential(null);
    setShowAddModal(true);
  };

  const handleEdit = (credential) => {
    setFormData({
      name: credential.name,
      type: credential.type,
      platformId: credential.platformId,
      username: credential.username || '',
      token: credential.token || '',
      password: '', // Don't show existing password
      description: credential.description || ''
    });
    setEditingCredential(credential);
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.platformId) {
      onError('凭据名称和平台不能为空');
      return;
    }

    if (formData.type === 'token' && !formData.token.trim()) {
      onError('Token不能为空');
      return;
    }

    if (formData.type === 'password' && (!formData.username.trim() || !formData.password.trim())) {
      onError('用户名和密码不能为空');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCredential 
        ? `/api/git-config/credentials/${editingCredential.id}`
        : '/api/git-config/credentials';
      const method = editingCredential ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        if (editingCredential) {
          onCredentialsChange(credentials.map(c => 
            c.id === editingCredential.id ? { ...c, ...formData, token: '***', password: '***' } : c
          ));
          onSuccess('凭据已更新');
        } else {
          onCredentialsChange([...credentials, { ...formData, id: data.id, token: '***', password: '***' }]);
          onSuccess('凭据已添加');
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

  const handleDelete = async (credential) => {
    if (!confirm(`确定要删除凭据 "${credential.name}" 吗？`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/git-config/credentials/${credential.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        onCredentialsChange(credentials.filter(c => c.id !== credential.id));
        onSuccess('凭据已删除');
      } else {
        onError(data.error || '删除失败');
      }
    } catch (error) {
      onError('删除失败: ' + error.message);
    }
  };

  const handleTestCredential = async (credential) => {
    setTestingCredential(credential.id);
    try {
      const response = await authenticatedFetch(`/api/git-config/credentials/${credential.id}/test`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        onSuccess('凭据验证成功');
      } else {
        onError(data.error || '凭据验证失败');
      }
    } catch (error) {
      onError('凭据验证失败: ' + error.message);
    } finally {
      setTestingCredential(null);
    }
  };

  const getPlatformName = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.name : '未知平台';
  };

  const getCredentialTypeIcon = (type) => {
    const credType = credentialTypes.find(t => t.value === type);
    return credType?.icon || Key;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          凭据管理
        </h3>
        <button
          onClick={handleAdd}
          disabled={platforms.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          <span>添加凭据</span>
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          管理用于访问Git平台的认证凭据，包括Personal Access Token、OAuth Token和用户名密码。
          {platforms.length === 0 && (
            <span className="block mt-2 text-amber-600 dark:text-amber-400">
              请先添加平台配置才能创建凭据。
            </span>
          )}
        </p>
      </div>

      {/* Credential List */}
      <div className="space-y-4">
        {credentials.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无配置的凭据，点击上方按钮添加凭据
          </div>
        ) : (
          credentials.map(credential => {
            const Icon = getCredentialTypeIcon(credential.type);
            return (
              <div
                key={credential.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon size={20} className="text-gray-600 dark:text-gray-400" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {credential.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getPlatformName(credential.platformId)} • {credentialTypes.find(t => t.value === credential.type)?.label}
                      </p>
                      {credential.username && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          用户名: {credential.username}
                        </p>
                      )}
                      {credential.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {credential.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTestCredential(credential)}
                      disabled={testingCredential === credential.id}
                      className="px-3 py-1 text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50"
                    >
                      {testingCredential === credential.id ? '测试中...' : '测试'}
                    </button>
                    <button
                      onClick={() => handleEdit(credential)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(credential)}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingCredential ? '编辑凭据' : '添加凭据'}
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
                  凭据名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="例如: GitHub主账号"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  关联平台
                </label>
                <select
                  value={formData.platformId}
                  onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">选择平台</option>
                  {platforms.map(platform => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  凭据类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {credentialTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {(formData.type === 'password' || formData.type === 'oauth') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="输入用户名"
                    required={formData.type === 'password'}
                  />
                </div>
              )}

              {formData.type === 'token' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Personal Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.token}
                      onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="输入Personal Access Token"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {formData.type === 'password' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder={editingCredential ? '留空表示不修改密码' : '输入密码'}
                      required={!editingCredential}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  描述 (可选)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="凭据描述信息"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check size={16} />
                  )}
                  <span>{editingCredential ? '更新' : '添加'}</span>
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

export default CredentialManager;