import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useAgentStore from '../stores/agentStore';
import { 
  ArrowLeft, 
  Save, 
  Bot, 
  Wand2, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * Agent 创建/编辑组件
 * 基于 claudia 项目的 CreateAgent.tsx 设计
 */
function CreateAgent({ agent = null, onBack, isEdit = false }) {
  const { createAgent, updateAgent, isLoadingAgents, error, clearError } = useAgentStore();
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '🤖',
    system_prompt: '',
    default_task: '',
    model: 'claude-3.5-sonnet'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  // 可用的模型选项
  const modelOptions = [
    { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Recommended)' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
  ];
  
  // 常用图标选项
  const iconOptions = [
    '🤖', '🎯', '⚡', '🔧', '📝', '🎨', '🔍', '💡', 
    '🚀', '⭐', '🎪', '🎭', '🎨', '🎵', '🎮', '🏆'
  ];
  
  // 预设的系统提示模板
  const promptTemplates = [
    {
      name: 'Code Assistant',
      icon: '💻',
      prompt: 'You are an expert software developer and code assistant. Help users write, debug, and optimize code across various programming languages. Provide clear explanations, best practices, and efficient solutions.'
    },
    {
      name: 'Data Analyst',
      icon: '📊',
      prompt: 'You are a skilled data analyst. Help users analyze data, create visualizations, and derive insights. Provide statistical analysis, data cleaning suggestions, and interpretation of results.'
    },
    {
      name: 'Content Writer',
      icon: '✍️',
      prompt: 'You are a professional content writer and editor. Help users create engaging, well-structured content for various purposes including blogs, articles, marketing copy, and documentation.'
    },
    {
      name: 'Project Manager',
      icon: '📋',
      prompt: 'You are an experienced project manager. Help users plan projects, break down tasks, estimate timelines, and organize workflows. Provide practical project management advice and methodologies.'
    }
  ];
  
  // 初始化表单数据
  useEffect(() => {
    if (agent && isEdit) {
      setFormData({
        name: agent.name || '',
        icon: agent.icon || '🤖',
        system_prompt: agent.system_prompt || '',
        default_task: agent.default_task || '',
        model: agent.model || 'claude-3.5-sonnet'
      });
    }
  }, [agent, isEdit]);
  
  // 清除错误
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);
  
  // 表单验证
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Agent name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Agent name must be at least 2 characters';
    }
    
    if (!formData.system_prompt.trim()) {
      errors.system_prompt = 'System prompt is required';
    } else if (formData.system_prompt.length < 10) {
      errors.system_prompt = 'System prompt must be at least 10 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (isEdit && agent) {
        await updateAgent(agent.id, formData);
      } else {
        await createAgent(formData);
      }
      onBack();
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 处理输入变化
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除相关的验证错误
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // 应用模板
  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      icon: template.icon,
      system_prompt: template.prompt,
      name: prev.name || template.name
    }));
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEdit ? 'Edit Agent' : 'Create New Agent'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEdit ? 'Modify your agent configuration' : 'Configure your new Claude Code agent'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center space-x-2"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPreview ? 'Hide Preview' : 'Preview'}</span>
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        </motion.div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Basic Information
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Agent Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter agent name"
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.name
                            ? 'border-red-300 dark:border-red-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {validationErrors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {validationErrors.name}
                        </p>
                      )}
                    </div>
                    
                    {/* Icon */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Icon
                      </label>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg">
                          {formData.icon}
                        </div>
                        <input
                          type="text"
                          value={formData.icon}
                          onChange={(e) => handleInputChange('icon', e.target.value)}
                          placeholder="🤖"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-8 gap-2">
                        {iconOptions.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => handleInputChange('icon', icon)}
                            className={`w-8 h-8 rounded-md flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              formData.icon === icon
                                ? 'bg-blue-100 dark:bg-blue-900/20 ring-2 ring-blue-500'
                                : 'bg-gray-50 dark:bg-gray-700'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Model
                      </label>
                      <select
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {modelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Templates */}
                {!isEdit && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Wand2 className="w-5 h-5" />
                      <span>Quick Templates</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {promptTemplates.map((template) => (
                        <button
                          key={template.name}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="p-3 text-left border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{template.icon}</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {template.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {template.prompt.substring(0, 80)}...
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* System Prompt */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    System Prompt *
                  </h3>
                  
                  <textarea
                    value={formData.system_prompt}
                    onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                    placeholder="Define the agent's role, capabilities, and behavior..."
                    rows={8}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      validationErrors.system_prompt
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {validationErrors.system_prompt && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors.system_prompt}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {formData.system_prompt.length} characters
                  </p>
                </div>
                
                {/* Default Task */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Default Task
                  </h3>
                  
                  <textarea
                    value={formData.default_task}
                    onChange={(e) => handleInputChange('default_task', e.target.value)}
                    placeholder="Optional: Define a default task or instruction for this agent..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    This will be pre-filled when executing the agent
                  </p>
                </div>
                
                {/* Submit Button */}
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Saving...' : (isEdit ? 'Update Agent' : 'Create Agent')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
            
            {/* Preview */}
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-fit sticky top-4"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Preview</span>
                </h3>
                
                <div className="space-y-4">
                  {/* Agent Card Preview */}
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <span className="text-lg">{formData.icon || '🤖'}</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {formData.name || 'Untitled Agent'}
                          </h4>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date().toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {formData.system_prompt ? 
                        formData.system_prompt.substring(0, 100) + '...' : 
                        'No system prompt defined'
                      }
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md">
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formData.model}
                      </span>
                    </div>
                  </div>
                  
                  {/* Validation Status */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Validation
                    </h4>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs">
                        {formData.name.trim() ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className={formData.name.trim() ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          Agent name
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        {formData.system_prompt.trim().length >= 10 ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className={formData.system_prompt.trim().length >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          System prompt (min 10 chars)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateAgent;