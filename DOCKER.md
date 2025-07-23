# Claude Code UI Docker 配置指南

## 🚀 快速开始

### 1. 环境配置

运行设置脚本：
```bash
./setup-env.sh
```

或者手动配置：
```bash
# 复制配置模板
cp .env.example .env

# 编辑配置文件
nano .env
```

### 2. 启动服务

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## ⚙️ 环境变量配置

### Anthropic API 配置

```bash
# 使用 Moonshot API
ANTHROPIC_BASE_URL=https://api.moonshot.cn/anthropic/
ANTHROPIC_API_KEY=sk-toI8fOMosDSoSi2Lh4OuemjZ3eNURfzduplkLZXCZcoDwEi5

# 使用官方 API
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 服务器配置

```bash
# 端口配置
PORT=3008

# 环境模式
NODE_ENV=production

# 安全配置
JWT_SECRET=your-secure-secret-key
SESSION_TIMEOUT=24h
```

### 项目配置

```bash
# 默认项目路径
DEFAULT_PROJECT_PATH=/workspace

# 自动创建项目目录
AUTO_CREATE_PROJECTS=true

# 主机目录映射
WORKSPACE_PATH=./workspace
PROJECTS_PATH=~/Documents
```

## 📁 目录结构

```
claudecodeui/
├── .env                    # 环境变量配置
├── .env.example           # 配置模板
├── docker-compose.yml     # Docker Compose 配置
├── setup-env.sh          # 环境设置脚本
├── workspace/             # 项目工作区
├── data/                  # 应用数据
└── sessions/              # Claude CLI 会话
```

## 🔧 常用命令

```bash
# 查看服务状态
docker-compose ps

# 重启服务
docker-compose restart

# 查看实时日志
docker-compose logs -f claude-code-ui

# 进入容器
docker-compose exec claude-code-ui bash

# 更新镜像
docker-compose pull
docker-compose up -d

# 清理数据
docker-compose down -v
```

## 🌐 访问应用

- **Web 界面**: http://localhost:3008
- **API 端点**: http://localhost:3008/api/config
- **健康检查**: http://localhost:3008/api/config

## 🔒 安全注意事项

1. **更改默认密钥**: 在生产环境中务必更改 `JWT_SECRET`
2. **保护 API 密钥**: 不要将 `ANTHROPIC_API_KEY` 提交到版本控制
3. **网络安全**: 在生产环境中配置防火墙和 HTTPS

## 🐛 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口使用
   lsof -i :3008
   
   # 修改端口
   echo "PORT=3009" >> .env
   ```

2. **API 连接失败**
   ```bash
   # 检查 API 配置
   docker-compose exec claude-code-ui env | grep ANTHROPIC
   
   # 测试 API 连接
   curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" $ANTHROPIC_BASE_URL/v1/models
   ```

3. **权限问题**
   ```bash
   # 修复目录权限
   sudo chown -R $USER:$USER workspace data sessions
   ```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs claude-code-ui

# 实时日志
docker-compose logs -f --tail=100
```

## 📊 监控

### 健康检查

容器包含自动健康检查，每30秒检查一次服务状态：

```bash
# 查看健康状态
docker-compose ps

# 手动健康检查
curl -f http://localhost:3008/api/config
```

### 资源使用

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df
```

## 🔄 更新和维护

### 更新应用

```bash
# 拉取最新镜像
docker-compose pull

# 重新构建并启动
docker-compose up -d --build

# 清理旧镜像
docker image prune
```

### 数据备份

```bash
# 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz data sessions

# 恢复数据
tar -xzf backup-20240101.tar.gz
```
