// Utility function for authenticated API calls
export const authenticatedFetch = (url, options = {}) => {
  const token = localStorage.getItem('auth-token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

// API endpoints
export const api = {
  // Auth endpoints (no token required)
  auth: {
    status: () => fetch('/api/auth/status'),
    login: (username, password) => fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
    register: (username, password, email = null) => fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    }),
    dashboard: () => authenticatedFetch('/api/auth/dashboard'),
    users: () => authenticatedFetch('/api/auth/users'),
    updateUserQuotas: (userId, quotas) => authenticatedFetch(`/api/auth/users/${userId}/quotas`, {
      method: 'PUT',
      body: JSON.stringify(quotas),
    }),
    updateUserRole: (userId, role) => authenticatedFetch(`/api/auth/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
    user: () => authenticatedFetch('/api/auth/user'),
    logout: () => authenticatedFetch('/api/auth/logout', { method: 'POST' }),
  },
  
  // Protected endpoints
  config: () => authenticatedFetch('/api/config'),
  projects: () => authenticatedFetch('/api/projects'),
  sessions: (projectName, limit = 5, offset = 0) => 
    authenticatedFetch(`/api/projects/${projectName}/sessions?limit=${limit}&offset=${offset}`),
  sessionMessages: (projectName, sessionId) =>
    authenticatedFetch(`/api/projects/${projectName}/sessions/${sessionId}/messages`),
  renameProject: (projectName, displayName) =>
    authenticatedFetch(`/api/projects/${projectName}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ displayName }),
    }),
  deleteSession: (projectName, sessionId) =>
    authenticatedFetch(`/api/projects/${projectName}/sessions/${sessionId}`, {
      method: 'DELETE',
    }),
  deleteProject: (projectName) =>
    authenticatedFetch(`/api/projects/${projectName}`, {
      method: 'DELETE',
    }),
  createProject: (path) =>
    authenticatedFetch('/api/projects/create', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
  readFile: (projectName, filePath) =>
    authenticatedFetch(`/api/projects/${projectName}/file?filePath=${encodeURIComponent(filePath)}`),
  saveFile: (projectName, filePath, content) =>
    authenticatedFetch(`/api/projects/${projectName}/file`, {
      method: 'PUT',
      body: JSON.stringify({ filePath, content }),
    }),
  getFiles: (projectName) =>
    authenticatedFetch(`/api/projects/${projectName}/files`),
  transcribe: (formData) =>
    authenticatedFetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  // CC Agents API
  listAgents: () => authenticatedFetch('/api/agents'),
  getAgent: (agentId) => authenticatedFetch(`/api/agents/${agentId}`),
  createAgent: (agentData) => authenticatedFetch('/api/agents', {
    method: 'POST',
    body: JSON.stringify(agentData),
  }),
  updateAgent: (agentId, agentData) => authenticatedFetch(`/api/agents/${agentId}`, {
    method: 'PUT',
    body: JSON.stringify(agentData),
  }),
  deleteAgent: (agentId) => authenticatedFetch(`/api/agents/${agentId}`, {
    method: 'DELETE',
  }),
  executeAgent: (agentId, projectPath, task, model) => authenticatedFetch(`/api/agents/${agentId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ project_path: projectPath, task, model }),
  }),
  listAgentRuns: (agentId = null) => {
    const url = agentId ? `/api/agents/${agentId}/executions` : '/api/agents/executions';
    return authenticatedFetch(url);
  },
  getAgentRun: (runId) => authenticatedFetch(`/api/agents/executions/${runId}`),
  getAgentRunWithRealTimeMetrics: (runId) => authenticatedFetch(`/api/agents/executions/${runId}`),
  killAgentSession: (runId) => authenticatedFetch(`/api/agents/executions/${runId}/cancel`, {
    method: 'POST',
  }),
};