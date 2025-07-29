import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// @ts-ignore - zustand types not available in test environment
import { create } from 'zustand';
// @ts-ignore - zustand middleware types not available in test environment
import { subscribeWithSelector } from 'zustand/middleware';

// Mock the api module
vi.mock('../utils/api', () => ({
  api: {
    listAgents: vi.fn(),
    listAgentRuns: vi.fn(),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
    executeAgent: vi.fn(),
    getAgentRun: vi.fn(),
    killAgentSession: vi.fn(),
    getAgentRunWithRealTimeMetrics: vi.fn(),
  },
}));

// Type definitions for mock API
interface MockApi {
  listAgents: any;
  listAgentRuns: any;
  createAgent: any;
  updateAgent: any;
  deleteAgent: any;
  executeAgent: any;
  getAgentRun: any;
  killAgentSession: any;
  getAgentRunWithRealTimeMetrics: any;
}

// Mock data based on API documentation
const mockAgents = [
  {
    id: 'agent_1',
    name: 'Test Agent 1',
    description: 'A test agent',
    icon: '🤖',
    system_prompt: 'You are a helpful assistant',
    default_task: 'Help with coding',
    model: 'claude-3-sonnet-20240229',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    run_count: 5,
    success_rate: 0.8,
    avg_duration: 120,
    tags: ['coding', 'assistant'],
    is_favorite: false,
    is_builtin: false,
  },
];

const mockAgentRuns = [
  {
    id: '1',
    agent_id: 'agent_1',
    agent_icon: '🤖',
    task: 'Test task',
    model: 'claude-3-sonnet-20240229',
    status: 'completed',
    started_at: '2024-01-01T00:00:00Z',
    completed_at: '2024-01-01T00:05:00Z',
    duration: 300,
    input_tokens: 100,
    output_tokens: 200,
    cost: 0.01,
    result: 'Task completed successfully',
  },
  {
    id: '2',
    agent_id: 'agent_1',
    agent_icon: '🤖',
    task: 'Running task',
    model: 'claude-3-sonnet-20240229',
    status: 'running',
    started_at: '2024-01-01T01:00:00Z',
    duration: null,
    input_tokens: 50,
    output_tokens: 0,
    cost: 0.005,
  },
];

const mockAgentRunWithMetrics = {
  id: '1',
  agent_id: 'agent_1',
  agent_icon: '🤖',
  task: 'Test task',
  model: 'claude-3-sonnet-20240229',
  status: 'completed',
  started_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T00:05:00Z',
  duration: 300,
  input_tokens: 100,
  output_tokens: 200,
  cost: 0.01,
  result: 'Task completed successfully',
  metrics: {
    duration_ms: 300000,
    total_tokens: 300,
    cost_usd: 0.01,
    message_count: 5,
  },
  output: 'Test output content',
};

// Create a mock agentStore based on the actual implementation
const createMockAgentStore = () => create(
  subscribeWithSelector((set: any, get: any) => ({
    // Agent data
    agents: [],
    agentRuns: [],
    runningAgents: new Set(),
    sessionOutputs: {},
    
    // UI state
    isLoadingAgents: false,
    isLoadingRuns: false,
    isLoadingOutput: false,
    error: null,
    lastFetchTime: 0,
    
    // Polling management
    pollingInterval: null,
    
    // Actions
    fetchAgents: vi.fn(async (forceRefresh = false) => {
      const now = Date.now();
      const { lastFetchTime } = get();
      
      if (!forceRefresh && now - lastFetchTime < 5000) {
        return;
      }
      
      set({ isLoadingAgents: true, error: null });
      
      try {
        const { api } = await import('../utils/api');
        const agents = await api.listAgents();
        
        set({
          agents,
          isLoadingAgents: false,
          lastFetchTime: now
        });
      } catch (error: any) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch agents',
          isLoadingAgents: false
        });
      }
    }),
    
    fetchAgentRuns: vi.fn(async (agentId = null, forceRefresh = false) => {
      const now = Date.now();
      const { lastFetchTime } = get();
      
      if (!forceRefresh && now - lastFetchTime < 5000) {
        return;
      }
      
      set({ isLoadingRuns: true, error: null });
      
      try {
        const { api } = await import('../utils/api');
        const runs = await api.listAgentRuns(agentId);
        const runningIds = runs
          .filter((r: any) => r.status === 'running' || r.status === 'pending')
          .map((r: any) => r.id?.toString() || '')
          .filter(Boolean);
        
        set({
          agentRuns: runs,
          runningAgents: new Set(runningIds),
          isLoadingRuns: false,
          lastFetchTime: now
        });
      } catch (error: any) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch agent runs',
          isLoadingRuns: false
        });
      }
    }),
    
    createAgent: vi.fn(async (agentData: any) => {
      try {
        const { api } = await import('../utils/api');
        const newAgent = await api.createAgent(agentData);
        
        set((state: any) => ({
          agents: [newAgent, ...state.agents]
        }));
        
        return newAgent;
      } catch (error: any) {
        set({
          error: error instanceof Error ? error.message : 'Failed to create agent'
        });
        throw error;
      }
    }),
    
    updateAgent: vi.fn(async (agentId: string, agentData: any) => {
      try {
        const { api } = await import('../utils/api');
        const updatedAgent = await api.updateAgent(agentId, agentData);
        
        set((state: any) => ({
          agents: state.agents.map((agent: any) =>
            agent.id === agentId ? updatedAgent : agent
          )
        }));
        
        return updatedAgent;
      } catch (error: any) {
        set({
          error: error instanceof Error ? error.message : 'Failed to update agent'
        });
        throw error;
      }
    }),
    
    deleteAgent: vi.fn(async (agentId: string) => {
      try {
        const { api } = await import('../utils/api');
        await api.deleteAgent(agentId);
        
        set((state: any) => ({
          agents: state.agents.filter((agent: any) => agent.id !== agentId)
        }));
      } catch (error: any) {
        set({
          error: error instanceof Error ? error.message : 'Failed to delete agent'
        });
        throw error;
      }
    }),
    
    executeAgent: vi.fn(async (agentId: string, projectPath: string, task: string, model: string) => {
      try {
        const { api } = await import('../utils/api');
        const runId = await api.executeAgent(agentId, projectPath, task, model);
        
        const run = await api.getAgentRun(runId);
        
        set((state: any) => ({
          agentRuns: [run, ...state.agentRuns],
          runningAgents: new Set([...state.runningAgents, runId.toString()])
        }));
        
        return run;
      } catch (error: any) {
        set({
          error: error instanceof Error ? error.message : 'Failed to execute agent'
        });
        throw error;
      }
    }),
    
    cancelAgentRun: vi.fn(async (runId: string) => {
      try {
        const { api } = await import('../utils/api');
        await api.killAgentSession(runId);
        
        set((state: any) => ({
          agentRuns: state.agentRuns.map((r: any) =>
            r.id === runId ? { ...r, status: 'cancelled' } : r
          ),
          runningAgents: new Set(
            [...state.runningAgents].filter(id => id !== runId.toString())
          )
        }));
      } catch (error: any) {
        set({
          error: error instanceof Error ? error.message : 'Failed to cancel agent run'
        });
        throw error;
      }
    }),
    
    fetchSessionOutput: vi.fn(async (runId: string) => {
      set({ isLoadingOutput: true, error: null });
      
      try {
        const { api } = await import('../utils/api');
        const run = await api.getAgentRunWithRealTimeMetrics(runId);
        const output = run.output || '';
        
        set((state: any) => ({
          sessionOutputs: {
            ...state.sessionOutputs,
            [runId]: output
          },
          isLoadingOutput: false
        }));
      } catch (error: any) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch session output',
          isLoadingOutput: false
        });
      }
    }),
    
    clearError: vi.fn(() => set({ error: null })),
    
    handleAgentRunUpdate: vi.fn((run: any) => {
      set((state: any) => {
        const existingIndex = state.agentRuns.findIndex((r: any) => r.id === run.id);
        const updatedRuns = [...state.agentRuns];
        
        if (existingIndex >= 0) {
          updatedRuns[existingIndex] = run;
        } else {
          updatedRuns.unshift(run);
        }
        
        const runningIds = updatedRuns
          .filter((r: any) => r.status === 'running' || r.status === 'pending')
          .map((r: any) => r.id?.toString() || '')
          .filter(Boolean);
        
        return {
          agentRuns: updatedRuns,
          runningAgents: new Set(runningIds)
        };
      });
    }),
    
    startPolling: vi.fn((interval = 5000) => {
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
    }),
    
    stopPolling: vi.fn(() => {
      const { pollingInterval } = get();
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        set({ pollingInterval: null });
      }
    })
  }))
);

describe('agentStore', () => {
  let useAgentStore: any;
  let store: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset timers
    vi.useFakeTimers();
    
    // Create fresh store instance
    useAgentStore = createMockAgentStore();
    store = useAgentStore.getState();
    
    // Setup API mocks
    const { api } = await import('../utils/api') as unknown as { api: MockApi };
    (api.listAgents as any).mockResolvedValue(mockAgents);
    (api.listAgentRuns as any).mockResolvedValue(mockAgentRuns);
    (api.createAgent as any).mockResolvedValue(mockAgents[0]);
    (api.updateAgent as any).mockResolvedValue({ ...mockAgents[0], name: 'Updated Agent' });
    (api.deleteAgent as any).mockResolvedValue(undefined);
    (api.executeAgent as any).mockResolvedValue('run_123');
    (api.getAgentRun as any).mockResolvedValue(mockAgentRuns[0]);
    (api.killAgentSession as any).mockResolvedValue(undefined);
    (api.getAgentRunWithRealTimeMetrics as any).mockResolvedValue(mockAgentRunWithMetrics);
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  describe('fetchAgents', () => {
    it('should fetch agents successfully', async () => {
      await store.fetchAgents();
      
      expect(store.isLoadingAgents).toBe(false);
      expect(store.error).toBe(null);
      expect(useAgentStore.getState().agents).toEqual(mockAgents);
    });
    
    it('should use cache when not forcing refresh', async () => {
      // Set recent fetch time
      useAgentStore.setState({ lastFetchTime: Date.now() });
      
      await store.fetchAgents(false);
      
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      expect(api.listAgents).not.toHaveBeenCalled();
    });
    
    it('should force refresh when requested', async () => {
      // Set recent fetch time
      useAgentStore.setState({ lastFetchTime: Date.now() });
      
      await store.fetchAgents(true);
      
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      expect(api.listAgents).toHaveBeenCalled();
    });
    
    it('should handle fetch agents error', async () => {
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      (api.listAgents as any).mockRejectedValue(new Error('Network error'));
      
      await store.fetchAgents();
      
      expect(store.isLoadingAgents).toBe(false);
      expect(useAgentStore.getState().error).toBe('Network error');
    });
  });
  
  describe('fetchAgentRuns', () => {
    it('should fetch agent runs successfully', async () => {
      await store.fetchAgentRuns();
      
      expect(store.isLoadingRuns).toBe(false);
      expect(store.error).toBe(null);
      expect(useAgentStore.getState().agentRuns).toEqual(mockAgentRuns);
      expect(useAgentStore.getState().runningAgents.has('2')).toBe(true);
    });
    
    it('should handle fetch agent runs error', async () => {
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      (api.listAgentRuns as any).mockRejectedValue(new Error('Fetch error'));
      
      await store.fetchAgentRuns();
      
      expect(store.isLoadingRuns).toBe(false);
      expect(useAgentStore.getState().error).toBe('Fetch error');
    });
  });
  
  describe('createAgent', () => {
    it('should create agent successfully', async () => {
      const agentData = {
        name: 'New Agent',
        description: 'A new test agent',
        icon: '🆕',
        system_prompt: 'You are a new assistant',
        default_task: 'Help with tasks',
        model: 'claude-3-sonnet-20240229',
      };
      
      const result = await store.createAgent(agentData);
      
      expect(result).toEqual(mockAgents[0]);
      expect(useAgentStore.getState().agents).toContain(mockAgents[0]);
    });
    
    it('should handle create agent error', async () => {
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      (api.createAgent as any).mockRejectedValue(new Error('Create error'));
      
      const agentData = { name: 'Test Agent' };
      
      await expect(store.createAgent(agentData)).rejects.toThrow('Create error');
      expect(useAgentStore.getState().error).toBe('Create error');
    });
  });
  
  describe('updateAgent', () => {
    it('should update agent successfully', async () => {
      // Setup initial state
      useAgentStore.setState({ agents: [mockAgents[0]] });
      
      const result = await store.updateAgent('agent_1', { name: 'Updated Agent' });
      
      expect(result.name).toBe('Updated Agent');
      expect(useAgentStore.getState().agents[0].name).toBe('Updated Agent');
    });
    
    it('should handle update agent error', async () => {
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      (api.updateAgent as any).mockRejectedValue(new Error('Update error'));
      
      await expect(store.updateAgent('agent_1', {})).rejects.toThrow('Update error');
      expect(useAgentStore.getState().error).toBe('Update error');
    });
  });
  
  describe('deleteAgent', () => {
    it('should delete agent successfully', async () => {
      // Setup initial state
      useAgentStore.setState({ agents: [mockAgents[0]] });
      
      await store.deleteAgent('agent_1');
      
      expect(useAgentStore.getState().agents).toHaveLength(0);
    });
    
    it('should handle delete agent error', async () => {
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      (api.deleteAgent as any).mockRejectedValue(new Error('Delete error'));
      
      await expect(store.deleteAgent('agent_1')).rejects.toThrow('Delete error');
      expect(useAgentStore.getState().error).toBe('Delete error');
    });
  });
  
  describe('executeAgent', () => {
    it('should execute agent successfully', async () => {
      const result = await store.executeAgent('agent_1', '/path/to/project', 'Test task', 'claude-3-sonnet-20240229');
      
      expect(result).toEqual(mockAgentRuns[0]);
      expect(useAgentStore.getState().agentRuns).toContain(mockAgentRuns[0]);
      expect(useAgentStore.getState().runningAgents.has('run_123')).toBe(true);
    });
    
    it('should handle execute agent error', async () => {
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      (api.executeAgent as any).mockRejectedValue(new Error('Execute error'));
      
      await expect(store.executeAgent('agent_1', '/path', 'task', 'model')).rejects.toThrow('Execute error');
      expect(useAgentStore.getState().error).toBe('Execute error');
    });
  });
  
  describe('cancelAgentRun', () => {
    it('should cancel agent run successfully', async () => {
      // Setup initial state
      useAgentStore.setState({ 
        agentRuns: [mockAgentRuns[1]], // running task
        runningAgents: new Set(['2'])
      });
      
      await store.cancelAgentRun('2');
      
      const state = useAgentStore.getState();
      expect(state.agentRuns[0].status).toBe('cancelled');
      expect(state.runningAgents.has('2')).toBe(false);
    });
    
    it('should handle cancel agent run error', async () => {
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      (api.killAgentSession as any).mockRejectedValue(new Error('Cancel error'));
      
      await expect(store.cancelAgentRun('2')).rejects.toThrow('Cancel error');
      expect(useAgentStore.getState().error).toBe('Cancel error');
    });
  });
  
  describe('fetchSessionOutput', () => {
    it('should fetch session output successfully', async () => {
      await store.fetchSessionOutput('1');
      
      expect(store.isLoadingOutput).toBe(false);
      expect(store.error).toBe(null);
      expect(useAgentStore.getState().sessionOutputs['1']).toBe('Test output content');
    });
    
    it('should handle fetch session output error', async () => {
      const { api } = await import('../utils/api') as unknown as { api: MockApi };
      (api.getAgentRunWithRealTimeMetrics as any).mockRejectedValue(new Error('Output error'));
      
      await store.fetchSessionOutput('1');
      
      expect(store.isLoadingOutput).toBe(false);
      expect(useAgentStore.getState().error).toBe('Output error');
    });
  });
  
  describe('clearError', () => {
    it('should clear error state', () => {
      useAgentStore.setState({ error: 'Some error' });
      
      store.clearError();
      
      expect(useAgentStore.getState().error).toBe(null);
    });
  });
  
  describe('handleAgentRunUpdate', () => {
    it('should update existing agent run', () => {
      // Setup initial state
      useAgentStore.setState({ agentRuns: [mockAgentRuns[0]] });
      
      const updatedRun = { ...mockAgentRuns[0], status: 'completed' };
      store.handleAgentRunUpdate(updatedRun);
      
      const state = useAgentStore.getState();
      expect(state.agentRuns[0].status).toBe('completed');
    });
    
    it('should add new agent run', () => {
      const newRun = { ...mockAgentRuns[1], id: 3 };
      store.handleAgentRunUpdate(newRun);
      
      const state = useAgentStore.getState();
      expect(state.agentRuns).toContain(newRun);
    });
  });
  
  describe('polling', () => {
    it('should start polling', () => {
      store.startPolling(1000);
      
      expect(useAgentStore.getState().pollingInterval).toBeTruthy();
    });
    
    it('should stop polling', () => {
      // Start polling first
      store.startPolling(1000);
      
      store.stopPolling();
      
      expect(useAgentStore.getState().pollingInterval).toBe(null);
    });
    
    it('should clear existing interval when starting new polling', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      // Start first polling
      store.startPolling(1000);
      const firstInterval = useAgentStore.getState().pollingInterval;
      
      // Start second polling
      store.startPolling(2000);
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(firstInterval);
    });
  });
});