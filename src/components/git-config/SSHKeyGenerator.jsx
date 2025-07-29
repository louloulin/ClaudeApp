import React, { useState } from 'react';
import { Plus, Key, Copy, Trash2, Check, X, Download, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';

const SSHKeyGenerator = ({ sshKeys, onSSHKeysChange, onError, onSuccess }) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    name: '',
    email: '',
    keyType: 'rsa',
    keySize: '4096',
    comment: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState({});
  const [testingKey, setTestingKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const keyTypes = [
    { value: 'rsa', label: 'RSA', sizes: ['2048', '3072', '4096'] },
    { value: 'ed25519', label: 'Ed25519', sizes: ['256'] },
    { value: 'ecdsa', label: 'ECDSA', sizes: ['256', '384', '521'] }
  ];

  const handleGenerate = () => {
    setGenerateForm({
      name: '',
      email: '',
      keyType: 'rsa',
      keySize: '4096',
      comment: ''
    });
    setShowGenerateModal(true);
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!generateForm.name.trim() || !generateForm.email.trim()) {
      onError('密钥名称和邮箱不能为空');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await authenticatedFetch('/api/git-config/ssh-keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateForm)
      });

      const data = await response.json();
      if (data.success) {
        onSSHKeysChange([...sshKeys, data.sshKey]);
        onSuccess('SSH密钥已生成');
        setShowGenerateModal(false);
      } else {
        onError(data.error || '生成SSH密钥失败');
      }
    } catch (error) {
      onError('生成SSH密钥失败: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (sshKey) => {
    if (!confirm(`确定要删除SSH密钥 "${sshKey.name}" 吗？`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/git-config/ssh-keys/${sshKey.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        onSSHKeysChange(sshKeys.filter(k => k.id !== sshKey.id));
        onSuccess('SSH密钥已删除');
      } else {
        onError(data.error || '删除失败');
      }
    } catch (error) {
      onError('删除失败: ' + error.message);
    }
  };

  const handleTestConnection = async (sshKey) => {
    setTestingKey(sshKey.id);
    try {
      const response = await authenticatedFetch('/api/git-config/ssh-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: sshKey.id })
      });

      const data = await response.json();
      if (data.success) {
        onSuccess('SSH连接测试成功');
      } else {
        onError(data.error || 'SSH连接测试失败');
      }
    } catch (error) {
      onError('SSH连接测试失败: ' + error.message);
    } finally {
      setTestingKey(null);
    }
  };

  const handleCopyKey = async (keyContent, keyId) => {
    try {
      await navigator.clipboard.writeText(keyContent);
      setCopiedKey(keyId);
      onSuccess('公钥已复制到剪贴板');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      onError('复制失败: ' + error.message);
    }
  };

  const handleDownloadKey = (sshKey, type) => {
    const content = type === 'public' ? sshKey.publicKey : sshKey.privateKey;
    const filename = `${sshKey.name}_${type === 'public' ? 'id_rsa.pub' : 'id_rsa'}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePrivateKeyVisibility = (keyId) => {
    setShowPrivateKey(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const getKeyTypeLabel = (type) => {
    const keyType = keyTypes.find(t => t.value === type);
    return keyType ? keyType.label : type.toUpperCase();
  };

  const formatKeyFingerprint = (fingerprint) => {
    if (!fingerprint) return 'N/A';
    return fingerprint.match(/.{1,2}/g)?.join(':') || fingerprint;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          SSH密钥管理
        </h3>
        <button
          onClick={handleGenerate}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus size={16} />
          <span>生成密钥</span>
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          SSH密钥用于安全地访问Git仓库。生成密钥对后，将公钥添加到Git平台的SSH密钥设置中。
        </p>
      </div>

      {/* SSH Keys List */}
      <div className="space-y-4">
        {sshKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无SSH密钥，点击上方按钮生成密钥
          </div>
        ) : (
          sshKeys.map(sshKey => (
            <div
              key={sshKey.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Key size={20} className="text-gray-600 dark:text-gray-400 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {sshKey.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getKeyTypeLabel(sshKey.keyType)} {sshKey.keySize}位 • {sshKey.email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      指纹: {formatKeyFingerprint(sshKey.fingerprint)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      创建时间: {new Date(sshKey.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTestConnection(sshKey)}
                    disabled={testingKey === sshKey.id}
                    className="px-3 py-1 text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50"
                  >
                    {testingKey === sshKey.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      '测试连接'
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(sshKey)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Public Key */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      公钥 (添加到Git平台)
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCopyKey(sshKey.publicKey, sshKey.id)}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        {copiedKey === sshKey.id ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedKey === sshKey.id ? '已复制' : '复制'}</span>
                      </button>
                      <button
                        onClick={() => handleDownloadKey(sshKey, 'public')}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Download size={12} />
                        <span>下载</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={sshKey.publicKey}
                    readOnly
                    className="w-full h-20 px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md resize-none"
                  />
                </div>

                {/* Private Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      私钥 (请妥善保管)
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => togglePrivateKeyVisibility(sshKey.id)}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800"
                      >
                        {showPrivateKey[sshKey.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showPrivateKey[sshKey.id] ? '隐藏' : '显示'}</span>
                      </button>
                      <button
                        onClick={() => handleDownloadKey(sshKey, 'private')}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Download size={12} />
                        <span>下载</span>
                      </button>
                    </div>
                  </div>
                  {showPrivateKey[sshKey.id] && (
                    <textarea
                      value={sshKey.privateKey}
                      readOnly
                      className="w-full h-32 px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md resize-none"
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                生成SSH密钥
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  密钥名称 *
                </label>
                <input
                  type="text"
                  value={generateForm.name}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="例如: my-ssh-key"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  邮箱 *
                </label>
                <input
                  type="email"
                  value={generateForm.email}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  密钥类型
                </label>
                <select
                  value={generateForm.keyType}
                  onChange={(e) => {
                    const keyType = keyTypes.find(t => t.value === e.target.value);
                    setGenerateForm(prev => ({
                      ...prev,
                      keyType: e.target.value,
                      keySize: keyType?.sizes[0] || '4096'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {keyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  密钥长度
                </label>
                <select
                  value={generateForm.keySize}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, keySize: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {keyTypes.find(t => t.value === generateForm.keyType)?.sizes.map(size => (
                    <option key={size} value={size}>
                      {size} 位
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  备注 (可选)
                </label>
                <input
                  type="text"
                  value={generateForm.comment}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="密钥用途说明"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? '生成中...' : '生成密钥'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SSHKeyGenerator;