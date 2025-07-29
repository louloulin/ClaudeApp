import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Trash2, Edit, Play, Square, Eye, Plus, Bot, Settings, Activity } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const CCAgentsManager = () => {
  const [agents, setAgents] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('agents');
  const { toast } = useToast();

  const [newAgent, setNewAgent] = useState({
    name: '',
    icon: '🤖',
    system_prompt: '',
    default_task: '',
    model: 'claude-3-5-sonnet-20241022',
    enable_file_read: true,
    enable_file_write: false,
    enable_network: false,
    hooks: '{}'
  });

  const models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ];

  const icons = ['🤖', '🧠', '⚡', '🔧', '📊', '🎯', '🚀', '💡', '🔍', '📝'];

  useEffect(() => {
    fetchAgents();
    fetchExecutions();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "获取代理列表失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const response = await fetch('/api/agents/executions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setExecutions(data);
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    }
  };

  const createAgent = async () => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newAgent)
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "代理创建成功"
        });
        setIsCreateDialogOpen(false);
        setNewAgent({
          name: '',
          icon: '🤖',
          system_prompt: '',
          default_task: '',
          model: 'claude-3-5-sonnet-20241022',
          enable_file_read: true,
          enable_file_write: false,
          enable_network: false,
          hooks: '{}'
        });
        fetchAgents();
      } else {
        throw new Error('Failed to create agent');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "创建代理失败",
        variant: "destructive"
      });
    }
  };

  const updateAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(selectedAgent)
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "代理更新成功"
        });
        setIsEditDialogOpen(false);
        setSelectedAgent(null);
        fetchAgents();
      } else {
        throw new Error('Failed to update agent');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新代理失败",
        variant: "destructive"
      });
    }
  };

  const deleteAgent = async (agentId) => {
    if (!confirm('确定要删除这个代理吗？')) return;

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "代理删除成功"
        });
        fetchAgents();
      } else {
        throw new Error('Failed to delete agent');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除代理失败",
        variant: "destructive"
      });
    }
  };

  const executeAgent = async (agentId, task = '') => {
    try {
      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ task, project_path: '/tmp' })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "成功",
          description: `代理执行已启动，执行ID: ${data.execution_id}`
        });
        fetchExecutions();
      } else {
        throw new Error('Failed to execute agent');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "执行代理失败",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'running': { color: 'bg-blue-500', text: '运行中' },
      'completed': { color: 'bg-green-500', text: '已完成' },
      'failed': { color: 'bg-red-500', text: '失败' },
      'cancelled': { color: 'bg-gray-500', text: '已取消' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8" />
          CC Agents 管理
        </h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              创建代理
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建新代理</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">代理名称</Label>
                  <Input
                    id="name"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    placeholder="输入代理名称"
                  />
                </div>
                <div>
                  <Label htmlFor="icon">图标</Label>
                  <Select value={newAgent.icon} onValueChange={(value) => setNewAgent({...newAgent, icon: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {icons.map(icon => (
                        <SelectItem key={icon} value={icon}>
                          {icon} {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="model">模型</Label>
                <Select value={newAgent.model} onValueChange={(value) => setNewAgent({...newAgent, model: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(model => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="system_prompt">系统提示</Label>
                <Textarea
                  id="system_prompt"
                  value={newAgent.system_prompt}
                  onChange={(e) => setNewAgent({...newAgent, system_prompt: e.target.value})}
                  placeholder="输入系统提示"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="default_task">默认任务</Label>
                <Input
                  id="default_task"
                  value={newAgent.default_task}
                  onChange={(e) => setNewAgent({...newAgent, default_task: e.target.value})}
                  placeholder="输入默认任务"
                />
              </div>

              <div className="space-y-2">
                <Label>权限设置</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newAgent.enable_file_read}
                    onCheckedChange={(checked) => setNewAgent({...newAgent, enable_file_read: checked})}
                  />
                  <Label>允许读取文件</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newAgent.enable_file_write}
                    onCheckedChange={(checked) => setNewAgent({...newAgent, enable_file_write: checked})}
                  />
                  <Label>允许写入文件</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newAgent.enable_network}
                    onCheckedChange={(checked) => setNewAgent({...newAgent, enable_network: checked})}
                  />
                  <Label>允许网络访问</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={createAgent}>
                  创建
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            代理列表
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            执行记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{agent.icon}</span>
                      <span className="truncate">{agent.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedAgent(agent);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAgent(agent.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <strong>模型:</strong> {agent.model}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>默认任务:</strong> {agent.default_task || '无'}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {agent.enable_file_read && <Badge variant="secondary">读文件</Badge>}
                      {agent.enable_file_write && <Badge variant="secondary">写文件</Badge>}
                      {agent.enable_network && <Badge variant="secondary">网络</Badge>}
                    </div>
                    <Button
                      className="w-full mt-3"
                      onClick={() => executeAgent(agent.id, agent.default_task)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      执行代理
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="executions">
          <Card>
            <CardHeader>
              <CardTitle>执行记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.map(execution => (
                  <div key={execution.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{execution.agent_icon}</span>
                        <span className="font-medium">{execution.agent_name}</span>
                      </div>
                      {getStatusBadge(execution.status)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>任务:</strong> {execution.task || '默认任务'}</div>
                      <div><strong>模型:</strong> {execution.model}</div>
                      <div><strong>开始时间:</strong> {new Date(execution.created_at).toLocaleString()}</div>
                      {execution.completed_at && (
                        <div><strong>完成时间:</strong> {new Date(execution.completed_at).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ))}
                {executions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    暂无执行记录
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Agent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑代理</DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">代理名称</Label>
                  <Input
                    id="edit-name"
                    value={selectedAgent.name}
                    onChange={(e) => setSelectedAgent({...selectedAgent, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-icon">图标</Label>
                  <Select value={selectedAgent.icon} onValueChange={(value) => setSelectedAgent({...selectedAgent, icon: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {icons.map(icon => (
                        <SelectItem key={icon} value={icon}>
                          {icon} {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-model">模型</Label>
                <Select value={selectedAgent.model} onValueChange={(value) => setSelectedAgent({...selectedAgent, model: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(model => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-system_prompt">系统提示</Label>
                <Textarea
                  id="edit-system_prompt"
                  value={selectedAgent.system_prompt}
                  onChange={(e) => setSelectedAgent({...selectedAgent, system_prompt: e.target.value})}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="edit-default_task">默认任务</Label>
                <Input
                  id="edit-default_task"
                  value={selectedAgent.default_task}
                  onChange={(e) => setSelectedAgent({...selectedAgent, default_task: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>权限设置</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedAgent.enable_file_read}
                    onCheckedChange={(checked) => setSelectedAgent({...selectedAgent, enable_file_read: checked})}
                  />
                  <Label>允许读取文件</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedAgent.enable_file_write}
                    onCheckedChange={(checked) => setSelectedAgent({...selectedAgent, enable_file_write: checked})}
                  />
                  <Label>允许写入文件</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedAgent.enable_network}
                    onCheckedChange={(checked) => setSelectedAgent({...selectedAgent, enable_network: checked})}
                  />
                  <Label>允许网络访问</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={updateAgent}>
                  更新
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CCAgentsManager;