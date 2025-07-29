import React, { useState, useEffect } from 'react';
import { Settings, Key, Globe, User, Plus, Edit, Trash2, Check, X, Eye, EyeOff } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';
import PlatformSelector from './git-config/PlatformSelector';
import CredentialManager from './git-config/CredentialManager';
import SSHKeyGenerator from './git-config/SSHKeyGenerator';
import RemoteRepositoryConfig from './git-config/RemoteRepositoryConfig';
import { gitTheme, getButtonStyle, getAlertStyle } from '../styles/gitTheme';

const GitConfigCenter = ({ selectedProject, onClose }) => {
  const [activeTab, setActiveTab] = useState('platforms');
  const [platforms, setPlatforms] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [sshKeys, setSshKeys] = useState([]);
  const [gitUser, setGitUser] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadPlatforms(),
        loadCredentials(),
        loadSSHKeys(),
        loadGitUser()
      ]);
    } catch (error) {
      setError('加载配置数据失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlatforms = async () => {
    try {
      const response = await authenticatedFetch('/api/git-config/platforms');
      const data = await response.json();
      if (data.success) {
        setPlatforms(data.platforms || []);
      }
    } catch (error) {
      console.error('加载平台配置失败:', error);
    }
  };

  const loadCredentials = async () => {
    try {
      const response = await authenticatedFetch('/api/git-config/credentials');
      const data = await response.json();
      if (data.success) {
        setCredentials(data.credentials || []);
      }
    } catch (error) {
      console.error('加载凭据失败:', error);
    }
  };

  const loadSSHKeys = async () => {
    try {
      const response = await authenticatedFetch('/api/git-config/ssh-keys');
      const data = await response.json();
      if (data.success) {
        setSshKeys(data.sshKeys || []);
      }
    } catch (error) {
      console.error('加载SSH密钥失败:', error);
    }
  };

  const loadGitUser = async () => {
    try {
      const response = await authenticatedFetch('/api/git-config/user');
      const data = await response.json();
      if (data.success) {
        setGitUser(data.user || { name: '', email: '' });
      }
    } catch (error) {
      console.error('加载Git用户配置失败:', error);
    }
  };

  const updateGitUser = async (userData) => {
    try {
      const response = await authenticatedFetch('/api/git-config/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await response.json();
      if (data.success) {
        setGitUser(userData);
        setSuccess('Git用户配置已更新');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || '更新Git用户配置失败');
      }
    } catch (error) {
      setError('更新Git用户配置失败: ' + error.message);
    }
  };

  const tabs = [
    { id: 'platforms', label: '平台管理', icon: Globe },
    { id: 'credentials', label: '凭据管理', icon: Key },
    { id: 'ssh-keys', label: 'SSH密钥', icon: Settings },
    { id: 'user', label: '用户配置', icon: User },
    { id: 'remotes', label: '远程仓库', icon: Globe }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'platforms':
        return (
          <PlatformSelector
            platforms={platforms}
            onPlatformsChange={setPlatforms}
            onError={setError}
            onSuccess={setSuccess}
          />
        );
      case 'credentials':
        return (
          <CredentialManager
            credentials={credentials}
            platforms={platforms}
            onCredentialsChange={setCredentials}
            onError={setError}
            onSuccess={setSuccess}
          />
        );
      case 'ssh-keys':
        return (
          <SSHKeyGenerator
            sshKeys={sshKeys}
            onSSHKeysChange={setSshKeys}
            onError={setError}
            onSuccess={setSuccess}
          />
        );
      case 'user':
        return (
          <UserConfigTab
            gitUser={gitUser}
            onUpdateUser={updateGitUser}
            onError={setError}
          />
        );
      case 'remotes':
        return (
          <RemoteRepositoryConfig
            selectedProject={selectedProject}
            platforms={platforms}
            credentials={credentials}
            onError={setError}
            onSuccess={setSuccess}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Git配置管理中心
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className={`mx-6 mt-4 p-3 rounded ${getAlertStyle('error')}`}>
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {success && (
          <div className={`mx-6 mt-4 p-3 rounded ${getAlertStyle('success')}`}>
            {success}
            <button
              onClick={() => setSuccess(null)}
              className="float-right text-green-500 hover:text-green-700"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? gitTheme.tab.active.full
                    : gitTheme.tab.inactive.full
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  );
};

// User Configuration Tab Component
const UserConfigTab = ({ gitUser, onUpdateUser, onError }) => {
  const [formData, setFormData] = useState(gitUser);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setFormData(gitUser);
  }, [gitUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      onError('用户名和邮箱不能为空');
      return;
    }
    await onUpdateUser(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(gitUser);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Git用户配置
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          配置Git提交时使用的用户名和邮箱地址。这些信息将出现在提交历史中。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700"
              placeholder="输入Git用户名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              邮箱地址
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700"
              placeholder="输入邮箱地址"
            />
          </div>

          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getButtonStyle('primary')}`}
              >
                <Edit size={16} />
                <span>编辑</span>
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <Check size={16} />
                  <span>保存</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <X size={16} />
                  <span>取消</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default GitConfigCenter;