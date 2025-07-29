import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GitConfigCenter from '../components/GitConfigCenter';
import { authenticatedFetch } from '../utils/api';

// Mock the API utility
vi.mock('../utils/api', () => ({
  authenticatedFetch: vi.fn()
}));

// Mock the child components
vi.mock('../components/git-config/PlatformSelector', () => ({
  default: ({ platforms, onPlatformsChange, onError, onSuccess }) => (
    <div data-testid="platform-selector">
      <button onClick={() => onSuccess('Platform added')}>Add Platform</button>
      <div>Platforms: {platforms.length}</div>
    </div>
  )
}));

vi.mock('../components/git-config/CredentialManager', () => ({
  default: ({ credentials, onCredentialsChange, onError, onSuccess }) => (
    <div data-testid="credential-manager">
      <button onClick={() => onSuccess('Credential added')}>Add Credential</button>
      <div>Credentials: {credentials.length}</div>
    </div>
  )
}));

vi.mock('../components/git-config/SSHKeyGenerator', () => ({
  default: ({ sshKeys, onSSHKeysChange, onError, onSuccess }) => (
    <div data-testid="ssh-key-generator">
      <button onClick={() => onSuccess('SSH key generated')}>Generate SSH Key</button>
      <div>SSH Keys: {sshKeys.length}</div>
    </div>
  )
}));

vi.mock('../components/git-config/RemoteRepositoryConfig', () => ({
  default: ({ selectedProject, onError, onSuccess }) => (
    <div data-testid="remote-repository-config">
      <button onClick={() => onSuccess('Remote added')}>Add Remote</button>
      <div>Project: {selectedProject || 'None'}</div>
    </div>
  )
}));

describe('GitConfigCenter', () => {
  const mockOnClose = vi.fn();
  const selectedProject = 'test-project';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    authenticatedFetch.mockImplementation((url) => {
      const mockResponses = {
        '/api/git-config/platforms': {
          json: () => Promise.resolve({ success: true, platforms: [] })
        },
        '/api/git-config/credentials': {
          json: () => Promise.resolve({ success: true, credentials: [] })
        },
        '/api/git-config/ssh-keys': {
          json: () => Promise.resolve({ success: true, sshKeys: [] })
        },
        '/api/git-config/user': {
          json: () => Promise.resolve({ success: true, user: { name: '', email: '' } })
        }
      };
      
      return Promise.resolve(mockResponses[url] || {
        json: () => Promise.resolve({ success: true })
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the Git configuration center', async () => {
    render(
      <GitConfigCenter 
        selectedProject={selectedProject} 
        onClose={mockOnClose} 
      />
    );

    expect(screen.getByText('Git配置管理中心')).toBeInTheDocument();
    expect(screen.getByText('平台管理')).toBeInTheDocument();
    expect(screen.getByText('凭据管理')).toBeInTheDocument();
    expect(screen.getByText('SSH密钥')).toBeInTheDocument();
    expect(screen.getByText('用户配置')).toBeInTheDocument();
    expect(screen.getByText('远程仓库')).toBeInTheDocument();
  });

  it('loads initial data on mount', async () => {
    render(
      <GitConfigCenter 
        selectedProject={selectedProject} 
        onClose={mockOnClose} 
      />
    );

    await waitFor(() => {
      expect(authenticatedFetch).toHaveBeenCalledWith('/api/git-config/platforms');
      expect(authenticatedFetch).toHaveBeenCalledWith('/api/git-config/credentials');
      expect(authenticatedFetch).toHaveBeenCalledWith('/api/git-config/ssh-keys');
      expect(authenticatedFetch).toHaveBeenCalledWith('/api/git-config/user');
    });
  });

  it('switches between tabs correctly', async () => {
    render(
      <GitConfigCenter 
        selectedProject={selectedProject} 
        onClose={mockOnClose} 
      />
    );

    // Default tab should be platforms
    expect(screen.getByTestId('platform-selector')).toBeInTheDocument();

    // Switch to credentials tab
    fireEvent.click(screen.getByText('凭据管理'));
    expect(screen.getByTestId('credential-manager')).toBeInTheDocument();

    // Switch to SSH keys tab
    fireEvent.click(screen.getByText('SSH密钥'));
    expect(screen.getByTestId('ssh-key-generator')).toBeInTheDocument();

    // Switch to remote repository tab
    fireEvent.click(screen.getByText('远程仓库'));
    expect(screen.getByTestId('remote-repository-config')).toBeInTheDocument();
  });

  it('displays success messages', async () => {
    render(
      <GitConfigCenter 
        selectedProject={selectedProject} 
        onClose={mockOnClose} 
      />
    );

    // Trigger success message from platform selector
    const addPlatformButton = screen.getByText('Add Platform');
    fireEvent.click(addPlatformButton);

    await waitFor(() => {
      expect(screen.getByText('Platform added')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    authenticatedFetch.mockRejectedValue(new Error('API Error'));

    render(
      <GitConfigCenter 
        selectedProject={selectedProject} 
        onClose={mockOnClose} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/加载配置数据失败/)).toBeInTheDocument();
    });
  });

  it('closes when close button is clicked', () => {
    render(
      <GitConfigCenter 
        selectedProject={selectedProject} 
        onClose={mockOnClose} 
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates Git user configuration', async () => {
    const mockUserData = { name: 'Test User', email: 'test@example.com' };
    
    authenticatedFetch.mockImplementation((url, options) => {
      if (url === '/api/git-config/user' && options?.method === 'PUT') {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, user: mockUserData })
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, user: { name: '', email: '' } })
      });
    });

    render(
      <GitConfigCenter 
        selectedProject={selectedProject} 
        onClose={mockOnClose} 
      />
    );

    // Switch to user config tab
    fireEvent.click(screen.getByText('用户配置'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });

  it('passes selected project to remote repository config', async () => {
    render(
      <GitConfigCenter 
        selectedProject={selectedProject} 
        onClose={mockOnClose} 
      />
    );

    // Switch to remote repository tab
    fireEvent.click(screen.getByText('远程仓库'));

    await waitFor(() => {
      expect(screen.getByText(`Project: ${selectedProject}`)).toBeInTheDocument();
    });
  });
});

// Test individual components integration
describe('Git Config Components Integration', () => {
  it('handles platform management workflow', async () => {
    const mockPlatforms = [
      { id: '1', name: 'GitHub', type: 'github', baseUrl: 'https://github.com' },
      { id: '2', name: 'GitCode', type: 'gitcode', baseUrl: 'https://gitcode.net' }
    ];

    authenticatedFetch.mockImplementation((url) => {
      if (url === '/api/git-config/platforms') {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, platforms: mockPlatforms })
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ success: true })
      });
    });

    render(
      <GitConfigCenter 
        selectedProject="test-project" 
        onClose={() => {}} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Platforms: 2')).toBeInTheDocument();
    });
  });

  it('handles credential management workflow', async () => {
    const mockCredentials = [
      { id: '1', name: 'GitHub Token', type: 'token', platform: 'github' },
      { id: '2', name: 'GitCode SSH', type: 'ssh', platform: 'gitcode' }
    ];

    authenticatedFetch.mockImplementation((url) => {
      if (url === '/api/git-config/credentials') {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, credentials: mockCredentials })
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ success: true })
      });
    });

    render(
      <GitConfigCenter 
        selectedProject="test-project" 
        onClose={() => {}} 
      />
    );

    // Switch to credentials tab
    fireEvent.click(screen.getByText('凭据管理'));

    await waitFor(() => {
      expect(screen.getByText('Credentials: 2')).toBeInTheDocument();
    });
  });

  it('handles SSH key management workflow', async () => {
    const mockSSHKeys = [
      { id: '1', name: 'Main Key', type: 'rsa', size: 2048 },
      { id: '2', name: 'Backup Key', type: 'ed25519', size: 256 }
    ];

    authenticatedFetch.mockImplementation((url) => {
      if (url === '/api/git-config/ssh-keys') {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, sshKeys: mockSSHKeys })
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ success: true })
      });
    });

    render(
      <GitConfigCenter 
        selectedProject="test-project" 
        onClose={() => {}} 
      />
    );

    // Switch to SSH keys tab
    fireEvent.click(screen.getByText('SSH密钥'));

    await waitFor(() => {
      expect(screen.getByText('SSH Keys: 2')).toBeInTheDocument();
    });
  });
});