import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// @ts-ignore - zustand types not available in test environment
import { create } from 'zustand';

// Mock the api module
vi.mock('../utils/api', () => ({
  api: {
    projects: vi.fn(),
    sessions: vi.fn(),
    sessionMessages: vi.fn(),
    deleteSession: vi.fn(),
    deleteProject: vi.fn(),
    createProject: vi.fn(),
    getSessionTimeline: vi.fn(),
    createCheckpoint: vi.fn(),
    restoreCheckpoint: vi.fn(),
    getCheckpointDiff: vi.fn(),
  },
}));

// Type definitions for mock API
interface MockApi {
  projects: any;
  sessions: any;
  sessionMessages: any;
  deleteSession: any;
  deleteProject: any;
  createProject: any;
  getSessionTimeline: any;
  createCheckpoint: any;
  restoreCheckpoint: any;
  getCheckpointDiff: any;
}

// Mock data based on API documentation
const mockProjects = [
  {
    id: 'project_1',
    name: 'Test Project 1',
    description: 'A test project',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'project_2',
    name: 'Test Project 2', 
    description: 'Another test project',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockSessions = [
  {
    id: 'session_1',
    project_id: 'project_1',
    name: 'Test Session 1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    message_count: 5,
    total_tokens: 1000,
    total_cost: 0.05,
    model: 'claude-3-sonnet-20240229',
    status: 'active',
    metadata: {},
  },
  {
    id: 'session_2',
    project_id: 'project_1',
    name: 'Test Session 2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    message_count: 3,
    total_tokens: 500,
    total_cost: 0.025,
    model: 'claude-3-sonnet-20240229',
    status: 'inactive',
    metadata: {},
  },
];

const mockMessages = {
  messages: [
    {
      id: 'msg_1',
      content: 'Hello',
      role: 'user',
      timestamp: '2024-01-01T00:00:00Z',
    },
    {
      id: 'msg_2',
      content: 'Hi there!',
      role: 'assistant',
      timestamp: '2024-01-01T00:01:00Z',
    },
  ],
};

// Create a mock sessionStore based on the interface from documentation
const createMockSessionStore = () => create((set, get) => ({
  // Data state
  projects: [],
  sessions: {},
  currentSessionId: null,
  currentSession: null,
  sessionOutputs: {},
  
  // UI state
  isLoadingProjects: false,
  isLoadingSessions: false,
  isLoadingOutputs: false,
  error: null,
  lastFetchTime: 0,
  
  // Actions
  fetchProjects: vi.fn(async () => {
    const { api } = await import('../utils/api');
    set({ isLoadingProjects: true, error: null });
    try {
      const projects = await api.projects();
      const projectsData = await projects.json();
      set({ 
        projects: projectsData, 
        isLoadingProjects: false,
        lastFetchTime: Date.now()
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        isLoadingProjects: false 
      });
    }
  }),
  
  fetchProjectSessions: vi.fn(async (projectName) => {
    const { api } = await import('../utils/api');
    set({ isLoadingSessions: true, error: null });
    try {
      const response = await api.sessions(projectName);
      const sessionsData = await response.json();
      set((state) => ({
        sessions: {
          ...state.sessions,
          [projectName]: sessionsData.sessions || [],
        },
        isLoadingSessions: false,
        lastFetchTime: Date.now()
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
        isLoadingSessions: false 
      });
    }
  }),
  
  setCurrentSession: vi.fn((sessionId) => {
    const state = get();
    const session = Object.values(state.sessions)
      .flat()
      .find((s: any) => s.id === sessionId) || null;
    set({ 
      currentSessionId: sessionId, 
      currentSession: session 
    });
  }),
  
  fetchSessionOutput: vi.fn(async (projectName, sessionId) => {
    const { api } = await import('../utils/api');
    set({ isLoadingOutputs: true, error: null });
    try {
      const response = await api.sessionMessages(projectName, sessionId);
      const data = await response.json();
      set((state) => ({
        sessionOutputs: {
          ...state.sessionOutputs,
          [sessionId]: data.messages || [],
        },
        isLoadingOutputs: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch session output',
        isLoadingOutputs: false 
      });
    }
  }),
  
  deleteSession: vi.fn(async (projectName, sessionId) => {
    const { api } = await import('../utils/api');
    try {
      await api.deleteSession(projectName, sessionId);
      set((state) => ({
        sessions: {
          ...state.sessions,
          [projectName]: (state.sessions[projectName] || []).filter(s => s.id !== sessionId),
        },
        currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        currentSession: state.currentSessionId === sessionId ? null : state.currentSession,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete session'
      });
      throw error;
    }
  }),
  
  deleteProject: vi.fn(async (projectName) => {
    const { api } = await import('../utils/api');
    try {
      await api.deleteProject(projectName);
      set((state) => ({
        projects: state.projects.filter(p => p.name !== projectName),
        sessions: Object.fromEntries(
          Object.entries(state.sessions).filter(([name]) => name !== projectName)
        ),
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete project'
      });
      throw error;
    }
  }),
  
  clearError: vi.fn(() => {
    set({ error: null });
  }),
}));

describe('sessionStore', () => {
  let useSessionStore;
  let store;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset timers
    vi.useFakeTimers();
    
    // Create fresh store instance
    useSessionStore = createMockSessionStore();
    store = useSessionStore.getState();
    
    // Setup API mocks
    const { api } = await import('../utils/api') as { api: MockApi };
    (api.projects as any).mockResolvedValue({
      json: () => Promise.resolve(mockProjects)
    });
    (api.sessions as any).mockResolvedValue({
      json: () => Promise.resolve({ sessions: mockSessions })
    });
    (api.sessionMessages as any).mockResolvedValue({
      json: () => Promise.resolve(mockMessages)
    });
    (api.deleteSession as any).mockResolvedValue(undefined);
    (api.deleteProject as any).mockResolvedValue(undefined);
    (api.getSessionTimeline as any).mockResolvedValue(undefined);
    (api.createCheckpoint as any).mockResolvedValue(undefined);
    (api.restoreCheckpoint as any).mockResolvedValue(undefined);
    (api.getCheckpointDiff as any).mockResolvedValue(undefined);
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  describe('fetchProjects', () => {
    it('should fetch projects successfully', async () => {
      await store.fetchProjects();
      
      expect(store.isLoadingProjects).toBe(false);
      expect(store.error).toBe(null);
      expect(useSessionStore.getState().projects).toEqual(mockProjects);
    });
    
    it('should handle fetch projects error', async () => {
      const { api } = await import('../utils/api') as { api: MockApi };
      (api.projects as any).mockRejectedValue(new Error('Network error'));
      
      await store.fetchProjects();
      
      expect(store.isLoadingProjects).toBe(false);
      expect(useSessionStore.getState().error).toBe('Network error');
    });
  });
  
  describe('fetchProjectSessions', () => {
    it('should fetch sessions for a project', async () => {
      await store.fetchProjectSessions('test-project');
      
      expect(store.isLoadingSessions).toBe(false);
      expect(store.error).toBe(null);
      expect(useSessionStore.getState().sessions['test-project']).toEqual(mockSessions);
    });
    
    it('should handle fetch sessions error', async () => {
      const { api } = await import('../utils/api') as { api: MockApi };
      (api.sessions as any).mockRejectedValue(new Error('Session fetch error'));
      
      await store.fetchProjectSessions('test-project');
      
      expect(store.isLoadingSessions).toBe(false);
      expect(useSessionStore.getState().error).toBe('Session fetch error');
    });
  });
  
  describe('setCurrentSession', () => {
    it('should set current session', () => {
      // First add sessions to the store
      useSessionStore.setState({
        sessions: { 'test-project': mockSessions }
      });
      
      store.setCurrentSession('session_1');
      
      const state = useSessionStore.getState();
      expect(state.currentSessionId).toBe('session_1');
      expect(state.currentSession).toEqual(mockSessions[0]);
    });
    
    it('should clear current session when sessionId is null', () => {
      store.setCurrentSession(null);
      
      const state = useSessionStore.getState();
      expect(state.currentSessionId).toBe(null);
      expect(state.currentSession).toBe(null);
    });
  });
  
  describe('fetchSessionOutput', () => {
    it('should fetch session messages', async () => {
      await store.fetchSessionOutput('test-project', 'session_1');
      
      expect(store.isLoadingOutputs).toBe(false);
      expect(store.error).toBe(null);
      expect(useSessionStore.getState().sessionOutputs['session_1']).toEqual(mockMessages.messages);
    });
    
    it('should handle fetch session output error', async () => {
      const { api } = await import('../utils/api') as { api: MockApi };
      (api.sessionMessages as any).mockRejectedValue(new Error('Messages fetch error'));
      
      await store.fetchSessionOutput('test-project', 'session_1');
      
      expect(store.isLoadingOutputs).toBe(false);
      expect(useSessionStore.getState().error).toBe('Messages fetch error');
    });
  });
  
  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      // Setup initial state
      useSessionStore.setState({
        sessions: { 'test-project': mockSessions },
        currentSessionId: 'session_1',
        currentSession: mockSessions[0]
      });
      
      await store.deleteSession('test-project', 'session_1');
      
      const state = useSessionStore.getState();
      expect(state.sessions['test-project']).toHaveLength(1);
      expect(state.sessions['test-project'][0].id).toBe('session_2');
      expect(state.currentSessionId).toBe(null);
      expect(state.currentSession).toBe(null);
    });
    
    it('should handle delete session error', async () => {
      const { api } = await import('../utils/api') as { api: MockApi };
      (api.deleteSession as any).mockRejectedValue(new Error('Delete error'));
      
      await expect(store.deleteSession('test-project', 'session_1')).rejects.toThrow('Delete error');
      expect(useSessionStore.getState().error).toBe('Delete error');
    });
  });
  
  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      // Setup initial state
      useSessionStore.setState({
        projects: mockProjects,
        sessions: { 'test-project': mockSessions }
      });
      
      await store.deleteProject('test-project');
      
      const state = useSessionStore.getState();
      expect(state.projects).toHaveLength(0);
      expect(state.sessions['test-project']).toBeUndefined();
    });
    
    it('should handle delete project error', async () => {
      const { api } = await import('../utils/api') as { api: MockApi };
      (api.deleteProject as any).mockRejectedValue(new Error('Project delete error'));
      
      await expect(store.deleteProject('test-project')).rejects.toThrow('Project delete error');
      expect(useSessionStore.getState().error).toBe('Project delete error');
    });
  });
  
  describe('clearError', () => {
    it('should clear error state', () => {
      useSessionStore.setState({ error: 'Some error' });
      
      store.clearError();
      
      expect(useSessionStore.getState().error).toBe(null);
    });
  });
});