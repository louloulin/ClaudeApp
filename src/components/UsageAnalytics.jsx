import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { BarChart3, TrendingUp, DollarSign, Activity, Users, Bot, Calendar, Filter } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const UsageAnalytics = () => {
  const [overview, setOverview] = useState(null);
  const [usageRecords, setUsageRecords] = useState([]);
  const [costAnalysis, setCostAnalysis] = useState(null);
  const [agentStats, setAgentStats] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [filters, setFilters] = useState({
    operation_type: '',
    model: '',
    agent_id: '',
    user_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOverview(),
        fetchUsageRecords(),
        fetchCostAnalysis(),
        fetchAgentStats(),
        fetchUserStats()
      ]);
    } catch (error) {
      toast({
        title: "错误",
        description: "获取数据失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const response = await fetch('/api/usage/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOverview(data);
      }
    } catch (error) {
      console.error('Failed to fetch overview:', error);
    }
  };

  const fetchUsageRecords = async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      
      const response = await fetch(`/api/usage/records?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsageRecords(data.records || []);
      }
    } catch (error) {
      console.error('Failed to fetch usage records:', error);
    }
  };

  const fetchCostAnalysis = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange.replace('d', '')));
      
      const response = await fetch(`/api/usage/cost-analysis?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCostAnalysis(data);
      }
    } catch (error) {
      console.error('Failed to fetch cost analysis:', error);
    }
  };

  const fetchAgentStats = async () => {
    try {
      const response = await fetch('/api/usage/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAgentStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/usage/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  const getOperationTypeColor = (type) => {
    const colors = {
      'chat': 'bg-blue-500',
      'agent_execution': 'bg-green-500',
      'mcp_tool': 'bg-purple-500',
      'file_operation': 'bg-orange-500'
    };
    return colors[type] || 'bg-gray-500';
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
          <BarChart3 className="h-8 w-8" />
          使用分析
        </h1>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">最近1天</SelectItem>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近30天</SelectItem>
              <SelectItem value="90d">最近90天</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline">
            刷新
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            使用记录
          </TabsTrigger>
          <TabsTrigger value="cost" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            成本分析
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            代理统计
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            用户统计
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">总请求数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(overview.total_requests)}</div>
                  <div className="text-sm text-gray-500">所有操作类型</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">总Token使用</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(overview.total_tokens)}</div>
                  <div className="text-sm text-gray-500">
                    输入: {formatNumber(overview.input_tokens)} | 输出: {formatNumber(overview.output_tokens)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">总成本</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(overview.total_cost)}</div>
                  <div className="text-sm text-gray-500">累计花费</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">活跃用户</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(overview.active_users)}</div>
                  <div className="text-sm text-gray-500">当前周期</div>
                </CardContent>
              </Card>
            </div>
          )}

          {overview?.by_operation_type && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>按操作类型统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview.by_operation_type.map(item => (
                    <div key={item.operation_type} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getOperationTypeColor(item.operation_type)} text-white`}>
                          {item.operation_type}
                        </Badge>
                        <span className="font-medium">{item.count} 次请求</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.total_cost)}</div>
                        <div className="text-sm text-gray-500">{formatNumber(item.total_tokens)} tokens</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                使用记录
                <Button variant="outline" size="sm" onClick={() => {
                  setFilters({ operation_type: '', model: '', agent_id: '', user_id: '' });
                  fetchUsageRecords();
                }}>
                  <Filter className="h-4 w-4 mr-2" />
                  清除过滤
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>操作类型</Label>
                  <Select value={filters.operation_type} onValueChange={(value) => {
                    setFilters({...filters, operation_type: value});
                    fetchUsageRecords();
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部</SelectItem>
                      <SelectItem value="chat">聊天</SelectItem>
                      <SelectItem value="agent_execution">代理执行</SelectItem>
                      <SelectItem value="mcp_tool">MCP工具</SelectItem>
                      <SelectItem value="file_operation">文件操作</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>模型</Label>
                  <Input
                    placeholder="过滤模型"
                    value={filters.model}
                    onChange={(e) => setFilters({...filters, model: e.target.value})}
                  />
                </div>
                <div>
                  <Label>代理ID</Label>
                  <Input
                    placeholder="过滤代理"
                    value={filters.agent_id}
                    onChange={(e) => setFilters({...filters, agent_id: e.target.value})}
                  />
                </div>
                <div>
                  <Label>用户ID</Label>
                  <Input
                    placeholder="过滤用户"
                    value={filters.user_id}
                    onChange={(e) => setFilters({...filters, user_id: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                {usageRecords.map(record => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getOperationTypeColor(record.operation_type)} text-white`}>
                          {record.operation_type}
                        </Badge>
                        <span className="font-medium">{record.model}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(record.cost)}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(record.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>输入: {formatNumber(record.input_tokens)}</div>
                      <div>输出: {formatNumber(record.output_tokens)}</div>
                      <div>用户: {record.user_id}</div>
                      {record.agent_id && <div>代理: {record.agent_id}</div>}
                    </div>
                  </div>
                ))}
                {usageRecords.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    暂无使用记录
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          {costAnalysis && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>总成本</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(costAnalysis.total_cost)}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      预测月成本: {formatCurrency(costAnalysis.predicted_monthly_cost)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>平均每日成本</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(costAnalysis.avg_daily_cost)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>成本趋势</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-600">基于历史数据预测</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {costAnalysis.by_model && (
                <Card>
                  <CardHeader>
                    <CardTitle>按模型成本分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {costAnalysis.by_model.map(item => (
                        <div key={item.model} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{item.model}</div>
                            <div className="text-sm text-gray-500">{item.count} 次使用</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(item.total_cost)}</div>
                            <div className="text-sm text-gray-500">{formatNumber(item.total_tokens)} tokens</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>代理使用统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentStats.map(agent => (
                  <div key={agent.agent_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.agent_icon}</span>
                        <span className="font-medium">{agent.agent_name}</span>
                      </div>
                      <Badge>{agent.execution_count} 次执行</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">总成本</div>
                        <div className="font-medium">{formatCurrency(agent.total_cost)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">总Token</div>
                        <div className="font-medium">{formatNumber(agent.total_tokens)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">平均成本</div>
                        <div className="font-medium">{formatCurrency(agent.avg_cost)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">最后执行</div>
                        <div className="font-medium">
                          {agent.last_execution ? new Date(agent.last_execution).toLocaleDateString() : '无'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {agentStats.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    暂无代理统计数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>用户使用统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userStats.map(user => (
                  <div key={user.user_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">用户 {user.username || user.user_id}</div>
                      <Badge>{user.request_count} 次请求</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">总成本</div>
                        <div className="font-medium">{formatCurrency(user.total_cost)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">总Token</div>
                        <div className="font-medium">{formatNumber(user.total_tokens)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">代理执行</div>
                        <div className="font-medium">{user.agent_executions || 0} 次</div>
                      </div>
                      <div>
                        <div className="text-gray-600">最后活动</div>
                        <div className="font-medium">
                          {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : '无'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {userStats.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    暂无用户统计数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UsageAnalytics;