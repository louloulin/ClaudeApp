# 基于Claude Code UI和Devbox的多Claude多租户平台技术方案

## 1. 项目概述

### 1.1 项目目标
基于现有的Claude Code UI项目，构建一个支持多Claude实例和多租户的云平台，集成Devbox技术实现环境隔离，支持手机端控制，为AI编程提供安全、隔离、可扩展的多用户开发环境。

### 1.2 核心特性
- **多Claude实例管理**：支持同时运行多个Claude CLI实例，每个用户独立隔离
- **多租户架构**：基于现有认证系统扩展，支持多用户并发使用
- **环境完全隔离**：基于Nix和Devbox实现用户间进程、文件系统、网络的完全隔离
- **移动端支持**：响应式设计，支持手机端控制和操作
- **全命令支持**：支持任意命令行工具和编程语言环境
- **快速环境创建**：声明式配置，秒级环境启动
- **状态持久化**：支持环境状态保存和恢复
- **AI友好集成**：与Claude Code深度集成，提供MCP服务器支持

## 2. 现有架构分析与技术调研

### 2.1 现有Claude Code UI架构
- **前端架构**：React 18 + Vite + Tailwind CSS，支持响应式设计
- **后端架构**：Node.js + Express + WebSocket，已支持JWT认证
- **数据库**：SQLite + better-sqlite3，轻量级用户管理
- **Claude集成**：通过spawn管理Claude CLI进程，支持会话管理
- **项目管理**：自动发现和管理Claude项目，支持文件树浏览
- **实时通信**：WebSocket支持实时聊天和终端操作

### 2.2 Claude Code技术特点
- **MCP架构**：基于Model Context Protocol，支持插件化扩展
- **容器化支持**：内置开发容器配置，支持安全沙盒环境
- **直接API连接**：无需额外服务器，直接与Anthropic API通信
- **代码执行沙盒**：专为Python代码执行设计的安全容器化环境
- **会话管理**：JSONL格式存储会话历史，支持会话恢复

### 2.3 Devbox技术优势
- **基于Nix**：利用Nix包管理器的函数式特性，确保环境可复现
- **轻量级隔离**：无需虚拟机或容器，基于shell环境实现隔离
- **声明式配置**：通过devbox.json定义环境，版本控制友好
- **跨平台支持**：支持Linux、macOS、Windows（WSL）
- **400+软件包**：支持超过400,000个软件包

### 2.4 多租户技术要求
- **用户隔离**：每个用户独立的工作空间和环境
- **资源管理**：CPU、内存、存储资源的合理分配和限制
- **安全隔离**：防止用户间的数据泄露和恶意攻击
- **移动端适配**：响应式UI设计，支持触摸操作和小屏幕显示

## 3. 多租户系统架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        多租户Web界面层 (Mobile-First)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  React UI  │  Mobile Responsive  │  PWA Support  │  Touch Optimized      │
├─────────────────────────────────────────────────────────────────────────────┤
│                        多用户管理层                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  User Auth  │  Session Manager  │  Resource Quota  │  Permission Control   │
├─────────────────────────────────────────────────────────────────────────────┤
│                        Claude实例管理层                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Claude Pool │  Instance Router │  Load Balancer │  Health Monitor       │
├─────────────────────────────────────────────────────────────────────────────┤
│                        Devbox环境隔离层                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  User1-Env1  │  User1-Env2  │  User2-Env1  │  User2-Env2  │  UserN-EnvN  │
├─────────────────────────────────────────────────────────────────────────────┤
│                        系统资源层                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  File System │  Network      │  Process      │  Resource Control         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 核心组件扩展

#### 3.2.1 多用户管理层 (基于现有认证系统扩展)
- **用户认证扩展**：支持多用户注册和登录
- **会话管理器**：管理用户会话和Claude实例绑定
- **资源配额管理**：为每个用户分配CPU、内存、存储配额
- **权限控制**：细粒度的功能权限管理

#### 3.2.2 Claude实例管理层 (新增)
- **Claude进程池**：管理多个Claude CLI实例
- **实例路由器**：将用户请求路由到对应的Claude实例
- **负载均衡器**：智能分配Claude实例，避免资源冲突
- **健康监控**：监控Claude实例状态，自动重启故障实例

#### 3.2.3 Devbox环境隔离层 (新增)
- **用户环境隔离**：每个用户独立的Devbox环境
- **环境模板管理**：预定义的开发环境模板
- **动态环境创建**：按需创建和销毁用户环境
- **环境状态同步**：环境状态的持久化和恢复

#### 3.2.4 移动端适配层 (新增)
- **响应式UI组件**：适配手机屏幕的UI组件
- **触摸优化**：针对触摸操作优化的交互设计
- **PWA支持**：支持离线使用和应用安装
- **手势控制**：支持滑动、缩放等手势操作

### 3.3 技术选型

| 组件 | 技术选择 | 理由 |
|------|----------|------|
| 前端框架 | React 18 + Vite | 现有技术栈，支持响应式设计 |
| 后端框架 | Node.js + Express | 现有技术栈，成熟稳定 |
| 数据库 | SQLite + better-sqlite3 | 轻量级，适合多租户场景 |
| 认证系统 | JWT + bcrypt | 现有实现，安全可靠 |
| 实时通信 | WebSocket | 现有实现，支持多用户 |
| 环境隔离 | Devbox + Nix | 轻量级、可复现、声明式 |
| 包管理 | Nix包管理器 | 函数式、无冲突、版本精确 |
| 配置管理 | devbox.json | 简单、版本控制友好 |
| AI集成 | MCP协议 | Claude Code原生支持 |
| 命令执行 | Nix shell | 安全、隔离、高性能 |
| 移动端 | PWA + 响应式设计 | 跨平台，原生体验 |

## 4. 实施计划

### 4.1 开发阶段

#### 阶段一：多用户认证系统扩展（1-2周）
- **目标**：基于现有认证系统扩展多租户支持
- **任务**：
  - 扩展用户数据模型，支持多用户注册
  - 增强JWT认证系统，支持用户角色和权限
  - 实现用户资源配额管理
  - 开发用户管理界面

#### 阶段二：Claude实例池管理（2-3周）
- **目标**：实现多Claude实例的管理和路由
- **任务**：
  - 重构Claude CLI集成代码，支持多实例
  - 开发Claude实例池管理系统
  - 实现用户请求到Claude实例的智能路由
  - 开发Claude实例健康监控和自动恢复

#### 阶段三：Devbox环境隔离（2-3周）
- **目标**：为每个用户提供隔离的Devbox环境
- **任务**：
  - 集成Devbox环境管理
  - 实现用户工作空间隔离
  - 开发环境模板系统
  - 实现环境状态持久化

#### 阶段四：移动端支持（2-3周）
- **目标**：优化移动端用户体验
- **任务**：
  - 重构前端UI为响应式设计
  - 优化触摸交互体验
  - 实现PWA支持
  - 开发移动端特有功能（如手势控制）

#### 阶段五：集成测试和优化（2-3周）
- **目标**：确保系统稳定性和性能
- **任务**：
  - 多用户并发测试
  - 性能优化和资源使用监控
  - 安全性测试和漏洞修复
  - 文档编写和部署指南

### 4.2 技术实现路径

#### 4.2.1 多用户认证扩展
```javascript
// 扩展用户数据模型
const userSchema = {
  id: 'INTEGER PRIMARY KEY',
  username: 'TEXT UNIQUE',
  email: 'TEXT UNIQUE',
  password_hash: 'TEXT',
  role: 'TEXT DEFAULT "user"', // user, admin
  quota_cpu: 'INTEGER DEFAULT 2',
  quota_memory: 'INTEGER DEFAULT 4096',
  quota_storage: 'INTEGER DEFAULT 10240',
  created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  last_login: 'DATETIME',
  is_active: 'BOOLEAN DEFAULT 1'
};

// Claude实例路由
const claudeInstanceRouter = {
  getUserInstance: (userId) => {
    return claudeInstances.get(userId) || createNewInstance(userId);
  },
  routeCommand: (userId, command, options) => {
    const instance = getUserInstance(userId);
    return instance.execute(command, options);
  }
};
```

#### 4.2.2 Devbox环境管理
```bash
# 用户环境创建
devbox-multi create --user user1 --name python-env --template python
devbox-multi create --user user2 --name nodejs-env --template nodejs

# 用户环境隔离
devbox-multi exec --user user1 --env python-env "python script.py"
devbox-multi exec --user user2 --env nodejs-env "npm start"

# 环境管理
devbox-multi list --user user1
devbox-multi status --user user1 --env python-env
devbox-multi destroy --user user1 --env python-env
```

#### 4.2.3 移动端API接口
```json
{
  "mobile_api": [
    {
      "name": "get_user_dashboard",
      "description": "获取用户仪表板信息",
      "response": {
        "active_sessions": "number",
        "resource_usage": "object",
        "recent_projects": "array"
      }
    },
    {
      "name": "quick_command",
      "description": "快速执行命令（移动端优化）",
      "parameters": {
        "command": "string",
        "environment": "string",
        "touch_optimized": "boolean"
      }
    }
  ]
}
```

### 4.3 关键里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| 多用户认证 | 第2周 | 支持多用户注册登录的认证系统 |
| Claude实例池 | 第5周 | 多Claude实例管理和路由系统 |
| 环境隔离 | 第8周 | 基于Devbox的用户环境隔离 |
| 移动端支持 | 第11周 | 响应式设计和PWA支持 |
| 正式发布 | 第14周 | 完整的多租户Claude Code平台 |

## 5. 技术挑战与解决方案

### 5.1 主要挑战
1. **多用户并发**：多个用户同时使用Claude实例的资源竞争
2. **环境隔离程度**：如何在不使用容器的情况下实现用户间完全隔离
3. **移动端性能**：在移动设备上运行复杂开发环境的性能挑战
4. **资源管理**：多租户环境下的资源分配和限制
5. **数据安全**：用户间数据隔离和隐私保护
6. **Claude实例管理**：多个Claude CLI进程的生命周期管理

### 5.2 解决方案
1. **Claude实例池**：预创建Claude实例池，动态分配给用户，避免冷启动
2. **多层隔离策略**：结合Nix shell、进程命名空间、文件系统隔离
3. **移动端优化**：
   - 渐进式加载，优先加载核心功能
   - 本地缓存常用数据，减少网络请求
   - 触摸友好的UI组件设计
4. **资源配额系统**：为每个用户设置CPU、内存、存储配额
5. **数据加密和隔离**：
   - 用户数据加密存储
   - 基于用户ID的文件系统隔离
   - 会话级别的数据隔离
6. **智能负载均衡**：根据用户活跃度和资源使用情况动态分配Claude实例

## 6. 预期效果

### 6.1 用户体验提升
- **多设备访问**：支持桌面端和移动端无缝切换使用
- **零配置启动**：一键创建完整开发环境，支持多用户并发
- **环境一致性**：每个用户独立的开发环境，完全隔离
- **快速切换**：秒级环境切换，支持多环境并行工作
- **AI增强**：每个用户独享Claude实例，无干扰的AI辅助开发
- **移动端优化**：触摸友好的界面，支持手机上的代码编辑和调试

### 6.2 技术优势
- **多租户支持**：单一部署支持多个用户，降低运维成本
- **轻量级隔离**：相比Docker容器，资源占用更少，启动更快
- **可复现性**：基于Nix的函数式特性，环境完全可复现
- **安全性**：多层隔离机制，确保用户间数据安全
- **扩展性**：模块化设计，易于扩展新功能和支持更多用户
- **移动友好**：PWA支持，可安装到手机桌面，提供原生应用体验

### 6.3 商业价值
- **SaaS模式**：可作为云服务提供，支持订阅制收费
- **降低门槛**：用户无需本地安装Claude CLI，降低使用门槛
- **提高效率**：多用户协作，团队开发效率提升
- **移动办公**：支持移动端操作，随时随地进行AI辅助开发

## 7. 风险评估

### 7.1 技术风险
- **多用户并发风险**：大量用户同时使用可能导致系统性能下降
- **Nix学习曲线**：团队需要学习Nix相关技术
- **移动端兼容性**：不同移动设备和浏览器的兼容性问题
- **Claude API限制**：Anthropic API的调用频率和并发限制
- **数据安全风险**：多租户环境下的数据泄露风险

### 7.2 缓解措施
- **性能监控**：实时监控系统性能，设置告警机制
- **技术培训**：提供Nix和Devbox技术培训
- **渐进式发布**：先支持主流移动浏览器，逐步扩展兼容性
- **API管理**：实现API调用频率限制和负载均衡
- **安全审计**：定期进行安全审计和渗透测试
- **备选方案**：准备Docker容器化备选方案

## 8. 总结

本方案基于现有的Claude Code UI项目，通过集成Devbox技术和扩展多租户支持，设计了一个支持多Claude实例和移动端控制的云平台。该方案充分利用现有技术栈的优势，通过渐进式改造实现多用户、多环境的隔离和管理。

### 8.1 核心优势
1. **基于现有代码**：充分利用现有的Claude Code UI架构，降低开发风险
2. **多租户支持**：单一部署支持多个用户，提高资源利用率
3. **移动端友好**：支持手机端操作，随时随地进行AI辅助开发
4. **轻量级隔离**：基于Devbox的环境隔离，无需虚拟机或容器开销
5. **完全可复现**：基于Nix的声明式配置，环境完全可复现
6. **AI增强**：每个用户独享Claude实例，提供无干扰的AI编程体验

### 8.2 创新点
1. **多Claude实例管理**：首个支持多Claude实例并发的Web平台
2. **移动端AI编程**：支持在手机上进行AI辅助编程的创新体验
3. **云原生架构**：可部署为SaaS服务，支持订阅制商业模式
4. **环境即服务**：为用户提供即开即用的隔离开发环境

通过14周的开发计划，我们将基于现有的Claude Code UI项目，实现一个功能完整、支持多租户的Claude Code云平台，为AI编程时代的协作开发提供新的解决方案。

## 9. 实施进度和验证结果

### 9.1 阶段一完成情况 ✅

**已完成的功能：**

#### 9.1.1 多用户认证系统扩展 ✅
- ✅ **数据库模型扩展**：成功扩展用户表，添加email、role、quota_cpu、quota_memory、quota_storage、quota_claude_instances字段
- ✅ **数据库迁移系统**：创建了完整的数据库迁移机制，支持平滑升级
- ✅ **多用户注册**：移除单用户限制，支持多用户注册，第一个用户自动成为管理员
- ✅ **角色管理**：支持user、admin、moderator三种角色
- ✅ **资源配额管理**：为每个用户设置CPU、内存、存储和Claude实例配额

#### 9.1.2 认证中间件增强 ✅
- ✅ **资源配额检查**：在认证时自动检查用户资源使用情况
- ✅ **配额超限保护**：提供checkClaudeInstanceQuota、checkResourceQuotas等中间件
- ✅ **管理员权限控制**：requireAdmin中间件确保管理功能安全

#### 9.1.3 用户管理API ✅
- ✅ **用户仪表板API**：/api/auth/dashboard 提供用户资源使用概览
- ✅ **管理员用户列表**：/api/auth/users 获取所有用户信息
- ✅ **配额管理**：/api/auth/users/:id/quotas 更新用户配额
- ✅ **角色管理**：/api/auth/users/:id/role 更新用户角色

#### 9.1.4 资源监控系统 ✅
- ✅ **实时资源监控**：ResourceMonitor类实时跟踪CPU、内存、存储使用
- ✅ **进程注册机制**：Claude进程启动时自动注册到资源监控
- ✅ **用户工作空间隔离**：每个用户独立的工作空间目录
- ✅ **配额违规检测**：自动检测和报告配额超限情况

#### 9.1.5 前端用户界面 ✅
- ✅ **用户仪表板组件**：UserDashboard.jsx 显示资源使用情况
- ✅ **管理员界面**：AdminUserManagement.jsx 管理所有用户
- ✅ **注册表单**：RegisterForm.jsx 支持新用户注册
- ✅ **登录表单增强**：支持用户名/邮箱登录，注册入口

**验证测试结果：**
- ✅ 数据库迁移成功，现有数据完整保留
- ✅ 多用户注册功能正常，支持邮箱验证
- ✅ 用户登录功能正常，返回完整用户信息和配额
- ✅ 管理员API正常，可以查看和管理所有用户
- ✅ 配额更新功能正常，实时生效
- ✅ 资源监控系统启动正常，定期更新用户资源使用情况

### 9.2 阶段二完成情况 ✅

**已完成的功能：**

#### 9.2.1 Claude实例池管理系统 ✅
- ✅ **ClaudeInstancePool类**：创建了完整的Claude实例池管理器，支持多用户并发
- ✅ **用户工作空间隔离**：每个用户独立的工作空间目录，完全隔离文件系统
- ✅ **实例生命周期管理**：支持实例创建、复用、销毁和健康监控
- ✅ **资源配额检查**：集成用户配额系统，防止超限使用
- ✅ **健康监控系统**：定期检查实例健康状态，自动清理不健康实例

#### 9.2.2 Claude CLI集成重构 ✅
- ✅ **多用户支持**：修改spawnClaude函数支持userId参数
- ✅ **用户工作空间路由**：Claude进程在用户专属工作空间中运行
- ✅ **资源监控集成**：Claude进程自动注册到资源监控系统
- ✅ **进程管理优化**：改进进程生命周期管理和清理机制

#### 9.2.3 WebSocket多用户路由 ✅
- ✅ **用户认证集成**：WebSocket连接验证用户身份
- ✅ **请求路由**：根据用户ID路由到对应的Claude实例
- ✅ **会话隔离**：每个用户的会话完全独立
- ✅ **错误处理**：用户级别的错误处理和日志记录

#### 9.2.4 服务器初始化优化 ✅
- ✅ **实例池初始化**：服务器启动时自动初始化Claude实例池
- ✅ **优雅关闭**：支持实例池的优雅关闭和资源清理
- ✅ **环境配置**：支持用户工作空间目录的环境变量配置

**验证测试结果：**
- ✅ 15个测试用例全部通过，覆盖实例创建、工作空间管理、统计信息、进程管理、健康监控、实例清理、配额执行等功能
- ✅ 多用户并发测试正常，不同用户的实例完全隔离
- ✅ 资源配额系统正常工作，超限时正确拒绝创建实例
- ✅ 健康监控系统正常运行，能够检测和清理不健康实例
- ✅ 用户工作空间创建和管理功能正常
- ✅ 进程注册和注销功能正常，与资源监控系统集成良好

## 10. 基于现有代码的具体改造方案

### 9.1 后端改造 (server/)

#### 9.1.1 认证系统扩展 (server/middleware/auth.js, server/routes/auth.js)
```javascript
// 扩展用户数据模型
// 修改 server/database/init.sql
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN quota_cpu INTEGER DEFAULT 2;
ALTER TABLE users ADD COLUMN quota_memory INTEGER DEFAULT 4096;
ALTER TABLE users ADD COLUMN quota_storage INTEGER DEFAULT 10240;

// 扩展认证中间件支持多用户
// 修改 server/middleware/auth.js
const authenticateToken = async (req, res, next) => {
  // 现有逻辑保持不变，增加用户配额检查
  const user = userDb.getUserById(decoded.userId);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid token. User not found.' });
  }

  // 新增：检查用户资源配额
  const usage = await getUserResourceUsage(user.id);
  req.user = { ...user, resourceUsage: usage };
  next();
};
```

#### 9.1.2 Claude实例管理 (新增 server/claude-pool.js)
```javascript
// 新增文件：server/claude-pool.js
class ClaudeInstancePool {
  constructor() {
    this.instances = new Map(); // userId -> claudeInstance
    this.maxInstancesPerUser = 3;
  }

  async getOrCreateInstance(userId) {
    if (!this.instances.has(userId)) {
      const instance = await this.createUserInstance(userId);
      this.instances.set(userId, instance);
    }
    return this.instances.get(userId);
  }

  async createUserInstance(userId) {
    // 基于现有的 spawnClaude 函数创建用户专属实例
    const userWorkspace = path.join(process.env.USER_WORKSPACES_DIR, userId.toString());
    await fs.ensureDir(userWorkspace);

    return {
      userId,
      workspace: userWorkspace,
      activeProcesses: new Map(),
      resourceUsage: { cpu: 0, memory: 0, storage: 0 }
    };
  }
}
```

#### 9.1.3 WebSocket路由扩展 (修改 server/index.js)
```javascript
// 修改现有的 handleChatConnection 函数
function handleChatConnection(ws, request) {
  const user = request.user; // 从认证中间件获取用户信息

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'claude-command') {
        // 获取用户专属的Claude实例
        const userInstance = await claudePool.getOrCreateInstance(user.id);

        // 在用户工作空间中执行命令
        const options = {
          ...data.options,
          projectPath: path.join(userInstance.workspace, data.options.projectPath || ''),
          userId: user.id
        };

        await spawnClaude(data.command, options, ws);
      }
    } catch (error) {
      console.error('❌ Chat WebSocket error:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });
}
```

### 9.2 前端改造 (src/)

#### 9.2.1 响应式UI组件 (修改 src/components/)
```javascript
// 修改 src/components/App.jsx
import { useState, useEffect } from 'react';
import { useMediaQuery } from './hooks/useMediaQuery';

function App() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <div className={`app ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* 移动端适配的布局 */}
      {isMobile ? (
        <MobileLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
}
```

#### 9.2.2 移动端组件 (新增 src/components/mobile/)
```javascript
// 新增文件：src/components/mobile/MobileLayout.jsx
function MobileLayout({ sidebarOpen, setSidebarOpen }) {
  return (
    <div className="mobile-layout">
      <MobileHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileMainContent />
      <MobileBottomBar />
    </div>
  );
}

// 新增文件：src/components/mobile/TouchOptimizedEditor.jsx
function TouchOptimizedEditor({ code, onChange }) {
  return (
    <div className="touch-editor">
      <div className="editor-toolbar">
        <button className="toolbar-btn">Undo</button>
        <button className="toolbar-btn">Redo</button>
        <button className="toolbar-btn">Format</button>
      </div>
      <CodeMirror
        value={code}
        onChange={onChange}
        extensions={[
          // 移动端优化的扩展
          touchOptimizedExtension(),
          mobileKeyboardExtension()
        ]}
      />
    </div>
  );
}
```

### 9.3 Devbox集成 (新增 server/devbox/)

#### 9.3.1 Devbox管理器 (新增 server/devbox/manager.js)
```javascript
// 新增文件：server/devbox/manager.js
class DevboxManager {
  constructor() {
    this.userEnvironments = new Map(); // userId -> environments[]
  }

  async createUserEnvironment(userId, template = 'default') {
    const envId = `user-${userId}-${Date.now()}`;
    const envPath = path.join(process.env.DEVBOX_ENVS_DIR, envId);

    // 创建devbox环境
    await this.executeDevboxCommand([
      'init',
      '--template', template,
      '--path', envPath
    ]);

    const environment = {
      id: envId,
      userId,
      template,
      path: envPath,
      status: 'active',
      createdAt: new Date()
    };

    if (!this.userEnvironments.has(userId)) {
      this.userEnvironments.set(userId, []);
    }
    this.userEnvironments.get(userId).push(environment);

    return environment;
  }

  async executeInEnvironment(userId, envId, command) {
    const env = this.getUserEnvironment(userId, envId);
    if (!env) {
      throw new Error('Environment not found');
    }

    return this.executeDevboxCommand([
      'run',
      '--path', env.path,
      '--', command
    ]);
  }
}
```

### 9.4 PWA支持 (修改 public/)

#### 9.4.1 Service Worker (修改 public/sw.js)
```javascript
// 修改现有的 public/sw.js
const CACHE_NAME = 'claude-code-ui-v2';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// 添加离线支持
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // API请求的离线处理
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          error: 'Offline mode',
          message: 'Please check your internet connection'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  } else {
    // 静态资源的缓存处理
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

#### 9.4.2 Manifest更新 (修改 public/manifest.json)
```json
{
  "name": "Claude Code UI - Multi-tenant",
  "short_name": "Claude Code",
  "description": "Multi-tenant Claude Code platform with mobile support",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```
