import React, { useState, useEffect } from 'react';
import { Package, Plus, Play, Trash2, Eye, Clock, FileText, X, Save } from 'lucide-react';
import { gitTheme, getButtonStyle, getAlertStyle } from '../../styles/gitTheme';

const StashPanel = ({ projectName, onClose }) => {
  const [stashes, setStashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStashMessage, setNewStashMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [selectedStash, setSelectedStash] = useState(null);
  const [stashDiff, setStashDiff] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [operating, setOperating] = useState(false);

  useEffect(() => {
    loadStashes();
  }, [projectName]);

  const loadStashes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/git-advanced/stash?project=${encodeURIComponent(projectName)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load stashes');
      }
      
      const data = await response.json();
      setStashes(data.stashes || []);
    } catch (error) {
      console.error('Error loading stashes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStash = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/git-advanced/stash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          project: projectName,
          message: newStashMessage || 'WIP: stash created from UI',
          includeUntracked
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create stash');
      }
      
      setNewStashMessage('');
      setIncludeUntracked(false);
      setShowCreateForm(false);
      await loadStashes();
    } catch (error) {
      console.error('Error creating stash:', error);
      alert('Failed to create stash: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const applyStash = async (index) => {
    try {
      setOperating(true);
      const response = await fetch(`/api/git-advanced/stash/${index}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ project: projectName })
      });
      
      if (!response.ok) {
        throw new Error('Failed to apply stash');
      }
      
      await loadStashes();
    } catch (error) {
      console.error('Error applying stash:', error);
      alert('Failed to apply stash: ' + error.message);
    } finally {
      setOperating(false);
    }
  };

  const popStash = async (index) => {
    try {
      setOperating(true);
      const response = await fetch(`/api/git-advanced/stash/${index}/pop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ project: projectName })
      });
      
      if (!response.ok) {
        throw new Error('Failed to pop stash');
      }
      
      await loadStashes();
    } catch (error) {
      console.error('Error popping stash:', error);
      alert('Failed to pop stash: ' + error.message);
    } finally {
      setOperating(false);
    }
  };

  const deleteStash = async (index) => {
    if (!confirm('Are you sure you want to delete this stash? This action cannot be undone.')) {
      return;
    }

    try {
      setOperating(true);
      const response = await fetch(`/api/git-advanced/stash/${index}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ project: projectName })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete stash');
      }
      
      await loadStashes();
      if (selectedStash?.index === index) {
        setSelectedStash(null);
        setShowDiff(false);
      }
    } catch (error) {
      console.error('Error deleting stash:', error);
      alert('Failed to delete stash: ' + error.message);
    } finally {
      setOperating(false);
    }
  };

  const showStashDiff = async (stash) => {
    try {
      setSelectedStash(stash);
      setShowDiff(true);
      
      const response = await fetch(`/api/git-advanced/stash/${stash.index}/show?project=${encodeURIComponent(projectName)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load stash diff');
      }
      
      const data = await response.json();
      setStashDiff(data.diff || 'No changes to display');
    } catch (error) {
      console.error('Error loading stash diff:', error);
      setStashDiff('Error loading diff: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading stashes...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold">Stash Management</h2>
              <p className="text-sm text-gray-600">
                {stashes.length} stash{stashes.length !== 1 ? 'es' : ''} available
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 ${getButtonStyle('primary')}`}
            >
              <Plus className="w-4 h-4" />
              <span>New Stash</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Stashes List */}
          <div className="w-1/2 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              {stashes.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No stashes found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Create a stash to save your current work
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stashes.map((stash) => (
                    <div
                      key={stash.ref}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedStash?.ref === stash.ref
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {stash.ref}
                            </span>
                            <span className="text-xs text-gray-500">
                              {stash.hash}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {stash.message}
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{stash.date}</span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1 ml-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              showStashDiff(stash);
                            }}
                            className={`p-1 text-gray-400 rounded ${gitTheme.colors.interactive.hover}`}
                            title="View diff"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              applyStash(stash.index);
                            }}
                            disabled={operating}
                            className={`p-1 text-gray-400 rounded disabled:opacity-50 ${gitTheme.colors.interactive.hover}`}
                            title="Apply stash"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              popStash(stash.index);
                            }}
                            disabled={operating}
                            className={`p-1 text-gray-400 rounded disabled:opacity-50 ${gitTheme.colors.interactive.hover}`}
                            title="Pop stash (apply and remove)"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteStash(stash.index);
                            }}
                            disabled={operating}
                            className={`p-1 text-gray-400 rounded disabled:opacity-50 ${gitTheme.colors.interactive.hover}`}
                            title="Delete stash"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stash Diff */}
          <div className="flex-1 flex flex-col">
            {showDiff && selectedStash ? (
              <>
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium text-gray-900">
                    {selectedStash.ref}: {selectedStash.message}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedStash.date} • {selectedStash.hash}
                  </p>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  <pre className="text-sm font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded border">
                    {stashDiff}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Select a stash to view its changes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Stash Modal */}
        {showCreateForm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create New Stash</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stash Message
                  </label>
                  <input
                    type="text"
                    value={newStashMessage}
                    onChange={(e) => setNewStashMessage(e.target.value)}
                    placeholder="WIP: describe your changes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeUntracked"
                    checked={includeUntracked}
                    onChange={(e) => setIncludeUntracked(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeUntracked" className="ml-2 text-sm text-gray-700">
                    Include untracked files
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewStashMessage('');
                    setIncludeUntracked(false);
                  }}
                  className={`px-4 py-2 rounded-md ${getButtonStyle('secondary')}`}
                >
                  Cancel
                </button>
                <button
                  onClick={createStash}
                  disabled={creating}
                  className={`px-4 py-2 rounded-md disabled:opacity-50 flex items-center space-x-2 ${getButtonStyle('primary')}`}
                >
                  <Save className="w-4 h-4" />
                  <span>{creating ? 'Creating...' : 'Create Stash'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StashPanel;