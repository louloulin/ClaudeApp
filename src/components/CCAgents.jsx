import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAgentStore from '../stores/agentStore';
import CreateAgent from './CreateAgent';
import AgentExecution from './AgentExecution';
import AgentRunsList from './AgentRunsList';
import { 
  Play, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Plus, 
  ArrowLeft,
  Bot,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

/**
 * CC Agents 主面板组件
 * 基于 claudia 项目的 CCAgents.tsx 设计
 */
function CCAgents({ onBack, selectedProject }) {
  const {
    agents,
    agentRuns,
    runningAgents,
    isLoadingAgents,
    isLoadingRuns,
    error,
    fetchAgents,
    fetchAgentRuns,
    deleteAgent,
    executeAgent,
    cancelAgentRun,
    clearError,
    startPolling,
    stopPolling
  } = useAgentStore();
  
  const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'execute'
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [showRunsList, setShowRunsList] = useState(false);
  
  const agentsPerPage = 6;
  
  useEffect(() => {
    // 初始加载数据
    fetchAgents();
    fetchAgentRuns();
    
    // 开始轮询运行中的 agents
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, []);
  
  // 处理 agent 执行
  const handleExecuteAgent = (agent) => {
    setSelectedAgent(agent);
    setView('execute');
  };
  
  // 处理 agent 编辑
  const handleEditAgent = (agent) => {
    setSelectedAgent(agent);
    setView('edit');
  };
  
  // 处理 agent 删除
  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;
    
    try {
      await deleteAgent(agentToDelete.id);
      setShowDeleteDialog(false);
      setAgentToDelete(null);
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };
  
  // 处理 agent 导出
  const handleExportAgent = async (agent) => {
    try {
      // 创建导出数据
      const exportData = {
        name: agent.name,
        icon: agent.icon,
        system_prompt: agent.system_prompt,
        default_task: agent.default_task,
        model: agent.model,
        created_at: agent.created_at,
        version: '1.0'
      };
      
      // 创建下载链接
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${agent.name.replace(/[^a-zA-Z0-9]/g, '_')}.claudia.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export agent:', error);
    }
  };
  
  // 处理 agent 导入
  const handleImportAgent = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.claudia.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const agentData = JSON.parse(text);
        
        // 验证导入数据格式
        if (!agentData.name || !agentData.system_prompt) {
          throw new Error('Invalid agent file format');
        }
        
        // 创建新 agent
        setSelectedAgent({
          ...agentData,
          id: null // 新 agent
        });
        setView('create');
      } catch (error) {
        console.error('Failed to import agent:', error);
        alert('Failed to import agent: ' + error.message);
      }
    };
    input.click();
  };
  
  // 获取状态图标
  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };
  
  // 分页逻辑
  const totalPages = Math.ceil(agents.length / agentsPerPage);
  const startIndex = (currentPage - 1) * agentsPerPage;
  const paginatedAgents = agents.slice(startIndex, startIndex + agentsPerPage);
  
  // 渲染不同视图
  if (view === 'create' || view === 'edit') {
    return (
      <CreateAgent
        agent={selectedAgent}
        onBack={() => {
          setView('list');
          setSelectedAgent(null);
          fetchAgents(true); // 刷新列表
        }}
        isEdit={view === 'edit'}
      />
    );
  }
  
  if (view === 'execute') {
    return (
      <AgentExecution
        agent={selectedAgent}
        selectedProject={selectedProject}
        onBack={() => {
          setView('list');
          setSelectedAgent(null);
        }}
      />
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                CC Agents
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage and execute your Claude Code agents
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleImportAgent}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>
            <button
              onClick={() => setShowRunsList(!showRunsList)}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>Runs</span>
            </button>
            <button
              onClick={() => setView('create')}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Agent</span>
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-6xl mx-auto">
          {/* Runs List Toggle */}
          <AnimatePresence>
            {showRunsList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <AgentRunsList
                  runs={agentRuns}
                  runningAgents={runningAgents}
                  onCancelRun={cancelAgentRun}
                  isLoading={isLoadingRuns}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Loading State */}
          {isLoadingAgents ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading agents...
                </p>
              </div>
            </div>
          ) : agents.length === 0 ? (
            /* Empty State */
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-md">
                <Bot className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Agents Yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Create your first CC Agent to automate tasks and workflows.
                </p>
                <button
                  onClick={() => setView('create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Agent</span>
                </button>
              </div>
            </div>
          ) : (
            /* Agents Grid */
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
              >
                {paginatedAgents.map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          {agent.icon ? (
                            <span className="text-lg">{agent.icon}</span>
                          ) : (
                            <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {agent.name}
                          </h3>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(agent.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Running Status */}
                      {runningAgents.has(agent.id?.toString()) && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Running</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {agent.system_prompt?.substring(0, 100)}...
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleExecuteAgent(agent)}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                          title="Execute Agent"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditAgent(agent)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                          title="Edit Agent"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportAgent(agent)}
                          className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                          title="Export Agent"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAgentToDelete(agent);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                          title="Delete Agent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {agent.model || 'claude-3.5-sonnet'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Delete Agent
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{agentToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setAgentToDelete(null);
                }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAgent}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default CCAgents;