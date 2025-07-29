import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play, 
  Square, 
  Eye, 
  Calendar,
  User,
  Bot,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

/**
 * Agent 运行列表组件
 * 显示 agent 执行历史和状态
 */
function AgentRunsList({ runs = [], runningAgents = new Set(), onCancelRun, isLoading = false }) {
  const [expandedRuns, setExpandedRuns] = useState(new Set());
  const [filter, setFilter] = useState('all'); // 'all', 'running', 'completed', 'failed'
  
  // 切换运行详情展开状态
  const toggleRunExpansion = (runId) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId);
    } else {
      newExpanded.add(runId);
    }
    setExpandedRuns(newExpanded);
  };
  
  // 获取状态图标和颜色
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'running':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          color: 'text-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          label: 'Running'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-500',
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          label: 'Completed'
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-red-500',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          label: 'Failed'
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-gray-500',
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          label: 'Cancelled'
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          label: 'Pending'
        };
    }
  };
  
  // 格式化持续时间
  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end - start) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };
  
  // 过滤运行记录
  const filteredRuns = runs.filter(run => {
    if (filter === 'all') return true;
    return run.status === filter;
  });
  
  // 按时间排序（最新的在前）
  const sortedRuns = [...filteredRuns].sort((a, b) => 
    new Date(b.created_at || b.start_time) - new Date(a.created_at || a.start_time)
  );
  
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading runs...
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Agent Runs
            </h3>
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
              {runs.length}
            </span>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex items-center space-x-1">
            {['all', 'running', 'completed', 'failed'].map((filterType) => {
              const count = filterType === 'all' 
                ? runs.length 
                : runs.filter(run => run.status === filterType).length;
              
              return (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                    filter === filterType
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {filterType} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Runs List */}
      <div className="max-h-96 overflow-y-auto">
        {sortedRuns.length === 0 ? (
          <div className="p-8 text-center">
            <Bot className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'all' ? 'No agent runs yet' : `No ${filter} runs`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedRuns.map((run, index) => {
              const status = getStatusDisplay(run.status);
              const isExpanded = expandedRuns.has(run.id);
              const isRunning = runningAgents.has(run.agent_id?.toString());
              
              return (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Expand Button */}
                      <button
                        onClick={() => toggleRunExpansion(run.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      
                      {/* Status */}
                      <div className={`flex items-center space-x-2 px-2 py-1 rounded-md ${status.bg} ${status.border} border`}>
                        <span className={status.color}>{status.icon}</span>
                        <span className={`text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      
                      {/* Agent Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {run.agent_name || `Agent ${run.agent_id}`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(run.created_at || run.start_time).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDuration(run.start_time, run.end_time)}
                            </span>
                          </div>
                          {run.project_name && (
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{run.project_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {run.status === 'running' && onCancelRun && (
                        <button
                          onClick={() => onCancelRun(run.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                          title="Cancel Run"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 ml-7 pl-4 border-l-2 border-gray-200 dark:border-gray-600"
                      >
                        <div className="space-y-3">
                          {/* Task */}
                          {run.task && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                Task
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded p-2">
                                {run.task}
                              </p>
                            </div>
                          )}
                          
                          {/* Metrics */}
                          {run.metrics && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Metrics
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                                  <div className="text-gray-500 dark:text-gray-400">Input Tokens</div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {run.metrics.input_tokens?.toLocaleString() || '0'}
                                  </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                                  <div className="text-gray-500 dark:text-gray-400">Output Tokens</div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {run.metrics.output_tokens?.toLocaleString() || '0'}
                                  </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                                  <div className="text-gray-500 dark:text-gray-400">Tool Calls</div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {run.metrics.tool_calls || '0'}
                                  </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                                  <div className="text-gray-500 dark:text-gray-400">Cost</div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    ${run.metrics.cost?.toFixed(4) || '0.0000'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Error */}
                          {run.error && (
                            <div>
                              <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-1 flex items-center space-x-1">
                                <AlertCircle className="w-4 h-4" />
                                <span>Error</span>
                              </h4>
                              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
                                {run.error}
                              </p>
                            </div>
                          )}
                          
                          {/* Output Preview */}
                          {run.output && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                Output Preview
                              </h4>
                              <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded p-2 max-h-32 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">
                                  {typeof run.output === 'string' 
                                    ? run.output.substring(0, 500) + (run.output.length > 500 ? '...' : '')
                                    : JSON.stringify(run.output, null, 2).substring(0, 500)
                                  }
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentRunsList;