# Claudia API 参考文档

本文档详细描述了 Claudia 应用中所有可用的 Tauri 命令、数据结构和 API 接口。

## 目录

- [数据结构](#数据结构)
- [项目管理 API](#项目管理-api)
- [会话管理 API](#会话管理-api)
- [CC Agents API](#cc-agents-api)
- [使用分析 API](#使用分析-api)
- [MCP 服务器管理 API](#mcp-服务器管理-api)
- [Claude 管理 API](#claude-管理-api)
- [文件系统 API](#文件系统-api)
- [错误处理](#错误处理)

---

## 数据结构

### 核心数据类型

#### ProcessInfo
```typescript
interface ProcessInfo {
  pid: number;           // 进程 ID
  name: string;          // 进程名称
  cpu_usage: number;     // CPU 使用率 (0-100)
  memory_usage: number;  // 内存使用量 (字节)
  status: string;        // 进程状态
}
```

#### Project
```typescript
interface Project {
  id: string;                    // 项目唯一标识
  name: string;                  // 项目名称
  path: string;                  // 项目路径
  created_at: string;            // 创建时间 (ISO 8601)
  last_accessed: string;         // 最后访问时间 (ISO 8601)
  session_count: number;         // 会话数量
  total_cost: number;            // 总成本
  description?: string;          // 项目描述
  tags?: string[];               // 项目标签
  git_info?: GitInfo;            // Git 信息
}

interface GitInfo {
  branch: string;                // 当前分支
  commit_hash: string;           // 提交哈希
  is_dirty: boolean;             // 是否有未提交的更改
  remote_url?: string;           // 远程仓库 URL
}
```

#### Session
```typescript
interface Session {
  id: string;                    // 会话唯一标识
  project_id: string;            // 所属项目 ID
  name: string;                  // 会话名称
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
  message_count: number;         // 消息数量
  total_tokens: number;          // 总令牌数
  total_cost: number;            // 总成本
  model: string;                 // 使用的模型
  status: SessionStatus;         // 会话状态
  metadata?: Record<string, any>; // 元数据
}

type SessionStatus = 'active' | 'archived' | 'deleted';
```

#### ClaudeSettings
```typescript
interface ClaudeSettings {
  api_key?: string;              // API 密钥
  model: string;                 // 默认模型
  max_tokens: number;            // 最大令牌数
  temperature: number;           // 温度参数 (0-1)
  system_prompt?: string;        // 系统提示
  custom_instructions?: string;  // 自定义指令
  timeout: number;               // 请求超时时间 (秒)
  retry_attempts: number;        // 重试次数
}
```

### CC Agents 数据类型

#### Agent
```typescript
interface Agent {
  id: string;                    // 代理唯一标识
  name: string;                  // 代理名称
  description: string;           // 代理描述
  icon: string;                  // 代理图标 (emoji)
  system_prompt: string;         // 系统提示
  default_task: string;          // 默认任务
  model: string;                 // 使用的模型
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
  run_count: number;             // 运行次数
  success_rate: number;          // 成功率 (0-1)
  avg_duration: number;          // 平均运行时间 (秒)
  tags?: string[];               // 标签
  is_favorite: boolean;          // 是否收藏
  is_builtin: boolean;           // 是否内置
}

interface AgentRun {
  id: string;                    // 运行唯一标识
  agent_id: string;              // 代理 ID
  project_id: string;            // 项目 ID
  task: string;                  // 执行的任务
  status: AgentRunStatus;        // 运行状态
  started_at: string;            // 开始时间
  completed_at?: string;         // 完成时间
  duration?: number;             // 运行时长 (秒)
  input_tokens: number;          // 输入令牌数
  output_tokens: number;         // 输出令牌数
  cost: number;                  // 成本
  result?: string;               // 运行结果
  error?: string;                // 错误信息
  metadata?: Record<string, any>; // 元数据
}

type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

interface AgentRunMetrics {
  total_runs: number;            // 总运行次数
  successful_runs: number;       // 成功运行次数
  failed_runs: number;           // 失败运行次数
  avg_duration: number;          // 平均运行时间
  total_cost: number;            // 总成本
  total_tokens: number;          // 总令牌数
}
```

### 使用分析数据类型

#### UsageEntry
```typescript
interface UsageEntry {
  id: string;                    // 使用记录 ID
  project_id: string;            // 项目 ID
  session_id?: string;           // 会话 ID
  agent_id?: string;             // 代理 ID
  model: string;                 // 使用的模型
  input_tokens: number;          // 输入令牌数
  output_tokens: number;         // 输出令牌数
  cost: number;                  // 成本
  timestamp: string;             // 时间戳
  operation_type: OperationType; // 操作类型
  metadata?: Record<string, any>; // 元数据
}

type OperationType = 'chat' | 'agent_run' | 'code_generation' | 'analysis';

interface UsageStats {
  total_cost: number;            // 总成本
  total_tokens: number;          // 总令牌数
  total_requests: number;        // 总请求数
  avg_cost_per_request: number;  // 平均每请求成本
  model_usage: ModelUsage[];     // 模型使用统计
  daily_usage: DailyUsage[];     // 每日使用统计
  project_usage: ProjectUsage[]; // 项目使用统计
}

interface ModelUsage {
  model: string;                 // 模型名称
  request_count: number;         // 请求次数
  total_tokens: number;          // 总令牌数
  total_cost: number;            // 总成本
  percentage: number;            // 使用占比
}

interface DailyUsage {
  date: string;                  // 日期 (YYYY-MM-DD)
  cost: number;                  // 当日成本
  tokens: number;                // 当日令牌数
  requests: number;              // 当日请求数
}

interface ProjectUsage {
  project_id: string;            // 项目 ID
  project_name: string;          // 项目名称
  cost: number;                  // 项目成本
  tokens: number;                // 项目令牌数
  requests: number;              // 项目请求数
  percentage: number;            // 使用占比
}
```

### MCP 服务器数据类型

#### MCPServer
```typescript
interface MCPServer {
  id: string;                    // 服务器 ID
  name: string;                  // 服务器名称
  description?: string;          // 服务器描述
  command: string;               // 启动命令
  args?: string[];               // 命令参数
  env?: Record<string, string>;  // 环境变量
  status: ServerStatus;          // 服务器状态
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
  last_used?: string;            // 最后使用时间
  config?: MCPServerConfig;      // 服务器配置
}

type ServerStatus = 'stopped' | 'starting' | 'running' | 'error' | 'unknown';

interface MCPServerConfig {
  auto_start: boolean;           // 自动启动
  restart_on_failure: boolean;   // 失败时重启
  max_restarts: number;          // 最大重启次数
  timeout: number;               // 超时时间
  log_level: LogLevel;           // 日志级别
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

---

## 项目管理 API

### get_projects

获取所有项目列表。

```typescript
function get_projects(): Promise<Project[]>
```

**返回值**: `Project[]` - 项目列表

**示例**:
```typescript
const projects = await invoke('get_projects');
console.log('项目数量:', projects.length);
```

### get_project

根据 ID 获取特定项目。

```typescript
function get_project(project_id: string): Promise<Project | null>
```

**参数**:
- `project_id`: 项目 ID

**返回值**: `Project | null` - 项目信息或 null

**示例**:
```typescript
const project = await invoke('get_project', { project_id: 'proj_123' });
if (project) {
    console.log('项目名称:', project.name);
}
```

### create_project

创建新项目。

```typescript
function create_project(
    name: string,
    path: string,
    description?: string
): Promise<Project>
```

**参数**:
- `name`: 项目名称
- `path`: 项目路径
- `description`: 项目描述 (可选)

**返回值**: `Project` - 创建的项目

**示例**:
```typescript
const project = await invoke('create_project', {
    name: '我的项目',
    path: '/path/to/project',
    description: '这是一个测试项目'
});
```

### update_project

更新项目信息。

```typescript
function update_project(
    project_id: string,
    updates: Partial<Project>
): Promise<Project>
```

**参数**:
- `project_id`: 项目 ID
- `updates`: 要更新的字段

**返回值**: `Project` - 更新后的项目

**示例**:
```typescript
const updatedProject = await invoke('update_project', {
    project_id: 'proj_123',
    updates: {
        name: '新项目名称',
        description: '更新的描述'
    }
});
```

### delete_project

删除项目。

```typescript
function delete_project(project_id: string): Promise<void>
```

**参数**:
- `project_id`: 项目 ID

**示例**:
```typescript
await invoke('delete_project', { project_id: 'proj_123' });
console.log('项目已删除');
```

---

## 会话管理 API

### get_sessions

获取项目的所有会话。

```typescript
function get_sessions(project_id: string): Promise<Session[]>
```

**参数**:
- `project_id`: 项目 ID

**返回值**: `Session[]` - 会话列表

**示例**:
```typescript
const sessions = await invoke('get_sessions', { project_id: 'proj_123' });
console.log('会话数量:', sessions.length);
```

### get_session

获取特定会话。

```typescript
function get_session(session_id: string): Promise<Session | null>
```

**参数**:
- `session_id`: 会话 ID

**返回值**: `Session | null` - 会话信息或 null

### create_session

创建新会话。

```typescript
function create_session(
    project_id: string,
    name: string,
    model?: string
): Promise<Session>
```

**参数**:
- `project_id`: 项目 ID
- `name`: 会话名称
- `model`: 使用的模型 (可选)

**返回值**: `Session` - 创建的会话

### update_session

更新会话信息。

```typescript
function update_session(
    session_id: string,
    updates: Partial<Session>
): Promise<Session>
```

### delete_session

删除会话。

```typescript
function delete_session(session_id: string): Promise<void>
```

### archive_session

归档会话。

```typescript
function archive_session(session_id: string): Promise<void>
```

---

## CC Agents API

### get_agents

获取所有代理。

```typescript
function get_agents(): Promise<Agent[]>
```

**返回值**: `Agent[]` - 代理列表

**示例**:
```typescript
const agents = await invoke('get_agents');
const favoriteAgents = agents.filter(agent => agent.is_favorite);
```

### get_agent

获取特定代理。

```typescript
function get_agent(agent_id: string): Promise<Agent | null>
```

### create_agent

创建新代理。

```typescript
function create_agent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'run_count' | 'success_rate' | 'avg_duration'>): Promise<Agent>
```

**参数**:
- `agent`: 代理信息 (不包含自动生成的字段)

**示例**:
```typescript
const agent = await invoke('create_agent', {
    name: 'Git 提交助手',
    description: '帮助生成规范的 Git 提交信息',
    icon: '🔧',
    system_prompt: '你是一个 Git 提交信息生成助手...',
    default_task: '分析代码变更并生成提交信息',
    model: 'claude-3-sonnet-20240229',
    tags: ['git', 'automation'],
    is_favorite: false,
    is_builtin: false
});
```

### update_agent

更新代理信息。

```typescript
function update_agent(
    agent_id: string,
    updates: Partial<Agent>
): Promise<Agent>
```

### delete_agent

删除代理。

```typescript
function delete_agent(agent_id: string): Promise<void>
```

### run_agent

运行代理。

```typescript
function run_agent(
    agent_id: string,
    project_id: string,
    task: string,
    context?: Record<string, any>
): Promise<AgentRun>
```

**参数**:
- `agent_id`: 代理 ID
- `project_id`: 项目 ID
- `task`: 要执行的任务
- `context`: 上下文信息 (可选)

**返回值**: `AgentRun` - 运行记录

**示例**:
```typescript
const run = await invoke('run_agent', {
    agent_id: 'agent_123',
    project_id: 'proj_123',
    task: '分析当前代码变更并生成提交信息',
    context: {
        files_changed: ['src/main.ts', 'README.md'],
        branch: 'feature/new-api'
    }
});

console.log('运行状态:', run.status);
if (run.result) {
    console.log('运行结果:', run.result);
}
```

### get_agent_runs

获取代理运行历史。

```typescript
function get_agent_runs(
    agent_id?: string,
    project_id?: string,
    limit?: number
): Promise<AgentRun[]>
```

**参数**:
- `agent_id`: 代理 ID (可选)
- `project_id`: 项目 ID (可选)
- `limit`: 限制数量 (可选)

### get_agent_metrics

获取代理性能指标。

```typescript
function get_agent_metrics(agent_id: string): Promise<AgentRunMetrics>
```

### export_agents

导出代理配置。

```typescript
function export_agents(agent_ids: string[]): Promise<string>
```

**参数**:
- `agent_ids`: 要导出的代理 ID 列表

**返回值**: `string` - JSON 格式的代理配置

### import_agents

导入代理配置。

```typescript
function import_agents(config: string): Promise<Agent[]>
```

**参数**:
- `config`: JSON 格式的代理配置

**返回值**: `Agent[]` - 导入的代理列表

---

## 使用分析 API

### get_usage_stats

获取使用统计。

```typescript
function get_usage_stats(
    start_date?: string,
    end_date?: string,
    project_id?: string
): Promise<UsageStats>
```

**参数**:
- `start_date`: 开始日期 (YYYY-MM-DD, 可选)
- `end_date`: 结束日期 (YYYY-MM-DD, 可选)
- `project_id`: 项目 ID (可选)

**返回值**: `UsageStats` - 使用统计

**示例**:
```typescript
// 获取最近 30 天的使用统计
const stats = await invoke('get_usage_stats', {
    start_date: '2024-01-01',
    end_date: '2024-01-31'
});

console.log('总成本:', stats.total_cost);
console.log('总令牌数:', stats.total_tokens);
```

### get_usage_entries

获取使用记录。

```typescript
function get_usage_entries(
    project_id?: string,
    start_date?: string,
    end_date?: string,
    limit?: number
): Promise<UsageEntry[]>
```

### record_usage

记录使用情况。

```typescript
function record_usage(entry: Omit<UsageEntry, 'id' | 'timestamp'>): Promise<UsageEntry>
```

**参数**:
- `entry`: 使用记录 (不包含 ID 和时间戳)

**示例**:
```typescript
const entry = await invoke('record_usage', {
    project_id: 'proj_123',
    session_id: 'sess_456',
    model: 'claude-3-sonnet-20240229',
    input_tokens: 1000,
    output_tokens: 500,
    cost: 0.015,
    operation_type: 'chat'
});
```

---

## MCP 服务器管理 API

### get_mcp_servers

获取所有 MCP 服务器。

```typescript
function get_mcp_servers(): Promise<MCPServer[]>
```

### get_mcp_server

获取特定 MCP 服务器。

```typescript
function get_mcp_server(server_id: string): Promise<MCPServer | null>
```

### add_mcp_server

添加 MCP 服务器。

```typescript
function add_mcp_server(server: Omit<MCPServer, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<MCPServer>
```

**示例**:
```typescript
const server = await invoke('add_mcp_server', {
    name: 'File System Server',
    description: '文件系统操作服务器',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/path/to/workspace'],
    env: {
        'NODE_ENV': 'production'
    },
    config: {
        auto_start: true,
        restart_on_failure: true,
        max_restarts: 3,
        timeout: 30,
        log_level: 'info'
    }
});
```

### update_mcp_server

更新 MCP 服务器。

```typescript
function update_mcp_server(
    server_id: string,
    updates: Partial<MCPServer>
): Promise<MCPServer>
```

### remove_mcp_server

移除 MCP 服务器。

```typescript
function remove_mcp_server(server_id: string): Promise<void>
```

### start_mcp_server

启动 MCP 服务器。

```typescript
function start_mcp_server(server_id: string): Promise<void>
```

### stop_mcp_server

停止 MCP 服务器。

```typescript
function stop_mcp_server(server_id: string): Promise<void>
```

### restart_mcp_server

重启 MCP 服务器。

```typescript
function restart_mcp_server(server_id: string): Promise<void>
```

### get_mcp_server_status

获取 MCP 服务器状态。

```typescript
function get_mcp_server_status(server_id: string): Promise<ServerStatus>
```

---

## Claude 管理 API

### get_claude_settings

获取 Claude 设置。

```typescript
function get_claude_settings(): Promise<ClaudeSettings>
```

### update_claude_settings

更新 Claude 设置。

```typescript
function update_claude_settings(settings: Partial<ClaudeSettings>): Promise<ClaudeSettings>
```

**示例**:
```typescript
const settings = await invoke('update_claude_settings', {
    model: 'claude-3-opus-20240229',
    max_tokens: 4000,
    temperature: 0.7,
    system_prompt: '你是一个专业的编程助手...'
});
```

### check_claude_status

检查 Claude API 状态。

```typescript
function check_claude_status(): Promise<{
    is_available: boolean;
    api_key_valid: boolean;
    rate_limit_remaining?: number;
    error?: string;
}>
```

### get_available_models

获取可用的 Claude 模型。

```typescript
function get_available_models(): Promise<string[]>
```

---

## 文件系统 API

### read_file

读取文件内容。

```typescript
function read_file(file_path: string): Promise<string>
```

### write_file

写入文件内容。

```typescript
function write_file(file_path: string, content: string): Promise<void>
```

### list_directory

列出目录内容。

```typescript
function list_directory(dir_path: string): Promise<FileEntry[]>
```

```typescript
interface FileEntry {
    name: string;
    path: string;
    is_directory: boolean;
    size?: number;
    modified?: string;
}
```

### create_directory

创建目录。

```typescript
function create_directory(dir_path: string): Promise<void>
```

### delete_file

删除文件或目录。

```typescript
function delete_file(file_path: string): Promise<void>
```

### file_exists

检查文件是否存在。

```typescript
function file_exists(file_path: string): Promise<boolean>
```

---

## 错误处理

所有 API 调用都可能抛出错误。建议使用 try-catch 块来处理错误：

```typescript
try {
    const result = await invoke('some_command', { param: 'value' });
    // 处理成功结果
} catch (error) {
    console.error('API 调用失败:', error);
    // 处理错误
}
```

### 常见错误类型

- **ValidationError**: 参数验证失败
- **NotFoundError**: 资源不存在
- **PermissionError**: 权限不足
- **NetworkError**: 网络连接问题
- **ApiError**: Claude API 错误
- **FileSystemError**: 文件系统操作错误
- **DatabaseError**: 数据库操作错误

### 错误响应格式

```typescript
interface ApiError {
    code: string;          // 错误代码
    message: string;       // 错误消息
    details?: any;         // 错误详情
    timestamp: string;     // 错误时间
}
```

---

## 使用示例

### 完整的代理运行流程

```typescript
async function runAgentWorkflow() {
    try {
        // 1. 获取项目
        const projects = await invoke('get_projects');
        const project = projects[0];
        
        // 2. 获取代理
        const agents = await invoke('get_agents');
        const gitAgent = agents.find(a => a.name.includes('Git'));
        
        if (!gitAgent) {
            throw new Error('Git 代理未找到');
        }
        
        // 3. 运行代理
        const run = await invoke('run_agent', {
            agent_id: gitAgent.id,
            project_id: project.id,
            task: '分析当前代码变更并生成提交信息'
        });
        
        // 4. 等待完成
        let currentRun = run;
        while (currentRun.status === 'running' || currentRun.status === 'pending') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            currentRun = await invoke('get_agent_run', { run_id: run.id });
        }
        
        // 5. 处理结果
        if (currentRun.status === 'completed') {
            console.log('代理运行成功:', currentRun.result);
            
            // 6. 记录使用情况
            await invoke('record_usage', {
                project_id: project.id,
                agent_id: gitAgent.id,
                model: gitAgent.model,
                input_tokens: currentRun.input_tokens,
                output_tokens: currentRun.output_tokens,
                cost: currentRun.cost,
                operation_type: 'agent_run'
            });
        } else {
            console.error('代理运行失败:', currentRun.error);
        }
        
    } catch (error) {
        console.error('工作流程失败:', error);
    }
}
```

### 使用分析仪表板数据获取

```typescript
async function loadUsageDashboard() {
    try {
        // 获取最近 30 天的统计
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];
        
        const stats = await invoke('get_usage_stats', {
            start_date: startDate,
            end_date: endDate
        });
        
        // 显示总体统计
        console.log('总成本:', `$${stats.total_cost.toFixed(4)}`);
        console.log('总令牌数:', stats.total_tokens.toLocaleString());
        console.log('总请求数:', stats.total_requests.toLocaleString());
        
        // 显示模型使用分布
        console.log('\n模型使用分布:');
        stats.model_usage.forEach(model => {
            console.log(`${model.model}: ${model.percentage.toFixed(1)}% ($${model.total_cost.toFixed(4)})`);
        });
        
        // 显示每日趋势
        console.log('\n每日使用趋势:');
        stats.daily_usage.slice(-7).forEach(day => {
            console.log(`${day.date}: $${day.cost.toFixed(4)} (${day.requests} 请求)`);
        });
        
    } catch (error) {
        console.error('加载使用统计失败:', error);
    }
}
```

---

这份 API 参考文档提供了 Claudia 应用中所有可用 API 的详细说明。开发者可以根据这些接口来构建功能丰富的 Claude 代码助手应用。