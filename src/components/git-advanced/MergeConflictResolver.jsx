import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, GitMerge, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';
import { gitTheme, getButtonStyle, getAlertStyle } from '../../styles/gitTheme';

const MergeConflictResolver = ({ projectName, onClose, onResolved }) => {
  const [conflicts, setConflicts] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [resolvedContent, setResolvedContent] = useState('');
  const [expandedConflicts, setExpandedConflicts] = useState(new Set());
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadConflicts();
  }, [projectName]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/git-advanced/conflicts?project=${encodeURIComponent(projectName)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load conflicts');
      }
      
      const data = await response.json();
      setConflicts(data.conflicts || []);
      setIsMerging(data.isMerging);
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (filePath) => {
    try {
      const response = await fetch(`/api/git-advanced/conflicts/${encodeURIComponent(filePath)}?project=${encodeURIComponent(projectName)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load file content');
      }
      
      const data = await response.json();
      setFileContent(data.content);
      setResolvedContent(data.content);
      setSelectedFile({ path: filePath, conflicts: data.conflicts });
    } catch (error) {
      console.error('Error loading file content:', error);
    }
  };

  const resolveConflict = async (filePath, resolution, content = null) => {
    try {
      setResolving(true);
      const response = await fetch('/api/git-advanced/conflicts/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          project: projectName,
          filePath,
          resolution,
          content
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve conflict');
      }
      
      // Reload conflicts after resolution
      await loadConflicts();
      setSelectedFile(null);
      setFileContent('');
      setResolvedContent('');
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setResolving(false);
    }
  };

  const abortMerge = async () => {
    try {
      setResolving(true);
      const response = await fetch('/api/git-advanced/merge/abort', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ project: projectName })
      });
      
      if (!response.ok) {
        throw new Error('Failed to abort merge');
      }
      
      onResolved?.();
      onClose();
    } catch (error) {
      console.error('Error aborting merge:', error);
    } finally {
      setResolving(false);
    }
  };

  const continueMerge = async () => {
    try {
      setResolving(true);
      const response = await fetch('/api/git-advanced/merge/continue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ 
          project: projectName,
          message: 'Merge commit - conflicts resolved'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to continue merge');
      }
      
      onResolved?.();
      onClose();
    } catch (error) {
      console.error('Error continuing merge:', error);
      alert(error.message);
    } finally {
      setResolving(false);
    }
  };

  const toggleConflictExpansion = (index) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedConflicts(newExpanded);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'both_modified':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'both_added':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'both_deleted':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'both_modified':
        return 'Both Modified';
      case 'both_added':
        return 'Both Added';
      case 'both_deleted':
        return 'Both Deleted';
      default:
        return 'Conflict';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading conflicts...</span>
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
            <GitMerge className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold">Merge Conflict Resolution</h2>
              <p className="text-sm text-gray-600">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} found
                {isMerging && ' (merge in progress)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Conflicts List */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Conflicted Files</h3>
              {conflicts.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600">No conflicts found</p>
                  {isMerging && (
                    <button
                      onClick={continueMerge}
                      disabled={resolving}
                      className={`mt-4 px-4 py-2 rounded-md disabled:opacity-50 ${getButtonStyle('primary')}`}
                    >
                      {resolving ? 'Continuing...' : 'Continue Merge'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((conflict, index) => (
                    <div
                      key={conflict.path}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedFile?.path === conflict.path
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => loadFileContent(conflict.path)}
                    >
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(conflict.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conflict.path.split('/').pop()}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {conflict.path}
                          </p>
                          <p className="text-xs text-orange-600">
                            {getStatusText(conflict.status)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File Content */}
          <div className="flex-1 flex flex-col">
            {selectedFile ? (
              <>
                {/* File Header */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedFile.path}</h3>
                      <p className="text-sm text-gray-600">
                        {selectedFile.conflicts?.length || 0} conflict{selectedFile.conflicts?.length !== 1 ? 's' : ''} in this file
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => resolveConflict(selectedFile.path, 'ours')}
                        disabled={resolving}
                        className={`px-3 py-1 rounded text-sm disabled:opacity-50 ${getButtonStyle('primary')}`}
                      >
                        Accept Ours
                      </button>
                      <button
                        onClick={() => resolveConflict(selectedFile.path, 'theirs')}
                        disabled={resolving}
                        className={`px-3 py-1 rounded text-sm disabled:opacity-50 ${getButtonStyle('success')}`}
                      >
                        Accept Theirs
                      </button>
                      <button
                        onClick={() => resolveConflict(selectedFile.path, null, resolvedContent)}
                        disabled={resolving}
                        className={`px-3 py-1 rounded text-sm disabled:opacity-50 ${getButtonStyle('info')}`}
                      >
                        Save Manual
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Editor */}
                <div className="flex-1 p-4">
                  <textarea
                    value={resolvedContent}
                    onChange={(e) => setResolvedContent(e.target.value)}
                    className="w-full h-full font-mono text-sm border rounded-md p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Edit the file content to resolve conflicts..."
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Select a conflicted file to view and resolve conflicts</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={abortMerge}
              disabled={resolving}
              className={`px-4 py-2 rounded-md disabled:opacity-50 ${getButtonStyle('danger')}`}
            >
              {resolving ? 'Aborting...' : 'Abort Merge'}
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-md ${getButtonStyle('secondary')}`}
              >
                Close
              </button>
              {conflicts.length === 0 && isMerging && (
                <button
                  onClick={continueMerge}
                  disabled={resolving}
                  className={`px-4 py-2 rounded-md disabled:opacity-50 ${getButtonStyle('primary')}`}
                >
                  {resolving ? 'Continuing...' : 'Continue Merge'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeConflictResolver;