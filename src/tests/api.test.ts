import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, authenticatedFetch } from '../utils/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('API Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('authenticatedFetch', () => {
    it('should make request without token when not authenticated', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValue(new Response('{}'));

      await authenticatedFetch('/test');

      expect(mockFetch).toHaveBeenCalledWith('/test', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    it('should include Authorization header when token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}'));

      await authenticatedFetch('/test');

      expect(mockFetch).toHaveBeenCalledWith('/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    it('should merge custom headers with default headers', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}'));

      await authenticatedFetch('/test', {
        headers: {
          'Custom-Header': 'custom-value'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith('/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'Custom-Header': 'custom-value'
        }
      });
    });
  });

  describe('Auth API', () => {
    it('should call auth status endpoint', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.auth.status();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/status');
    });

    it('should call login endpoint with credentials', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.auth.login('testuser', 'testpass');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'testpass' })
      });
    });

    it('should call register endpoint with user data', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.auth.register('testuser', 'testpass', 'test@example.com');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: 'testuser', 
          password: 'testpass', 
          email: 'test@example.com' 
        })
      });
    });

    it('should call register endpoint without email', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.auth.register('testuser', 'testpass');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: 'testuser', 
          password: 'testpass', 
          email: null 
        })
      });
    });

    it('should call dashboard endpoint with authentication', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.auth.dashboard();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/dashboard', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    it('should update user quotas', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}'));

      const quotas = { daily_limit: 100, monthly_limit: 1000 };
      await api.auth.updateUserQuotas(1, quotas);

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/users/1/quotas', {
        method: 'PUT',
        body: JSON.stringify(quotas),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    it('should update user role', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.auth.updateUserRole(1, 'admin');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/users/1/role', {
        method: 'PUT',
        body: JSON.stringify({ role: 'admin' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });
  });

  describe('Project API', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
    });

    it('should get projects list', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.projects();

      expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    it('should get sessions with default parameters', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.sessions('test-project');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/sessions?limit=5&offset=0',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });

    it('should get sessions with custom parameters', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.sessions('test-project', 10, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/sessions?limit=10&offset=20',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });

    it('should get session messages', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.sessionMessages('test-project', 'session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/sessions/session-123/messages',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });

    it('should rename project', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.renameProject('test-project', 'New Project Name');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/rename',
        {
          method: 'PUT',
          body: JSON.stringify({ displayName: 'New Project Name' }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });

    it('should delete session', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.deleteSession('test-project', 'session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/sessions/session-123',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });

    it('should delete project', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.deleteProject('test-project');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });

    it('should create project', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.createProject('/path/to/project');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/create',
        {
          method: 'POST',
          body: JSON.stringify({ path: '/path/to/project' }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });
  });

  describe('File API', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
    });

    it('should read file with encoded path', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.readFile('test-project', 'src/components/App.jsx');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/file?filePath=src%2Fcomponents%2FApp.jsx',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });

    it('should save file content', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      const content = 'console.log("Hello World");';
      await api.saveFile('test-project', 'src/app.js', content);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/file',
        {
          method: 'PUT',
          body: JSON.stringify({ 
            filePath: 'src/app.js', 
            content: content 
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });

    it('should get files list', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await api.getFiles('test-project');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/test-project/files',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        }
      );
    });
  });

  describe('Transcribe API', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
    });

    it('should upload audio for transcription', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      const formData = new FormData();
      formData.append('audio', new Blob(['audio data']));

      await api.transcribe(formData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/transcribe',
        {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(api.projects()).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue(new Response('Not Found', { 
        status: 404, 
        statusText: 'Not Found' 
      }));

      const response = await api.projects();
      expect(response.status).toBe(404);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
    });

    it('should handle complete project workflow', async () => {
      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }))) // create project
        .mockResolvedValueOnce(new Response(JSON.stringify([{ name: 'test-project' }]))) // list projects
        .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'session-1' }]))) // get sessions
        .mockResolvedValueOnce(new Response(JSON.stringify([{ content: 'Hello' }]))); // get messages

      // Execute workflow
      await api.createProject('/path/to/project');
      await api.projects();
      await api.sessions('test-project');
      await api.sessionMessages('test-project', 'session-1');

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should handle authentication workflow', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'new-token' }))) // login
        .mockResolvedValueOnce(new Response(JSON.stringify({ user: 'test' }))) // get user
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }))); // logout

      // Execute auth workflow
      await api.auth.login('user', 'pass');
      await api.auth.user();
      await api.auth.logout();

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});