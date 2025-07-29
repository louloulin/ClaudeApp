import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Upload, Hash, Calendar, MessageSquare, X, Save } from 'lucide-react';
import { gitTheme, getButtonStyle, getAlertStyle } from '../../styles/gitTheme';

const TagManager = ({ projectName, onClose }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', message: '', commit: 'HEAD' });
  const [operating, setOperating] = useState(false);
  const [selectedTags, setSelectedTags] = useState(new Set());

  useEffect(() => {
    loadTags();
  }, [projectName]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/git-advanced/tags?project=${encodeURIComponent(projectName)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load tags');
      }
      
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTag.name.trim()) {
      alert('Tag name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/git-advanced/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          project: projectName,
          name: newTag.name.trim(),
          message: newTag.message.trim() || undefined,
          commit: newTag.commit.trim() || 'HEAD'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tag');
      }
      
      setNewTag({ name: '', message: '', commit: 'HEAD' });
      setShowCreateForm(false);
      await loadTags();
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteTag = async (tagName) => {
    if (!confirm(`Are you sure you want to delete tag "${tagName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setOperating(true);
      const response = await fetch(`/api/git-advanced/tags/${encodeURIComponent(tagName)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ project: projectName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tag');
      }
      
      await loadTags();
      setSelectedTags(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagName);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Failed to delete tag: ' + error.message);
    } finally {
      setOperating(false);
    }
  };

  const pushTag = async (tagName) => {
    try {
      setOperating(true);
      const response = await fetch(`/api/git-advanced/tags/${encodeURIComponent(tagName)}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ 
          project: projectName,
          remote: 'origin'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to push tag');
      }
      
      alert(`Tag "${tagName}" pushed successfully`);
    } catch (error) {
      console.error('Error pushing tag:', error);
      alert('Failed to push tag: ' + error.message);
    } finally {
      setOperating(false);
    }
  };

  const toggleTagSelection = (tagName) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagName)) {
        newSet.delete(tagName);
      } else {
        newSet.add(tagName);
      }
      return newSet;
    });
  };

  const deleteSelectedTags = async () => {
    if (selectedTags.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTags.size} selected tag${selectedTags.size > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    try {
      setOperating(true);
      const promises = Array.from(selectedTags).map(tagName => 
        fetch(`/api/git-advanced/tags/${encodeURIComponent(tagName)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({ project: projectName })
        })
      );
      
      await Promise.all(promises);
      await loadTags();
      setSelectedTags(new Set());
    } catch (error) {
      console.error('Error deleting tags:', error);
      alert('Failed to delete some tags: ' + error.message);
    } finally {
      setOperating(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const isValidTagName = (name) => {
    // Git tag name validation
    const invalidChars = /[\s~^:?*\[\\]/;
    return name && !invalidChars.test(name) && !name.startsWith('.') && !name.endsWith('.lock');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading tags...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Tag className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-xl font-semibold">Tag Management</h2>
              <p className="text-sm text-gray-600">
                {tags.length} tag{tags.length !== 1 ? 's' : ''} available
                {selectedTags.size > 0 && (
                  <span className="ml-2 text-blue-600">
                    ({selectedTags.size} selected)
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {selectedTags.size > 0 && (
              <button
                onClick={deleteSelectedTags}
                disabled={operating}
                className={`px-4 py-2 rounded-md disabled:opacity-50 flex items-center space-x-2 ${getButtonStyle('danger')}`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected</span>
              </button>
            )}
            <button
              onClick={() => setShowCreateForm(true)}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 ${getButtonStyle('primary')}`}
            >
              <Plus className="w-4 h-4" />
              <span>New Tag</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tags List */}
        <div className="flex-1 overflow-y-auto p-6">
          {tags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tags found</h3>
              <p className="text-gray-600 mb-4">
                Tags help you mark specific points in your repository's history
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 mx-auto ${getButtonStyle('primary')}`}
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Tag</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.name}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedTags.has(tag.name)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedTags.has(tag.name)}
                        onChange={() => toggleTagSelection(tag.name)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Tag className="w-4 h-4 text-green-500" />
                            <span>{tag.name}</span>
                          </h3>
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded flex items-center space-x-1">
                            <Hash className="w-3 h-3" />
                            <span>{tag.hash}</span>
                          </span>
                        </div>
                        
                        {tag.message && (
                          <div className="flex items-start space-x-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                            <p className="text-sm text-gray-700">{tag.message}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{tag.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => pushTag(tag.name)}
                        disabled={operating}
                        className={`p-2 text-gray-400 rounded disabled:opacity-50 ${gitTheme.colors.interactive.hover}`}
                        title="Push tag to remote"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTag(tag.name)}
                        disabled={operating}
                        className={`p-2 text-gray-400 rounded disabled:opacity-50 ${gitTheme.colors.interactive.hover}`}
                        title="Delete tag"
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

        {/* Create Tag Modal */}
        {showCreateForm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create New Tag</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tag Name *
                  </label>
                  <input
                    type="text"
                    value={newTag.name}
                    onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="v1.0.0"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      newTag.name && !isValidTagName(newTag.name)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {newTag.name && !isValidTagName(newTag.name) && (
                    <p className="text-xs text-red-600 mt-1">
                      Invalid tag name. Avoid spaces and special characters.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={newTag.message}
                    onChange={(e) => setNewTag(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Release notes or tag description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commit (optional)
                  </label>
                  <input
                    type="text"
                    value={newTag.commit}
                    onChange={(e) => setNewTag(prev => ({ ...prev, commit: e.target.value }))}
                    placeholder="HEAD (current commit)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave as "HEAD" to tag the current commit, or specify a commit hash
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTag({ name: '', message: '', commit: 'HEAD' });
                  }}
                  className={`px-4 py-2 rounded-md ${getButtonStyle('secondary')}`}
                >
                  Cancel
                </button>
                <button
                  onClick={createTag}
                  disabled={creating || !newTag.name.trim() || !isValidTagName(newTag.name)}
                  className={`px-4 py-2 rounded-md disabled:opacity-50 flex items-center space-x-2 ${getButtonStyle('primary')}`}
                >
                  <Save className="w-4 h-4" />
                  <span>{creating ? 'Creating...' : 'Create Tag'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager;