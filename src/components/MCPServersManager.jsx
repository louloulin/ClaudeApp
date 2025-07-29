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
import { Trash2, Edit, Play, Square, Eye, Plus, Server, Settings, Activity, Plug } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const MCPServersManager = () => {
  const [servers, setServers] = useState([]);
  const [toolUsage, setToolUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isToolsDialogOpen, setIsToolsDialogOpen] = useState(false);
  const [serverTools, setServerTools] = useState([]);
  const [activeTab, setActiveTab] = useState('servers');
  const { toast } = useToast();

  const [newServer, setNewServer] = useState({
    name: '',
    description: '',
    transport_type: 'stdio',
    command: '',
    args: '',
    env_vars: '{}',
    scope: 'global',
    enabled: true
  });

  const transportTypes = ['stdio', 'sse'];
  const scopes = ['global', 'project', 'user'];

  useEffect(() => {
    fetchServers();
    fetchToolUsage();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/mcp-servers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setServers(data);
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "获取MCP服务器列表失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchToolUsage = async () => {
    try {
      const response = await fetch('/api/mcp-servers/tool-usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setToolUsage(data);
      }
    } catch (error) {
      console.error('Failed to fetch tool usage:', error);
    }
  };

  const fetchServerTools = async (serverId) => {
    try {
      const response = await fetch(`/api/mcp-servers/${serverId}/tools`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
      });
      if (response.ok) {
        const data = await response.json();
        setServerTools(data.tools || []);
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "获取工具列表失败",
        variant: "destructive"
      });
    }
  };

  const createServer = async () => {
    try {
      const serverData = {
        ...newServer,
        args: newServer.args ? newServer.args.split(' ').filter(arg => arg.trim()) : [],
        env_vars: JSON.parse(newServer.env_vars || '{}')
      };

      const response = await fetch('/api/mcp-servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(serverData)
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "MCP服务器创建成功"
        });
        setIsCreateDialogOpen(false);
        setNewServer({
          name: '',
          description: '',
          transport_type: 'stdio',
          command: '',
          args: '',
          env_vars: '{}',
          scope: 'global',
          enabled: true
        });
        fetchServers();
      } else {
        throw new Error('Failed to create server');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "创建MCP服务器失败",
        variant: "destructive"
      });
    }
  };

  const updateServer = async () => {
    try {
      const serverData = {
        ...selectedServer,
        args: Array.isArray(selectedServer.args) ? selectedServer.args : selectedServer.args.split(' ').filter(arg => arg.trim()),
        env_vars: typeof selectedServer.env_vars === 'string' ? JSON.parse(selectedServer.env_vars) : selectedServer.env_vars
      };

      const response = await fetch(`/api/mcp-servers/${selectedServer.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
        body: JSON.stringify(serverData)
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "MCP服务器更新成功"
        });
        setIsEditDialogOpen(false);
        setSelectedServer(null);
        fetchServers();
      } else {
        throw new Error('Failed to update server');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新MCP服务器失败",
        variant: "destructive"
      });
    }
  };

  const deleteServer = async (serverId) => {
    if (!confirm('确定要删除这个MCP服务器吗？')) return;

    try {
      const response = await fetch(`/api/mcp-servers/${serverId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "MCP服务器删除成功"
        });
        fetchServers();
      } else {
        throw new Error('Failed to delete server');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除MCP服务器失败",
        variant: "destructive"
      });
    }
  };

  const startServer = async (serverId) => {
    try {
      const response = await fetch(`/api/mcp-servers/${serverId}/start`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "MCP服务器启动成功"
        });
        fetchServers();
      } else {
        throw new Error('Failed to start server');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "启动MCP服务器失败",
        variant: "destructive"
      });
    }
  };

  const stopServer = async (serverId) => {
    try {
      const response = await fetch(`/api/mcp-servers/${serverId}/stop`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "MCP服务器停止成功"
        });
        fetchServers();
      } else {
        throw new Error('Failed to stop server');
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "停止MCP服务器失败",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'running': { color: 'bg-green-500', text: '运行中' },
      'stopped': { color: 'bg-gray-500', text: '已停止' },
      'error': { color: 'bg-red-500', text: '错误' },
      'starting': { color: 'bg-blue-500', text: '启动中' },
      'stopping': { color: 'bg-orange-500', text: '停止中' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const getScopeBadge = (scope) => {
    const scopeConfig = {
      'global': { color: 'bg-purple-500', text: '全局' },
      'project': { color: 'bg-blue-500', text: '项目' },
      'user': { color: 'bg-green-500', text: '用户' }
    };
    
    const config = scopeConfig[scope] || { color: 'bg-gray-500', text: scope };
    return (
      <Badge variant="outline" className={`${config.color} text-white border-0`}>
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
          <Server className="h-8 w-8" />
          MCP 服务器管理
        </h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              添加服务器
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加MCP服务器</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">服务器名称</Label>
                  <Input
                    id="name"
                    value={newServer.name}
                    onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                    placeholder="输入服务器名称"
                  />
                </div>
                <div>
                  <Label htmlFor="transport_type">传输类型</Label>
                  <Select value={newServer.transport_type} onValueChange={(value) => setNewServer({...newServer, transport_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transportTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={newServer.description}
                  onChange={(e) => setNewServer({...newServer, description: e.target.value})}
                  placeholder="输入服务器描述"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="command">命令</Label>
                <Input
                  id="command"
                  value={newServer.command}
                  onChange={(e) => setNewServer({...newServer, command: e.target.value})}
                  placeholder="例如: node server.js"
                />
              </div>

              <div>
                <Label htmlFor="args">参数</Label>
                <Input
                  id="args"
                  value={newServer.args}
                  onChange={(e) => setNewServer({...newServer, args: e.target.value})}
                  placeholder="用空格分隔的参数"
                />
              </div>

              <div>
                <Label htmlFor="env_vars">环境变量 (JSON)</Label>
                <Textarea
                  id="env_vars"
                  value={newServer.env_vars}
                  onChange={(e) => setNewServer({...newServer, env_vars: e.target.value})}
                  placeholder='{"KEY": "value"}'
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scope">作用域</Label>
                  <Select value={newServer.scope} onValueChange={(value) => setNewServer({...newServer, scope: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopes.map(scope => (
                        <SelectItem key={scope} value={scope}>
                          {scope === 'global' ? '全局' : scope === 'project' ? '项目' : '用户'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <Switch
                    checked={newServer.enabled}
                    onCheckedChange={(checked) => setNewServer({...newServer, enabled: checked})}
                  />
                  <Label>启用服务器</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={createServer}>
                  创建
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="servers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            服务器列表
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            工具使用统计
          </TabsTrigger>
        </TabsList>

        <TabsContent value="servers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map(server => (
              <Card key={server.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plug className="h-5 w-5" />
                      <span className="truncate">{server.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          fetchServerTools(server.id);
                          setSelectedServer(server);
                          setIsToolsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedServer({
                            ...server,
                            args: Array.isArray(server.args) ? server.args.join(' ') : server.args,
                            env_vars: JSON.stringify(server.env_vars, null, 2)
                          });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteServer(server.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(server.status)}
                      {getScopeBadge(server.scope)}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div><strong>传输:</strong> {server.transport_type.toUpperCase()}</div>
                      <div><strong>命令:</strong> {server.command}</div>
                      {server.description && (
                        <div><strong>描述:</strong> {server.description}</div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {server.status === 'running' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopServer(server.id)}
                          className="flex-1"
                        >
                          <Square className="h-4 w-4 mr-2" />
                          停止
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => startServer(server.id)}
                          className="flex-1"
                          disabled={!server.enabled}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          启动
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>MCP工具使用统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {toolUsage.map(usage => (
                  <div key={`${usage.server_id}-${usage.tool_name}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Plug className="h-4 w-4" />
                        <span className="font-medium">{usage.server_name}</span>
                        <Badge variant="outline">{usage.tool_name}</Badge>
                      </div>
                      <Badge>{usage.usage_count} 次使用</Badge>
                    </div>
                    <div className="text-sm text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>成功: {usage.success_count}</div>
                      <div>失败: {usage.error_count}</div>
                      <div>平均耗时: {usage.avg_duration}ms</div>
                      <div>最后使用: {usage.last_used ? new Date(usage.last_used).toLocaleDateString() : '无'}</div>
                    </div>
                  </div>
                ))}
                {toolUsage.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    暂无工具使用统计
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Server Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑MCP服务器</DialogTitle>
          </DialogHeader>
          {selectedServer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">服务器名称</Label>
                  <Input
                    id="edit-name"
                    value={selectedServer.name}
                    onChange={(e) => setSelectedServer({...selectedServer, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-transport_type">传输类型</Label>
                  <Select value={selectedServer.transport_type} onValueChange={(value) => setSelectedServer({...selectedServer, transport_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transportTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={selectedServer.description}
                  onChange={(e) => setSelectedServer({...selectedServer, description: e.target.value})}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="edit-command">命令</Label>
                <Input
                  id="edit-command"
                  value={selectedServer.command}
                  onChange={(e) => setSelectedServer({...selectedServer, command: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-args">参数</Label>
                <Input
                  id="edit-args"
                  value={selectedServer.args}
                  onChange={(e) => setSelectedServer({...selectedServer, args: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit-env_vars">环境变量 (JSON)</Label>
                <Textarea
                  id="edit-env_vars"
                  value={selectedServer.env_vars}
                  onChange={(e) => setSelectedServer({...selectedServer, env_vars: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-scope">作用域</Label>
                  <Select value={selectedServer.scope} onValueChange={(value) => setSelectedServer({...selectedServer, scope: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopes.map(scope => (
                        <SelectItem key={scope} value={scope}>
                          {scope === 'global' ? '全局' : scope === 'project' ? '项目' : '用户'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <Switch
                    checked={selectedServer.enabled}
                    onCheckedChange={(checked) => setSelectedServer({...selectedServer, enabled: checked})}
                  />
                  <Label>启用服务器</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={updateServer}>
                  更新
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Server Tools Dialog */}
      <Dialog open={isToolsDialogOpen} onOpenChange={setIsToolsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedServer?.name} - 可用工具
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {serverTools.map((tool, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{tool.name}</h4>
                  <Badge variant="outline">{tool.type || 'tool'}</Badge>
                </div>
                {tool.description && (
                  <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
                )}
                {tool.inputSchema && (
                  <div className="text-xs bg-gray-50 p-2 rounded">
                    <strong>输入参数:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
            {serverTools.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                暂无可用工具或服务器未运行
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCPServersManager;