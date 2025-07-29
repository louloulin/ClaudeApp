import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useUsageStore from '../stores/usageStore';
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  MessageSquare, 
  Zap,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Loader2,
  AlertCircle,
  XCircle
} from 'lucide-react';

/**
 * 使用分析仪表板组件
 * 基于 claudia 项目的 UsageDashboard.tsx 设计
 */
function UsageDashboard({ onBack }) {
  const {
    usageStats,
    sessionStats,
    dailyUsage,
    projectUsage,
    modelUsage,
    dateRange,
    modelFilter,
    projectFilter,
    isLoadingStats,
    isLoadingSessions,
    error,
    fetchUsageStats,
    fetchSessionStats,
    setDateRange,
    setModelFilter,
    setProjectFilter,
    formatCurrency,
    formatNumber,
    formatTokens,
    getModelDisplayName,
    getModelColor,
    clearError
  } = useUsageStore();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  // 日期范围选项
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];
  
  // 标签页选项
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'models', label: 'By Model', icon: PieChart },
    { id: 'projects', label: 'By Project', icon: Activity },
    { id: 'sessions', label: 'By Session', icon: MessageSquare },
    { id: 'timeline', label: 'Timeline', icon: TrendingUp }
  ];
  
  // 初始加载数据
  useEffect(() => {
    fetchUsageStats();
    fetchSessionStats();
  }, [dateRange, modelFilter, projectFilter]);
  
  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUsageStats(true), // 强制刷新
        fetchSessionStats(true)
      ]);
    } finally {
      setRefreshing(false);
    }
  };
  
  // 导出数据
  const handleExport = () => {
    const exportData = {
      usage_stats: usageStats,
      session_stats: sessionStats,
      daily_usage: dailyUsage,
      project_usage: projectUsage,
      model_usage: modelUsage,
      filters: {
        date_range: dateRange,
        model_filter: modelFilter,
        project_filter: projectFilter
      },
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // 渲染统计卡片
  const renderStatCard = (title, value, icon, color, subtitle = null) => {
    const Icon = icon;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </motion.div>
    );
  };
  
  // 渲染概览标签页
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 主要统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderStatCard(
          'Total Cost',
          formatCurrency(usageStats?.total_cost || 0),
          DollarSign,
          'bg-green-500'
        )}
        {renderStatCard(
          'Total Sessions',
          formatNumber(sessionStats?.total_sessions || 0),
          MessageSquare,
          'bg-blue-500'
        )}
        {renderStatCard(
          'Total Tokens',
          formatTokens(usageStats?.total_tokens || 0),
          Zap,
          'bg-purple-500'
        )}
        {renderStatCard(
          'Avg Session Cost',
          formatCurrency(usageStats?.avg_session_cost || 0),
          TrendingUp,
          'bg-orange-500'
        )}
      </div>
      
      {/* 令牌细分 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Token Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatTokens(usageStats?.input_tokens || 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Input Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatTokens(usageStats?.output_tokens || 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Output Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatTokens(usageStats?.cache_read_tokens || 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Read</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatTokens(usageStats?.cache_write_tokens || 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Write</div>
          </div>
        </div>
      </div>
      
      {/* 热门模型和项目 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 热门模型 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Top Models
          </h3>
          <div className="space-y-3">
            {modelUsage?.slice(0, 5).map((model, index) => (
              <div key={model.model} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getModelColor(model.model) }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {getModelDisplayName(model.model)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(model.total_cost)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {model.session_count} sessions
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 热门项目 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Top Projects
          </h3>
          <div className="space-y-3">
            {projectUsage?.slice(0, 5).map((project, index) => (
              <div key={project.project} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {project.project || 'Unknown Project'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(project.total_cost)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {project.session_count} sessions
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  
  // 渲染模型标签页
  const renderModelsTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Usage by Model
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Model
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Sessions
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Input Tokens
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Output Tokens
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cache Read
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cache Write
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {modelUsage?.map((model) => (
              <tr key={model.model} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getModelColor(model.model) }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getModelDisplayName(model.model)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {formatNumber(model.session_count)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(model.total_cost)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {formatTokens(model.input_tokens)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {formatTokens(model.output_tokens)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {formatTokens(model.cache_read_tokens)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {formatTokens(model.cache_write_tokens)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  
  // 渲染项目标签页
  const renderProjectsTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Usage by Project
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Sessions
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Avg Cost/Session
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {projectUsage?.map((project) => (
              <tr key={project.project} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {project.project || 'Unknown Project'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {formatNumber(project.session_count)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(project.total_cost)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {formatCurrency(project.total_cost / project.session_count)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {project.last_activity ? new Date(project.last_activity).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 渲染会话标签页
  const renderSessionsTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Session Details
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Individual session usage and costs
        </p>
      </div>
      <div className="overflow-x-auto">
        {isLoadingSessions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading sessions...</span>
          </div>
        ) : sessionStats?.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Session ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sessionStats.map((session, index) => (
                <tr key={session.session_id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {session.session_id ? session.session_id.substring(0, 8) + '...' : `Session ${index + 1}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {session.project_name || session.project_path || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getModelColor(session.model || 'unknown').replace('text-', '#') }}
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getModelDisplayName(session.model || 'Unknown')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(session.total_cost || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div>In: {formatTokens(session.input_tokens || 0)}</div>
                      <div>Out: {formatTokens(session.output_tokens || 0)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No session data available for the selected time range
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染时间线标签页
  const renderTimelineTab = () => {
    if (!dailyUsage || dailyUsage.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No daily usage data available for the selected time range
            </p>
          </div>
        </div>
      );
    }

    const maxCost = Math.max(...dailyUsage.map(d => d.total_cost || 0));
    const maxTokens = Math.max(...dailyUsage.map(d => d.total_tokens || 0));

    return (
      <div className="space-y-6">
        {/* 时间线图表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Daily Usage Timeline</span>
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">Cost</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-400">Tokens</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            {/* Chart container */}
            <div className="flex items-end space-x-1 h-64 border-l border-b border-gray-200 dark:border-gray-700 pl-4 pb-4">
              {dailyUsage.slice().reverse().slice(0, 30).map((day, index) => {
                const costHeight = maxCost > 0 ? (day.total_cost / maxCost) * 100 : 0;
                const tokenHeight = maxTokens > 0 ? ((day.total_tokens || 0) / maxTokens) * 100 : 0;
                const date = new Date(day.date);
                
                return (
                  <div key={day.date} className="flex-1 h-full flex flex-col items-center justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg p-3 whitespace-nowrap">
                        <p className="font-semibold">{date.toLocaleDateString()}</p>
                        <p className="mt-1">Cost: {formatCurrency(day.total_cost || 0)}</p>
                        <p>Tokens: {formatTokens(day.total_tokens || 0)}</p>
                        <p>Sessions: {day.session_count || 0}</p>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                      </div>
                    </div>
                    
                    {/* Bars */}
                    <div className="w-full flex space-x-0.5">
                      {/* Cost bar */}
                      <div 
                        className="flex-1 bg-blue-500 hover:bg-blue-600 transition-colors rounded-t cursor-pointer"
                        style={{ height: `${costHeight}%` }}
                      />
                      {/* Token bar */}
                      <div 
                        className="flex-1 bg-green-500 hover:bg-green-600 transition-colors rounded-t cursor-pointer"
                        style={{ height: `${tokenHeight}%` }}
                      />
                    </div>
                    
                    {/* Date label */}
                    <div className="absolute top-full mt-2 text-xs text-gray-500 dark:text-gray-400 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-2">
              <span>{formatCurrency(maxCost)}</span>
              <span>{formatCurrency(maxCost / 2)}</span>
              <span>$0</span>
            </div>
          </div>
        </div>

        {/* 每日详细统计 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Daily Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Input Tokens
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Output Tokens
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Models Used
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {dailyUsage.slice().reverse().map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatNumber(day.session_count || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(day.total_cost || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatTokens(day.input_tokens || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatTokens(day.output_tokens || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {day.models_used?.slice(0, 3).map((model) => (
                          <span 
                            key={model}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          >
                            {getModelDisplayName(model)}
                          </span>
                        ))}
                        {day.models_used?.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{day.models_used.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
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
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Usage Analytics
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Monitor your Claude API usage and costs
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-md flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t border-l border-r border-gray-200 dark:border-gray-700'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
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
        <div className="max-w-7xl mx-auto">
          {isLoadingStats ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading usage data...
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'models' && renderModelsTab()}
                {activeTab === 'projects' && renderProjectsTab()}
                {activeTab === 'sessions' && renderSessionsTab()}
                {activeTab === 'timeline' && renderTimelineTab()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsageDashboard;