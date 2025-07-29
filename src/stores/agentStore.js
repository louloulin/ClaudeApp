import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { api } from '../utils/api';

// CC Agents Store - 基于 claudia 项目的 agentStore 设计
const useAgentStore = create(
  subscribeWithSelector((set, get) => ({
    // Agent 数据
    agents: [],
    agentRuns: [],
    runningAgents: new Set(),
    sessionOutputs: {},
    
    // UI 状态
    isLoadingAgents: false,
    isLoadingRuns: false,
    isLoadingOutput: false,
    error: null,
    lastFetchTime: 0,
    
    // 轮询管理
    pollingInterval: null,
    
    // Actions
    
    // 获取所有 agents
    fetchAgents: async (forceRefresh = false) => {
      const now = Date.now();
      const { lastFetchTime } = get();
      
      // 缓存 5 秒，除非强制刷新
      if (!forceRefresh && now - lastFetchTime < 5000) {
        return;
      }
      
      set({ isLoadingAgents: true, error: null });
      
      try {
        // 调用后端 API 获取 agents
        const agents = await api.listAgents();
        
        set({
          agents,
          isLoadingAgents: false,
          lastFetchTime: now
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch agents',
          isLoadingAgents: false
        });
      }
    },
    
    // 获取 agent runs
    fetchAgentRuns: async (agentId = null, forceRefresh = false) => {
      const now = Date.now();
      const { lastFetchTime } = get();
      
      if (!forceRefresh && now - lastFetchTime < 5000) {
        return;
      }
      
      set({ isLoadingRuns: true, error: null });
      
      try {
        const runs = await api.listAgentRuns(agentId);
        const runningIds = runs
          .filter((r) => r.status === 'running' || r.status === 'pending')
          .map((r) => r.id?.toString() || '')
          .filter(Boolean);
        
        set({
          agentRuns: runs,
          runningAgents: new Set(runningIds),
          isLoadingRuns: false,
          lastFetchTime: now
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch agent runs',
          isLoadingRuns: false
        });
      }
    },
    
    // 创建新 agent
    createAgent: async (agentData) => {
      try {
        const newAgent = await api.createAgent(agentData);
        
        set((state) => ({
          agents: [newAgent, ...state.agents]
        }));
        
        return newAgent;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to create agent'
        });
        throw error;
      }
    },
    
    // 更新 agent
    updateAgent: async (agentId, agentData) => {
      try {
        const updatedAgent = await api.updateAgent(agentId, agentData);
        
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId ? updatedAgent : agent
          )
        }));
        
        return updatedAgent;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to update agent'
        });
        throw error;
      }
    },
    
    // 删除 agent
    deleteAgent: async (agentId) => {
      try {
        await api.deleteAgent(agentId);
        
        set((state) => ({
          agents: state.agents.filter((agent) => agent.id !== agentId)
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to delete agent'
        });
        throw error;
      }
    },
    
    // 执行 agent
    executeAgent: async (agentId, projectPath, task, model) => {
      try {
        const runId = await api.executeAgent(agentId, projectPath, task, model);
        
        // 获取创建的 run 详情
        const run = await api.getAgentRun(runId);
        
        // 立即更新本地状态
        set((state) => ({
          agentRuns: [run, ...state.agentRuns],
          runningAgents: new Set([...state.runningAgents, runId.toString()])
        }));
        
        return run;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to execute agent'
        });
        throw error;
      }
    },
    
    // 取消 agent 运行
    cancelAgentRun: async (runId) => {
      try {
        await api.killAgentSession(runId);
        
        set((state) => ({
          agentRuns: state.agentRuns.map((r) =>
            r.id === runId ? { ...r, status: 'cancelled' } : r
          ),
          runningAgents: new Set(
            [...state.runningAgents].filter(id => id !== runId.toString())
          )
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to cancel agent run'
        });
        throw error;
      }
    },
    
    // 获取会话输出
    fetchSessionOutput: async (runId) => {
      set({ isLoadingOutput: true, error: null });
      
      try {
        const output = await api.getAgentRunWithRealTimeMetrics(runId)
          .then(run => run.output || '');
        
        set((state) => ({
          sessionOutputs: {
            ...state.sessionOutputs,
            [runId]: output
          },
          isLoadingOutput: false
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch session output',
          isLoadingOutput: false
        });
      }
    },
    
    // 清除错误
    clearError: () => set({ error: null }),
    
    // 处理实时 agent run 更新
    handleAgentRunUpdate: (run) => {
      set((state) => {
        const existingIndex = state.agentRuns.findIndex((r) => r.id === run.id);
        const updatedRuns = [...state.agentRuns];
        
        if (existingIndex >= 0) {
          updatedRuns[existingIndex] = run;
        } else {
          updatedRuns.unshift(run);
        }
        
        const runningIds = updatedRuns
          .filter((r) => r.status === 'running' || r.status === 'pending')
          .map((r) => r.id?.toString() || '')
          .filter(Boolean);
        
        return {
          agentRuns: updatedRuns,
          runningAgents: new Set(runningIds)
        };
      });
    },
    
    // 开始轮询
    startPolling: (interval = 5000) => {
      const { pollingInterval } = get();
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      
      const newInterval = setInterval(() => {
        const { runningAgents } = get();
        if (runningAgents.size > 0) {
          get().fetchAgentRuns(null, true);
        }
      }, interval);
      
      set({ pollingInterval: newInterval });
    },
    
    // 停止轮询
    stopPolling: () => {
      const { pollingInterval } = get();
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        set({ pollingInterval: null });
      }
    }
  }))
);

export default useAgentStore;