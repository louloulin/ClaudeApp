import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Edit, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle,
  User,
  Shield,
  UserCheck,
  Settings
} from 'lucide-react';

const AdminUserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      setError('Error loading users');
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (userToEdit) => {
    setEditingUser(userToEdit.id);
    setEditForm({
      role: userToEdit.role,
      quota_cpu: userToEdit.quota_cpu,
      quota_memory: userToEdit.quota_memory,
      quota_storage: userToEdit.quota_storage,
      quota_claude_instances: userToEdit.quota_claude_instances
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const saveUser = async (userId) => {
    try {
      const token = localStorage.getItem('auth-token');
      
      // Update role
      const roleResponse = await fetch(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: editForm.role })
      });

      // Update quotas
      const quotasResponse = await fetch(`/api/auth/users/${userId}/quotas`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quota_cpu: parseInt(editForm.quota_cpu),
          quota_memory: parseInt(editForm.quota_memory),
          quota_storage: parseInt(editForm.quota_storage),
          quota_claude_instances: parseInt(editForm.quota_claude_instances)
        })
      });

      if (roleResponse.ok && quotasResponse.ok) {
        setEditingUser(null);
        setEditForm({});
        fetchUsers(); // Refresh the list
      } else {
        setError('Failed to update user');
      }
    } catch (err) {
      setError('Error updating user');
      console.error('User update error:', err);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'moderator':
        return <UserCheck className="w-4 h-4 text-yellow-500" />;
      default:
        return <User className="w-4 h-4 text-green-500" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700 dark:text-red-400">Admin access required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Users className="w-6 h-6 mr-2" />
          User Management
        </h2>
        <div className="text-sm text-muted-foreground">
          Total Users: {users.length}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  CPU Quota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Memory Quota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Storage Quota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Instances
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((userItem) => (
                <tr key={userItem.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {userItem.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {userItem.email || 'No email'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === userItem.id ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                        disabled={userItem.id === user.id} // Prevent admin from changing their own role
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <div className="flex items-center">
                        {getRoleIcon(userItem.role)}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userItem.role)}`}>
                          {userItem.role.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {editingUser === userItem.id ? (
                      <input
                        type="number"
                        value={editForm.quota_cpu}
                        onChange={(e) => setEditForm({ ...editForm, quota_cpu: e.target.value })}
                        className="w-16 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                        min="1"
                        max="16"
                      />
                    ) : (
                      `${userItem.quota_cpu} cores`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {editingUser === userItem.id ? (
                      <input
                        type="number"
                        value={editForm.quota_memory}
                        onChange={(e) => setEditForm({ ...editForm, quota_memory: e.target.value })}
                        className="w-20 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                        min="512"
                        step="512"
                      />
                    ) : (
                      formatBytes(userItem.quota_memory)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {editingUser === userItem.id ? (
                      <input
                        type="number"
                        value={editForm.quota_storage}
                        onChange={(e) => setEditForm({ ...editForm, quota_storage: e.target.value })}
                        className="w-20 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                        min="1024"
                        step="1024"
                      />
                    ) : (
                      formatBytes(userItem.quota_storage)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {editingUser === userItem.id ? (
                      <input
                        type="number"
                        value={editForm.quota_claude_instances}
                        onChange={(e) => setEditForm({ ...editForm, quota_claude_instances: e.target.value })}
                        className="w-16 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                        min="1"
                        max="10"
                      />
                    ) : (
                      `${userItem.active_claude_instances || 0}/${userItem.quota_claude_instances}`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingUser === userItem.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveUser(userItem.id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(userItem)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
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

export default AdminUserManagement;
