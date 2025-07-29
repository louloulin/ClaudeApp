import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { api } from '../utils/api';

// Usage Analytics Store - 基于 claudia 项目的使用分析设计
const useUsageStore = create(
  subscribeWithSelector((set, get) => ({
    // 使用统计数据
    usageStats: null,
    sessionStats: null,
    dailyUsage: [],
    projectUsage: [],
    modelUsage: [],
    
    // UI 状态
    isLoadingStats: false,
    isLoadingSessions: false,
    error: null,
    lastFetchTime: 0,
    
    // 过滤器状态
    selectedDateRange: 'all', // 'all', '7d', '30d'
    selectedModel: null,
    selectedProject: null,
    
    // Actions
    
    // 获取使用统计
    fetchUsageStats: async (forceRefresh = false) => {
      const now = Date.now();
      const { lastFetchTime, selectedDateRange } = get();
      
      // 缓存 30 秒，除非强制刷新
      if (!forceRefresh && now - lastFetchTime < 30000) {
        return;
      }
      
      set({ isLoadingStats: true, error: null });
      
      try {
        let statsData;
        
        if (selectedDateRange === 'all') {
          statsData = await api.getUsageStats();
        } else {
          const endDate = new Date();
          const startDate = new Date();
          const days = selectedDateRange === '7d' ? 7 : 30;
          startDate.setDate(startDate.getDate() - days);
          
          statsData = await api.getUsageByDateRange(
            startDate.toISOString(),
            endDate.toISOString()
          );
        }
        
        set({
          usageStats: statsData,
          dailyUsage: statsData.by_date || [],
          projectUsage: statsData.by_project || [],
          modelUsage: statsData.by_model || [],
          isLoadingStats: false,
          lastFetchTime: now
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch usage stats',
          isLoadingStats: false
        });
      }
    },
    
    // 获取会话统计
    fetchSessionStats: async (forceRefresh = false) => {
      const now = Date.now();
      const { lastFetchTime, selectedDateRange } = get();
      
      if (!forceRefresh && now - lastFetchTime < 30000) {
        return;
      }
      
      set({ isLoadingSessions: true, error: null });
      
      try {
        let sessionData;
        
        if (selectedDateRange === 'all') {
          sessionData = await api.getSessionStats();
        } else {
          const endDate = new Date();
          const startDate = new Date();
          const days = selectedDateRange === '7d' ? 7 : 30;
          startDate.setDate(startDate.getDate() - days);
          
          const formatDateForApi = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
          };
          
          sessionData = await api.getSessionStats(
            formatDateForApi(startDate),
            formatDateForApi(endDate),
            'desc'
          );
        }
        
        set({
          sessionStats: sessionData,
          isLoadingSessions: false,
          lastFetchTime: now
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch session stats',
          isLoadingSessions: false
        });
      }
    },
    
    // 设置日期范围过滤器
    setDateRange: (range) => {
      set({ selectedDateRange: range });
      // 自动重新获取数据
      get().fetchUsageStats(true);
      get().fetchSessionStats(true);
    },
    
    // 设置模型过滤器
    setModelFilter: (model) => {
      set({ selectedModel: model });
    },
    
    // 设置项目过滤器
    setProjectFilter: (project) => {
      set({ selectedProject: project });
    },
    
    // 清除错误
    clearError: () => set({ error: null }),
    
    // 格式化货币
    formatCurrency: (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      }).format(amount);
    },
    
    // 格式化数字
    formatNumber: (num) => {
      return new Intl.NumberFormat('en-US').format(num);
    },
    
    // 格式化 tokens
    formatTokens: (num) => {
      if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(2)}M`;
      } else if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
      }
      return get().formatNumber(num);
    },
    
    // 获取模型显示名称
    getModelDisplayName: (model) => {
      const modelMap = {
        "claude-4-opus": "Opus 4",
        "claude-4-sonnet": "Sonnet 4",
        "claude-3.5-sonnet": "Sonnet 3.5",
        "claude-3-opus": "Opus 3",
        "claude-3-sonnet": "Sonnet 3",
        "claude-3-haiku": "Haiku 3"
      };
      return modelMap[model] || model;
    },
    
    // 获取模型颜色
    getModelColor: (model) => {
      if (model.includes("opus")) return "text-purple-500";
      if (model.includes("sonnet")) return "text-blue-500";
      if (model.includes("haiku")) return "text-green-500";
      return "text-gray-500";
    },
    
    // 获取过滤后的数据
    getFilteredData: () => {
      const { usageStats, selectedModel, selectedProject } = get();
      
      if (!usageStats) return null;
      
      let filteredStats = { ...usageStats };
      
      // 按模型过滤
      if (selectedModel) {
        filteredStats.by_model = filteredStats.by_model.filter(
          (model) => model.model === selectedModel
        );
      }
      
      // 按项目过滤
      if (selectedProject) {
        filteredStats.by_project = filteredStats.by_project.filter(
          (project) => project.project_path === selectedProject
        );
      }
      
      return filteredStats;
    },
    
    // 重置所有过滤器
    resetFilters: () => {
      set({
        selectedDateRange: 'all',
        selectedModel: null,
        selectedProject: null
      });
      get().fetchUsageStats(true);
      get().fetchSessionStats(true);
    }
  }))
);

export default useUsageStore;