import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAgentStore from '../stores/agentStore';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Send, 
  Bot, 
  User, 
  Clock, 
  Zap,
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Loader2,
  Copy,
  Download,
  RotateCcw,
  Settings
} from 'lucide-react';

/**
 * Agent 执行组件
 * 用于运行 agent 并显示执行过程和结果
 */
function AgentExecution({ agent, selectedProject, onBack }) {
  const { 
    executeAgent, 
    cancelAgentRun, 
    fetchSessionOutput, 
    sessionOutputs, 
    runningAgents,
    error,
    clearError
  } = useAgentStore();
  
  const [task, setTask] = useState(agent?.default_task || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentRunId, setCurrentRunId] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [executionSettings, setExecutionSettings] = useState({
    max_iterations: 50,
    timeout: 300,
    auto_approve: false
  });
  
  const outputRef = useRef(null);
  const logRef = useRef(null);
  
  // 自动滚动到底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [executionLog]);
  
  // 监听会话输出更新
  useEffect(() => {
    if (currentRunId && sessionOutputs[currentRunId]) {
      const output = sessionOutputs[currentRunId];
      if (output.content) {
        setExecutionLog(prev => {
          const newLog = [...prev];
          const lastEntry = newLog[newLog.length - 1];
          
          if (lastEntry && lastEntry.type === 'output') {
            // 更新最后一个输出条目
            lastEntry.content = output.content;
            lastEntry.timestamp = new Date().toISOString();
          } else {
            // 添加新的输出条目
            newLog.push({
              id: Date.now(),
              type: 'output',
              content: output.content,
              timestamp: new Date().toISOString()
            });
          }
          
          return newLog;
        });
      }
    }
  }, [currentRunId, sessionOutputs]);
  
  // 检查是否正在运行
  const isRunning = currentRunId && runningAgents.has(currentRunId.toString());
  
  // 执行 agent
  const handleExecute = async () => {
    if (!task.trim()) {
      alert('Please enter a task for the agent to execute.');
      return;
    }
    
    setIsExecuting(true);
    setExecutionLog([]);
    clearError();
    
    // 添加开始执行日志
    const startLog = {
      id: Date.now(),
      type: 'system',
      content: `Starting execution of agent "${agent.name}"...`,
      timestamp: new Date().toISOString()
    };
    setExecutionLog([startLog]);
    
    try {
      const result = await executeAgent({
        agent_id: agent.id,
        task: task,
        project_path: selectedProject?.path,
        settings: executionSettings
      });
      
      if (result && result.run_id) {
        setCurrentRunId(result.run_id);
        
        // 添加执行开始日志
        const runLog = {
          id: Date.now() + 1,
          type: 'system',
          content: `Agent execution started with run ID: ${result.run_id}`,
          timestamp: new Date().toISOString()
        };
        setExecutionLog(prev => [...prev, runLog]);
        
        // 开始获取输出
        fetchSessionOutput(result.run_id);
      }
    } catch (error) {
      console.error('Failed to execute agent:', error);
      const errorLog = {
        id: Date.now() + 2,
        type: 'error',
        content: `Failed to start execution: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setExecutionLog(prev => [...prev, errorLog]);
    } finally {
      setIsExecuting(false);
    }
  };
  
  // 取消执行
  const handleCancel = async () => {
    if (!currentRunId) return;
    
    try {
      await cancelAgentRun(currentRunId);
      
      const cancelLog = {
        id: Date.now(),
        type: 'system',
        content: 'Execution cancelled by user',
        timestamp: new Date().toISOString()
      };
      setExecutionLog(prev => [...prev, cancelLog]);
      
      setCurrentRunId(null);
    } catch (error) {
      console.error('Failed to cancel execution:', error);
    }
  };
  
  // 重置执行
  const handleReset = () => {
    setCurrentRunId(null);
    setExecutionLog([]);
    setTask(agent?.default_task || '');
    clearError();
  };
  
  // 复制日志
  const handleCopyLog = () => {
    const logText = executionLog
      .map(entry => `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.content}`)
      .join('\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      // 可以添加一个 toast 通知
      console.log('Log copied to clipboard');
    });
  };
  
  // 导出日志
  const handleExportLog = () => {
    const logData = {
      agent: {
        name: agent.name,
        id: agent.id
      },
      task: task,
      project: selectedProject?.name,
      execution_log: executionLog,
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_execution_${agent.name}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // 获取日志条目的样式
  const getLogEntryStyle = (type) => {
    switch (type) {
      case 'system':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'output':
        return 'text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700';
      default:
        return 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700';
    }
  };
  
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
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                {agent?.icon ? (
                  <span className="text-lg">{agent.icon}</span>
                ) : (
                  <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Execute: {agent?.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedProject ? `Project: ${selectedProject.name}` : 'No project selected'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {executionLog.length > 0 && (
              <>
                <button
                  onClick={handleCopyLog}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Log</span>
                </button>
                <button
                  onClick={handleExportLog}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </>
            )}
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
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
          </div>
        </motion.div>
      )}
      
      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-4 py-3"
          >
            <div className="max-w-4xl mx-auto">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Execution Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Iterations
                  </label>
                  <input
                    type="number"
                    value={executionSettings.max_iterations}
                    onChange={(e) => setExecutionSettings(prev => ({
                      ...prev,
                      max_iterations: parseInt(e.target.value) || 50
                    }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={executionSettings.timeout}
                    onChange={(e) => setExecutionSettings(prev => ({
                      ...prev,
                      timeout: parseInt(e.target.value) || 300
                    }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="30"
                    max="3600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Auto Approve
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={executionSettings.auto_approve}
                      onChange={(e) => setExecutionSettings(prev => ({
                        ...prev,
                        auto_approve: e.target.checked
                      }))}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      Auto-approve tool calls
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {/* Task Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Task for {agent?.name}
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Describe what you want the agent to do..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={isRunning}
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {task.length} characters
                  </span>
                  <div className="flex items-center space-x-2">
                    {isRunning ? (
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                      >
                        <Square className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleExecute}
                        disabled={isExecuting || !task.trim()}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isExecuting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <span>{isExecuting ? 'Starting...' : 'Execute'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Execution Output */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          >
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    {agent?.icon ? (
                      <span className="text-lg">{agent.icon}</span>
                    ) : (
                      <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Execution Output
                  </h3>
                </div>
                
                {isRunning && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running...</span>
                  </div>
                )}
              </div>
            </div>
            
            <div 
              ref={outputRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
            >
              {executionLog.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Ready to execute. Enter a task and click Execute to start.
                    </p>
                  </div>
                </div>
              ) : (
                executionLog.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg ${getLogEntryStyle(entry.type)}`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {entry.type === 'system' && <Clock className="w-4 h-4" />}
                        {entry.type === 'error' && <XCircle className="w-4 h-4" />}
                        {entry.type === 'output' && <Bot className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                          </span>
                          <span className="text-xs opacity-60">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {entry.content}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AgentExecution;