# Claude Code UI 架构文档

## 项目概述

Claude Code UI 是一个为 [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 提供 Web 界面的应用程序。它通过 WebSocket 和 REST API 与 Claude CLI 进行集成，为用户提供了一个现代化的、响应式的 Web 界面来管理 Claude Code 项目和会话。

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code UI                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   前端 (React)   │   后端 (Node.js) │    Claude CLI 集成          │
│                │                │                             │
│ • React 18     │ • Express.js    │ • 进程管理                   │
│ • Vite         │ • WebSocket     │ • 会话管理                   │
│ • Tailwind CSS │ • SQLite        │ • 项目管理                   │
│ • CodeMirror   │ • JWT 认证      │ • MCP 集成                  │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## 核心组件

### 1. 前端架构 (React + Vite)

#### 主要技术栈
- **React 18**: 现代化的组件架构和 Hooks
- **Vite**: 快速的构建工具和开发服务器
- **Tailwind CSS**: 实用优先的 CSS 框架
- **CodeMirror**: 高级代码编辑器
- **React Router**: 客户端路由

#### 核心组件结构
```
src/
├── components/
│   ├── App.jsx                 # 主应用组件
│   ├── MainContent.jsx         # 主内容区域
│   ├── ChatInterface.jsx       # Claude 聊天界面
│   ├── Sidebar.jsx            # 侧边栏 (项目/会话管理)
│   ├── FileTree.jsx           # 文件树浏览器
│   ├── CodeEditor.jsx         # 代码编辑器
│   ├── Shell.jsx              # 终端界面
│   ├── GitPanel.jsx           # Git 操作面板
│   └── ToolsSettings.jsx      # 工具设置
├── contexts/
│   ├── ThemeContext.js        # 主题上下文
│   └── AuthContext.js         # 认证上下文
├── utils/
│   ├── api.js                 # API 调用封装
│   └── websocket.js           # WebSocket 连接管理
└── hooks/
    └── useVersionCheck.js     # 版本检查钩子
```

#### 状态管理
- 使用 React Context 进行全局状态管理
- 本地状态使用 useState 和 useEffect
- WebSocket 消息通过自定义 Hook 管理

### 2. 后端架构 (Node.js + Express)

#### 主要技术栈
- **Express.js**: Web 框架
- **WebSocket (ws)**: 实时通信
- **SQLite + better-sqlite3**: 轻量级数据库
- **JWT**: 身份认证
- **bcrypt**: 密码加密
- **node-pty**: 终端模拟

#### 服务器结构
```
server/
├── index.js                   # 主服务器文件
├── claude-cli.js             # Claude CLI 集成
├── projects.js               # 项目管理
├── middleware/
│   └── auth.js               # 认证中间件
├── routes/
│   ├── auth.js               # 认证路由
│   ├── git.js                # Git 操作路由
│   └── mcp.js                # MCP 服务器管理
└── database/
    ├── db.js                 # 数据库连接和操作
    └── init.sql              # 数据库初始化脚本
```

## 核心功能模块

### 1. Claude CLI 集成

#### 进程管理
- **文件**: `server/claude-cli.js`
- **功能**: 
  - 启动 Claude CLI 进程
  - 管理会话生命周期
  - 处理命令输入和输出
  - 支持会话恢复

#### 关键实现
```javascript
// 启动 Claude CLI 进程
async function spawnClaude(command, options = {}, ws) {
  const args = [];
  
  // 构建命令参数
  if (command && command.trim()) {
    args.push('--print', command);
  }
  
  // 添加基本标志
  args.push('--output-format', 'stream-json', '--verbose');
  
  // 启动进程
  const claudeProcess = spawn('claude', args, {
    cwd: workingDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  
  // 处理输出流
  claudeProcess.stdout.on('data', (data) => {
    // 解析 JSON 流并发送到前端
  });
}
```

### 2. 项目管理系统

#### 项目发现和管理
- **文件**: `server/projects.js`
- **功能**:
  - 自动发现 `~/.claude/projects/` 中的项目
  - 支持手动添加项目
  - 项目重命名和删除
  - 会话管理

#### 项目结构
```javascript
const project = {
  name: projectName,              // 项目内部名称
  path: actualProjectDir,         // 项目路径
  displayName: displayName,       // 显示名称
  fullPath: actualProjectDir,     // 完整路径
  isCustomName: !!projectConfig.displayName,
  isManuallyAdded: true,
  sessions: []                    // 会话列表
};
```

### 3. 会话管理

#### JSONL 解析
- Claude CLI 使用 JSONL 格式存储会话
- 解析会话消息和元数据
- 支持会话恢复和历史记录

#### 会话数据结构
```javascript
const session = {
  id: sessionId,
  timestamp: timestamp,
  messageCount: messageCount,
  lastMessage: lastMessage,
  isActive: isActive
};
```

### 4. WebSocket 通信

#### 双向通信架构
- **聊天 WebSocket** (`/ws`): Claude 对话
- **终端 WebSocket** (`/shell`): 终端操作

#### 消息类型
```javascript
// 发送 Claude 命令
{
  type: 'claude-command',
  command: userInput,
  options: {
    projectPath: selectedProject.path,
    sessionId: currentSessionId,
    resume: !!currentSessionId,
    toolsSettings: toolsSettings
  }
}

// 接收 Claude 响应
{
  type: 'claude-output',
  data: responseData,
  sessionId: sessionId
}
```

### 5. 认证系统

#### JWT 认证
- **文件**: `server/middleware/auth.js`
- **功能**:
  - 用户注册和登录
  - JWT 令牌生成和验证
  - WebSocket 认证
  - 可选的 API 密钥验证

#### 认证流程
1. 用户注册/登录
2. 服务器生成 JWT 令牌
3. 前端存储令牌并在请求中携带
4. 服务器验证令牌有效性

### 6. 文件系统操作

#### 文件管理 API
- 文件树浏览
- 文件读取和保存
- 目录操作
- 文件搜索

#### API 端点
```javascript
// 获取文件树
GET /api/projects/:projectName/files

// 读取文件
GET /api/projects/:projectName/file?filePath=...

// 保存文件
PUT /api/projects/:projectName/file
```

### 7. Git 集成

#### Git 操作
- **文件**: `server/routes/git.js`
- **功能**:
  - 查看仓库状态
  - 文件暂存和提交
  - 分支管理
  - 提交历史
  - AI 生成提交消息

### 8. MCP (Model Context Protocol) 集成

#### MCP 服务器管理
- **文件**: `server/routes/mcp.js`
- **功能**:
  - 列出已配置的 MCP 服务器
  - 添加新的 MCP 服务器
  - 删除 MCP 服务器
  - 支持 stdio、HTTP、SSE 传输

## 数据流

### 1. 用户交互流程
```
用户输入 → React 组件 → WebSocket → 后端 → Claude CLI → 响应 → WebSocket → React 组件 → UI 更新
```

### 2. 项目加载流程
```
页面加载 → API 请求 → 项目扫描 → 会话解析 → 数据返回 → UI 渲染
```

### 3. 文件操作流程
```
文件选择 → API 请求 → 文件系统操作 → 响应 → 编辑器更新
```

## 配置和环境

### 环境变量
```bash
# 服务器配置
PORT=3002                    # 后端服务器端口
VITE_PORT=3001              # 前端开发服务器端口

# 认证配置
JWT_SECRET=your-secret-key   # JWT 密钥
API_KEY=optional-api-key     # 可选的 API 密钥

# 数据库配置
DB_PATH=./server/database/auth.db  # SQLite 数据库路径
```

### 依赖要求
- Node.js v20+
- Claude Code CLI (已安装并配置)
- Git (用于 Git 集成功能)

## 部署架构

### 开发模式
```bash
npm run dev  # 同时启动前端和后端
```

### 生产模式
```bash
npm run build  # 构建前端
npm run start  # 启动生产服务器
```

### 文件结构
```
claudecodeui/
├── dist/                    # 构建输出
├── public/                  # 静态资源
├── src/                     # 前端源码
├── server/                  # 后端源码
├── package.json            # 项目配置
├── vite.config.js          # Vite 配置
└── .env                    # 环境变量
```

## 安全考虑

1. **认证**: JWT 令牌认证，支持可选的 API 密钥
2. **授权**: 基于用户的访问控制
3. **输入验证**: 所有用户输入都经过验证
4. **文件访问**: 限制在项目目录内的文件操作
5. **进程隔离**: Claude CLI 进程独立运行

## 扩展性

1. **模块化设计**: 各功能模块独立，易于扩展
2. **插件架构**: 支持 MCP 服务器扩展
3. **主题系统**: 支持自定义主题
4. **多语言**: 架构支持国际化扩展

这个架构文档详细描述了 Claude Code UI 如何与 Claude Code CLI 集成，提供了一个完整的 Web 界面来管理 AI 辅助编程工作流程。
