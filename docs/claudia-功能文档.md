# Claudia - Claude Code UI 功能文档

## 目录

1. [项目概述](#项目概述)
2. [架构设计](#架构设计)
3. [核心功能模块](#核心功能模块)
4. [技术实现](#技术实现)
5. [API 接口](#api-接口)
6. [状态管理](#状态管理)
7. [用户界面](#用户界面)
8. [配置与部署](#配置与部署)

---

## 项目概述

Claudia 是一个基于 Tauri 框架开发的桌面应用程序，为 Claude Code 提供了现代化的图形用户界面。该应用采用 Rust + React + TypeScript 的技术栈，提供了项目管理、会话跟踪、代理系统、使用分析等全面功能。

### 主要特性

- **项目会话管理**: 管理 Claude Code 项目和会话
- **CC Agents 系统**: 创建、管理和执行自定义 AI 代理
- **使用分析仪表板**: 跟踪 API 使用情况和成本
- **MCP 服务器管理**: 管理 Model Context Protocol 服务器
- **时间线与检查点**: 项目历史记录和版本控制
- **CLAUDE.md 管理**: 项目文档管理
- **现代化 UI**: 基于 shadcn/ui 的响应式界面

### 技术栈

- **前端**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **后端**: Rust, Tauri 2.0
- **状态管理**: Zustand, React Context
- **构建工具**: Vite, Tauri CLI
- **数据库**: SQLite (通过 Tauri)
- **许可证**: AGPL-3.0

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Claudia Desktop App                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                             │
│  ├── Components (UI层)                                     │
│  ├── Contexts (状态管理)                                    │
│  ├── Stores (全局状态)                                      │
│  ├── Hooks (自定义钩子)                                     │
│  └── API Layer (接口层)                                     │
├─────────────────────────────────────────────────────────────┤
│  Backend (Rust + Tauri)                                    │
│  ├── Commands (API命令)                                     │
│  ├── Database (SQLite)                                     │
│  ├── File System (文件操作)                                 │
│  └── Process Management (进程管理)                          │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                     │
│  ├── Claude Code CLI                                       │
│  ├── MCP Servers                                           │
│  ├── GitHub API                                            │
│  └── File System                                           │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
claudia/
├── .github/                    # GitHub Actions 工作流
├── cc_agents/                   # 预定义 CC Agents
├── src-tauri/                   # Rust 后端代码
│   ├── src/
│   │   ├── commands/            # Tauri 命令模块
│   │   ├── checkpoint.rs        # 检查点功能
│   │   ├── claude_binary.rs     # Claude 二进制管理
│   │   ├── main.rs             # 主入口
│   │   └── lib.rs              # 库文件
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置
├── src/                        # React 前端代码
│   ├── components/             # UI 组件
│   ├── contexts/               # React Context
│   ├── hooks/                  # 自定义 Hooks
│   ├── lib/                    # 工具库
│   ├── stores/                 # Zustand 状态管理
│   ├── types/                  # TypeScript 类型定义
│   └── App.tsx                 # 主应用组件
├── package.json                # Node.js 依赖配置
└── README.md                   # 项目说明
```

---

## 核心功能模块

### 1. 项目会话管理

#### 功能描述
管理 Claude Code 项目和会话，提供项目浏览、会话查看、输出监控等功能。

#### 核心组件
- **ProjectsTab**: 项目列表和管理界面
- **SessionsView**: 会话列表和详情
- **SessionOutput**: 实时会话输出显示

#### 主要功能
- 扫描和列出 `~/.claude/projects` 目录下的所有项目
- 显示每个项目的会话列表
- 实时监控会话输出 (JSONL 格式)
- 会话搜索和过滤
- 项目统计信息

#### 技术实现
```typescript
// API 接口
export interface Project {
  id: string;
  path: string;
  sessions: string[];
  created_at: number;
}

export interface Session {
  id: string;
  project_id: string;
  project_path: string;
  todo_data?: any;
  created_at: number;
  first_message?: string;
  message_timestamp?: string;
}
```

### 2. CC Agents 系统

#### 功能描述
CC Agents 是 Claudia 的核心功能之一，允许用户创建、管理和执行自定义 AI 代理，用于自动化各种开发任务。

#### 核心组件
- **CCAgents.tsx**: 代理管理主界面
- **CreateAgent.tsx**: 代理创建和编辑表单
- **GitHubAgentBrowser.tsx**: GitHub 代理浏览器
- **AgentExecution**: 代理执行界面

#### 主要功能

##### 代理管理
- 创建自定义代理
- 编辑代理配置
- 删除代理
- 代理列表展示
- 代理搜索和过滤

##### 代理配置
- **名称和图标**: 代理标识
- **系统提示**: 代理行为指令
- **默认任务**: 预设任务模板
- **模型选择**: Claude 模型配置
- **Hooks 配置**: 执行钩子设置

##### 代理执行
- 选择项目路径
- 自定义任务描述
- 实时执行监控
- 输出日志查看
- 执行历史记录

##### 代理导入导出
- 导出代理配置为 `.claudia.json` 文件
- 从文件导入代理
- GitHub 代理库浏览
- 预定义代理模板

#### 预定义代理

##### Git Commit Bot
```json
{
  "version": 1,
  "exported_at": "2024-12-19T10:30:00Z",
  "agent": {
    "name": "Git Commit Bot",
    "icon": "🤖",
    "system_prompt": "You are a Git commit message generator...",
    "default_task": "Generate a commit message for the current changes",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

##### Security Scanner
```json
{
  "version": 1,
  "exported_at": "2024-12-19T10:30:00Z",
  "agent": {
    "name": "Security Scanner",
    "icon": "🔒",
    "system_prompt": "You are a security analysis expert...",
    "default_task": "Scan the codebase for security vulnerabilities",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

#### 技术实现

##### 数据结构
```typescript
export interface Agent {
  id?: number;
  name: string;
  icon: string;
  system_prompt: string;
  default_task?: string;
  model: string;
  hooks?: string; // JSON string of HooksConfiguration
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id?: number;
  agent_id: number;
  agent_name: string;
  agent_icon: string;
  task: string;
  model: string;
  project_path: string;
  session_id: string;
  status: string; // 'pending', 'running', 'completed', 'failed', 'cancelled'
  pid?: number;
  process_started_at?: string;
  created_at: string;
  completed_at?: string;
}
```

##### Rust 后端实现
```rust
// src-tauri/src/commands/agents.rs

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Agent {
    pub id: Option<i64>,
    pub name: String,
    pub icon: String,
    pub system_prompt: String,
    pub default_task: Option<String>,
    pub model: String,
    pub hooks: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn create_agent(
    name: String,
    icon: String,
    system_prompt: String,
    default_task: Option<String>,
    model: String,
    hooks: Option<String>,
) -> Result<Agent, String> {
    // 实现代理创建逻辑
}

#[tauri::command]
pub async fn execute_agent(
    agent_id: i64,
    task: String,
    project_path: String,
) -> Result<AgentRun, String> {
    // 实现代理执行逻辑
}
```

### 3. 使用分析仪表板

#### 功能描述
提供 Claude API 使用情况的详细分析和成本跟踪，帮助用户了解和优化 API 使用。

#### 核心组件
- **UsageDashboard.tsx**: 主仪表板界面
- **UsageCharts**: 使用情况图表
- **CostAnalysis**: 成本分析组件

#### 主要功能

##### 使用统计
- 总成本统计
- 令牌使用量统计
- 请求次数统计
- 会话数量统计

##### 时间范围过滤
- 全部时间
- 最近 7 天
- 最近 30 天
- 自定义时间范围

##### 分类统计
- 按模型分类
- 按项目分类
- 按日期分类
- 按会话分类

##### 成本计算
- Claude 4 Opus 定价
- Claude 4 Sonnet 定价
- 缓存令牌定价
- 实时成本更新

#### 技术实现

##### 数据结构
```typescript
export interface UsageEntry {
  project: string;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  cost: number;
}

export interface UsageStats {
  total_cost: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
  total_sessions: number;
  by_model: ModelUsage[];
  by_date: DailyUsage[];
  by_project: ProjectUsage[];
}
```

##### 成本计算逻辑
```rust
// Claude 4 定价常量 (每百万令牌)
const OPUS_4_INPUT_PRICE: f64 = 15.0;
const OPUS_4_OUTPUT_PRICE: f64 = 75.0;
const OPUS_4_CACHE_WRITE_PRICE: f64 = 18.75;
const OPUS_4_CACHE_READ_PRICE: f64 = 1.50;

const SONNET_4_INPUT_PRICE: f64 = 3.0;
const SONNET_4_OUTPUT_PRICE: f64 = 15.0;
const SONNET_4_CACHE_WRITE_PRICE: f64 = 3.75;
const SONNET_4_CACHE_READ_PRICE: f64 = 0.30;

fn calculate_cost(model: &str, usage: &UsageData) -> f64 {
    let input_tokens = usage.input_tokens.unwrap_or(0) as f64;
    let output_tokens = usage.output_tokens.unwrap_or(0) as f64;
    let cache_creation_tokens = usage.cache_creation_input_tokens.unwrap_or(0) as f64;
    let cache_read_tokens = usage.cache_read_input_tokens.unwrap_or(0) as f64;

    let (input_price, output_price, cache_write_price, cache_read_price) =
        if model.contains("opus-4") {
            (OPUS_4_INPUT_PRICE, OPUS_4_OUTPUT_PRICE, OPUS_4_CACHE_WRITE_PRICE, OPUS_4_CACHE_READ_PRICE)
        } else if model.contains("sonnet-4") {
            (SONNET_4_INPUT_PRICE, SONNET_4_OUTPUT_PRICE, SONNET_4_CACHE_WRITE_PRICE, SONNET_4_CACHE_READ_PRICE)
        } else {
            (0.0, 0.0, 0.0, 0.0)
        };

    (input_tokens * input_price / 1_000_000.0)
        + (output_tokens * output_price / 1_000_000.0)
        + (cache_creation_tokens * cache_write_price / 1_000_000.0)
        + (cache_read_tokens * cache_read_price / 1_000_000.0)
}
```

### 4. MCP 服务器管理

#### 功能描述
管理 Model Context Protocol (MCP) 服务器，提供服务器配置、状态监控、导入导出等功能。

#### 核心组件
- **MCPManager.tsx**: MCP 管理主界面
- **MCPServerList**: 服务器列表组件
- **MCPServerConfig**: 服务器配置组件

#### 主要功能

##### 服务器管理
- 添加新的 MCP 服务器
- 编辑服务器配置
- 删除服务器
- 服务器状态监控

##### 配置管理
- **传输类型**: stdio 或 sse
- **命令配置**: 执行命令和参数
- **环境变量**: 服务器环境配置
- **作用域**: local、project 或 user

##### 导入导出
- 导出服务器配置
- 从文件导入配置
- 批量配置管理

#### 技术实现

##### 数据结构
```typescript
export interface MCPServer {
  name: string;
  transport: string;
  command?: string;
  args: string[];
  env: Record<string, string>;
  url?: string;
  scope: string;
  is_active: boolean;
  status: ServerStatus;
}

export interface ServerStatus {
  running: boolean;
  error?: string;
  last_checked?: number;
}
```

##### Rust 后端实现
```rust
#[tauri::command]
pub async fn mcp_add(
    app: AppHandle,
    name: String,
    transport: String,
    command: Option<String>,
    args: Vec<String>,
    env: HashMap<String, String>,
    url: Option<String>,
    scope: String,
) -> Result<AddServerResult, String> {
    // 实现 MCP 服务器添加逻辑
}
```

---

## 技术实现

### 前端技术栈

#### React + TypeScript
- **React 18**: 现代化的用户界面框架
- **TypeScript**: 类型安全的 JavaScript 超集
- **Vite**: 快速的构建工具

#### UI 组件库
- **shadcn/ui**: 现代化的 React 组件库
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Lucide React**: 图标库
- **Framer Motion**: 动画库

#### 状态管理
- **Zustand**: 轻量级状态管理库
- **React Context**: 组件间状态共享
- **React Hooks**: 状态和副作用管理

### 后端技术栈

#### Rust + Tauri
- **Tauri 2.0**: 跨平台桌面应用框架
- **Rust**: 系统级编程语言
- **SQLite**: 嵌入式数据库

#### 核心依赖
```toml
[dependencies]
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1.0"
log = "0.4"
dirs = "5.0"
```

### 构建和部署

#### 开发环境
```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建应用
npm run tauri build
```

#### 生产构建
```bash
# 构建 macOS 应用
npm run build:mac

# 构建 Windows 应用
npm run build:windows

# 构建 Linux 应用
npm run build:linux
```

---

## API 接口

### Tauri Commands

Claudia 通过 Tauri Commands 实现前后端通信，所有 API 调用都通过 `invoke` 函数进行。

#### 项目管理 API

```typescript
// 列出所有项目
api.listProjects(): Promise<Project[]>

// 获取项目会话
api.getProjectSessions(projectId: string): Promise<Session[]>

// 获取会话输出
api.getClaudeSessionOutput(sessionId: string): Promise<string>

// 扫描 CLAUDE.md 文件
api.scanClaudeMdFiles(projectPath: string): Promise<ClaudeMdFile[]>
```

#### CC Agents API

```typescript
// 创建代理
api.createAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent>

// 获取所有代理
api.getAgents(): Promise<Agent[]>

// 更新代理
api.updateAgent(id: number, updates: Partial<Agent>): Promise<Agent>

// 删除代理
api.deleteAgent(id: number): Promise<void>

// 执行代理
api.executeAgent(agentId: number, task: string, projectPath: string): Promise<AgentRun>

// 获取代理运行记录
api.getAgentRuns(): Promise<AgentRunWithMetrics[]>

// 取消代理执行
api.cancelAgentRun(runId: number): Promise<void>
```

#### 使用分析 API

```typescript
// 获取使用统计
api.getUsageStats(timeRange?: string): Promise<UsageStats>

// 获取使用条目
api.getUsageEntries(filters?: UsageFilters): Promise<UsageEntry[]>
```

#### MCP 管理 API

```typescript
// 添加 MCP 服务器
api.mcpAdd(
  name: string,
  transport: string,
  command?: string,
  args: string[],
  env: Record<string, string>,
  url?: string,
  scope: string
): Promise<AddServerResult>

// 列出 MCP 服务器
api.mcpList(): Promise<MCPServer[]>

// 删除 MCP 服务器
api.mcpRemove(name: string, scope: string): Promise<void>
```

#### 系统 API

```typescript
// 获取 Claude 版本状态
api.getClaudeVersionStatus(): Promise<ClaudeVersionStatus>

// 查找 Claude 安装
api.findClaudeInstallations(): Promise<ClaudeInstallation[]>

// 设置 Claude 路径
api.setClaudePath(path: string): Promise<void>

// 获取/保存设置
api.getSetting(key: string): Promise<string | null>
api.saveSetting(key: string, value: string): Promise<void>
```

### 错误处理

所有 API 调用都包含错误处理机制：

```typescript
try {
  const result = await api.someOperation();
  // 处理成功结果
} catch (error) {
  console.error('操作失败:', error);
  // 显示错误消息给用户
}
```

---

## 状态管理

### 全局状态 (Zustand)

Claudia 使用 Zustand 进行全局状态管理，主要包含两个核心 store：

#### Session Store

```typescript
// src/stores/sessionStore.ts
interface SessionState {
  // 数据状态
  projects: Project[];
  sessions: Record<string, Session[]>;
  currentSessionId: string | null;
  currentSession: Session | null;
  sessionOutputs: Record<string, string>;
  
  // UI 状态
  isLoadingProjects: boolean;
  isLoadingSessions: boolean;
  isLoadingOutputs: boolean;
  error: string | null;
  
  // 操作方法
  fetchProjects: () => Promise<void>;
  fetchProjectSessions: (projectId: string) => Promise<void>;
  setCurrentSession: (sessionId: string | null) => void;
  fetchSessionOutput: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string, projectId: string) => Promise<void>;
  handleSessionUpdate: (session: Session) => void;
  handleOutputUpdate: (sessionId: string, output: string) => void;
}
```

#### Agent Store

```typescript
// src/stores/agentStore.ts
interface AgentState {
  // 数据状态
  agentRuns: AgentRunWithMetrics[];
  runningAgents: Set<string>;
  sessionOutputs: Record<string, string>;
  
  // UI 状态
  isLoadingRuns: boolean;
  isLoadingOutput: boolean;
  error: string | null;
  lastFetchTime: number;
  
  // 操作方法
  fetchAgentRuns: () => Promise<void>;
  executeAgent: (agentId: number, task: string, projectPath: string) => Promise<void>;
  cancelAgentRun: (runId: number) => Promise<void>;
  updateAgentRunOutput: (runId: number, output: string) => void;
}
```

### 组件状态 (React Context)

#### Tab Context

管理应用的标签页状态：

```typescript
// src/contexts/TabContext.tsx
export interface Tab {
  id: string;
  type: 'chat' | 'agent' | 'projects' | 'usage' | 'mcp' | 'settings' | 'claude-md' | 'claude-file' | 'agent-execution' | 'create-agent' | 'import-agent';
  title: string;
  sessionId?: string;
  sessionData?: any;
  agentRunId?: string;
  agentData?: any;
  claudeFileId?: string;
  initialProjectPath?: string;
  status: 'active' | 'idle' | 'running' | 'complete' | 'error';
  hasUnsavedChanges: boolean;
  order: number;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Omit<Tab, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => string;
  removeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  reorderTabs: (startIndex: number, endIndex: number) => void;
  getTabById: (id: string) => Tab | undefined;
  closeAllTabs: () => void;
  getTabsByType: (type: 'chat' | 'agent') => Tab[];
}
```

#### Theme Context

管理应用主题和自定义颜色：

```typescript
// src/contexts/ThemeContext.tsx
export type ThemeMode = 'dark' | 'gray' | 'light' | 'custom';

export interface CustomThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  customColors: CustomThemeColors;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setCustomColors: (colors: Partial<CustomThemeColors>) => Promise<void>;
  isLoading: boolean;
}
```

### 自定义 Hooks

#### useTabState

提供标签页操作的便捷接口：

```typescript
// src/hooks/useTabState.ts
export const useTabState = (): UseTabStateReturn => {
  const {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    updateTab,
    setActiveTab,
    getTabById,
    reorderTabs,
    closeAllTabs,
    getTabsByType
  } = useTabContext();

  // 计算属性
  const activeTab = useMemo(() => {
    return activeTabId ? getTabById(activeTabId) : undefined;
  }, [activeTabId, getTabById]);

  const tabCount = tabs.length;
  const chatTabCount = tabs.filter(tab => tab.type === 'chat').length;
  const agentTabCount = tabs.filter(tab => tab.type === 'agent').length;

  // 操作方法
  const openChatTab = useCallback((sessionId: string, sessionData?: any, projectPath?: string) => {
    // 实现聊天标签页打开逻辑
  }, [addTab]);

  const openAgentTab = useCallback((agentRunId: string, agentData?: any) => {
    // 实现代理标签页打开逻辑
  }, [addTab]);

  const closeTab = useCallback(async (id: string): Promise<boolean> => {
    // 实现标签页关闭逻辑
  }, [getTabById, removeTab]);

  return {
    // 状态
    tabs,
    activeTab,
    activeTabId,
    tabCount,
    chatTabCount,
    agentTabCount,
    
    // 操作
    addTab,
    removeTab,
    updateTab,
    setActiveTab,
    reorderTabs,
    getTabById,
    closeAllTabs,
    getTabsByType,
    openChatTab,
    openAgentTab,
    closeTab
  };
};
```

#### useLoadingState

管理异步操作的加载状态：

```typescript
// src/hooks/useLoadingState.ts
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    execute,
    reset
  };
};
```

#### useDebounce

防抖处理，优化搜索和输入性能：

```typescript
// src/hooks/useDebounce.ts
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay) as T,
    [delay]
  );
};
```

---

## 用户界面

### 设计系统

Claudia 采用现代化的设计系统，基于 shadcn/ui 组件库和 Tailwind CSS。

#### 主题系统

支持多种主题模式：
- **Dark**: 深色主题（默认）
- **Gray**: 灰色主题
- **Light**: 浅色主题
- **Custom**: 自定义主题

#### 颜色系统

```css
/* CSS 变量定义 */
:root {
  --background: oklch(0.12 0.01 240);
  --foreground: oklch(0.98 0.01 240);
  --card: oklch(0.14 0.01 240);
  --card-foreground: oklch(0.98 0.01 240);
  --primary: oklch(0.98 0.01 240);
  --primary-foreground: oklch(0.12 0.01 240);
  --secondary: oklch(0.16 0.01 240);
  --secondary-foreground: oklch(0.98 0.01 240);
  --muted: oklch(0.16 0.01 240);
  --muted-foreground: oklch(0.65 0.01 240);
  --accent: oklch(0.16 0.01 240);
  --accent-foreground: oklch(0.98 0.01 240);
  --destructive: oklch(0.6 0.2 25);
  --destructive-foreground: oklch(0.98 0.01 240);
  --border: oklch(0.16 0.01 240);
  --input: oklch(0.16 0.01 240);
  --ring: oklch(0.98 0.01 240);
}
```

### 核心组件

#### 标签页管理器

```typescript
// src/components/TabManager.tsx
export const TabManager: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, reorderTabs } = useTabState();
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      <Reorder.Group
        axis="x"
        values={tabs}
        onReorder={(newTabs) => {
          // 处理标签页重排序
        }}
        className="flex items-center gap-1"
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => setActiveTab(tab.id)}
            onClose={() => removeTab(tab.id)}
          />
        ))}
      </Reorder.Group>
    </div>
  );
};
```

#### 项目浏览器

```typescript
// src/components/ProjectsTab.tsx
export const ProjectsTab: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projectList = await api.listProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-border">
        <ProjectList
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          isLoading={isLoading}
        />
      </div>
      <div className="flex-1">
        {selectedProject ? (
          <SessionList
            project={selectedProject}
            sessions={sessions}
            onSessionSelect={handleSessionSelect}
          />
        ) : (
          <EmptyState message="选择一个项目查看会话" />
        )}
      </div>
    </div>
  );
};
```

#### 代理管理界面

```typescript
// src/components/CCAgents.tsx
export const CCAgents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = useMemo(() => {
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.system_prompt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agents, searchTerm]);

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">CC Agents</h2>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            创建代理
          </Button>
        </div>
        
        <div className="mb-4">
          <Input
            placeholder="搜索代理..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        <AgentList
          agents={filteredAgents}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
          onDeleteAgent={handleDeleteAgent}
        />
      </div>
      
      <div className="flex-1">
        {selectedAgent ? (
          <AgentDetails
            agent={selectedAgent}
            onExecute={handleExecuteAgent}
            onEdit={handleEditAgent}
          />
        ) : (
          <EmptyState message="选择一个代理查看详情" />
        )}
      </div>

      <CreateAgent
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateAgent}
      />
    </div>
  );
};
```

### 响应式设计

Claudia 采用响应式设计，适配不同屏幕尺寸：

```css
/* 响应式断点 */
@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
  
  .mobile-layout {
    flex-direction: column;
  }
}

@media (min-width: 1024px) {
  .sidebar {
    width: 300px;
  }
  
  .main-content {
    margin-left: 300px;
  }
}
```

### 动画和交互

使用 Framer Motion 提供流畅的动画效果：

```typescript
// 标签页切换动画
const tabVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

// 列表项动画
const listItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// 模态框动画
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};
```

---

## 配置与部署

### Tauri 配置

```json
// src-tauri/tauri.conf.json
{
  "productName": "Claudia",
  "version": "0.1.0",
  "identifier": "com.claudia.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Claudia",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "fs": {
      "scope": [
        "$HOME/.claude/**",
        "$HOME/Downloads/**",
        "**"
      ]
    },
    "shell": {
      "scope": [
        {
          "name": "claude",
          "cmd": "claude",
          "args": true
        },
        {
          "name": "node",
          "cmd": "node",
          "args": true
        }
      ]
    }
  }
}
```

### 构建脚本

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug"
  }
}
```

### 环境配置

#### 开发环境

```bash
# 环境变量
TAURI_DEV=true
RUST_LOG=debug
VITE_DEV_SERVER_URL=http://localhost:1420
```

#### 生产环境

```bash
# 构建优化
TAURI_BUNDLE_IDENTIFIER=com.claudia.app
TAURI_BUNDLE_VERSION=0.1.0
RUST_LOG=info
```

### 部署流程

#### GitHub Actions

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]
    
    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Tauri app
        run: npm run tauri:build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: app-${{ matrix.platform }}
          path: src-tauri/target/release/bundle/
```

#### 本地构建

```bash
# macOS
npm run tauri:build
# 输出: src-tauri/target/release/bundle/macos/Claudia.app

# Windows
npm run tauri:build
# 输出: src-tauri/target/release/bundle/msi/Claudia_0.1.0_x64_en-US.msi

# Linux
npm run tauri:build
# 输出: src-tauri/target/release/bundle/deb/claudia_0.1.0_amd64.deb
```

### 安装和分发

#### macOS
- **DMG**: 拖拽安装
- **App Store**: 通过 Apple Developer Program 分发
- **Homebrew**: 通过 Homebrew Cask 分发

#### Windows
- **MSI**: Windows Installer 包
- **NSIS**: 自定义安装程序
- **Microsoft Store**: 通过 Microsoft Store 分发

#### Linux
- **DEB**: Debian/Ubuntu 包管理
- **RPM**: Red Hat/Fedora 包管理
- **AppImage**: 便携式应用程序
- **Snap**: Ubuntu Snap 包

---

## 总结

Claudia 是一个功能完备的 Claude Code 桌面客户端，提供了：

1. **完整的项目管理**: 项目浏览、会话管理、实时输出监控
2. **强大的代理系统**: 自定义 AI 代理创建、执行和管理
3. **详细的使用分析**: API 使用统计、成本跟踪、性能分析
4. **MCP 服务器管理**: 完整的 MCP 生态系统集成
5. **现代化界面**: 响应式设计、主题系统、流畅动画
6. **跨平台支持**: macOS、Windows、Linux 全平台覆盖

该应用采用现代化的技术栈和最佳实践，提供了优秀的用户体验和开发者体验，是 Claude Code 用户的理想选择。