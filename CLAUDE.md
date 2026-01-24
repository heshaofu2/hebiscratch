# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个私有化部署的 Scratch 编程平台，支持用户账号、项目管理和作品分享功能。

## 常用命令

### 开发环境

```bash
# 启动基础设施 (MongoDB, Redis, MinIO)
docker-compose -f docker-compose.dev.yml up -d

# 后端 (FastAPI)
cd backend-python
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
python run.py                    # 启动开发服务器 http://localhost:3001

# 前端 (Next.js)
cd frontend
npm install
npm run dev                      # 启动开发服务器 http://localhost:3000
npm run lint                     # 代码检查
npm run build                    # 构建生产版本
```

### 快捷启动脚本

```bash
./start.sh dev      # 启动完整开发环境
./start.sh prod     # 启动生产环境
./start.sh logs     # 查看日志
./start.sh status   # 服务状态
./start.sh stop     # 停止服务
```

### API 文档

- Swagger UI: http://localhost:3001/docs
- ReDoc: http://localhost:3001/redoc

## 技术架构

### 技术栈

- **前端**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Zustand 5
- **后端**: FastAPI 0.115, Python 3.12+, Beanie (MongoDB ODM), Motor (async driver)
- **基础设施**: MongoDB 6.0, Redis 7.0, MinIO, Nginx

### 系统架构

```
浏览器 → Nginx(生产) → Frontend(Next.js:3000) + Backend(FastAPI:3001)
                                ↓                        ↓
                          Scratch GUI(iframe)    MongoDB + Redis + MinIO
```

### 前端结构 (`frontend/src/`)

- `app/` - App Router 路由页面
- `components/` - React 组件（ScratchEditor 使用 iframe + postMessage 与 Scratch GUI 通信）
- `lib/` - API 客户端（Axios 拦截器自动处理 JWT）
- `store/` - Zustand 状态管理（auth, projects）
- `types/` - TypeScript 类型定义
- `hooks/` - 自定义 Hooks

### 后端结构 (`backend-python/app/`)

- `api/` - 路由端点 (auth.py, projects.py, share.py)
- `models/` - Beanie 文档模型 (User, Project)
- `schemas/` - Pydantic 请求/响应模式
- `services/` - 业务逻辑 (storage.py 处理 MinIO)
- `core/` - 配置和安全 (config.py, security.py)

### 数据模型关系

```
User (用户)
├── username (唯一索引)
├── password_hash
└── avatar

Project (项目)
├── owner → Link[User]
├── storage_path (MinIO 路径: projects/{id}/project.sb3)
├── thumbnail (base64 PNG)
├── share_token (唯一索引，分享功能)
└── view_count
```

### 核心数据流

1. **认证**: 用户登录 → JWT Token 存入 Cookie (7天) → Axios 自动附加 Authorization 头
2. **项目保存**: Scratch GUI (iframe) → postMessage → 前端 → POST /api/projects/{id} → MongoDB + MinIO
3. **项目分享**: 生成 share_token → /share/{token} 匿名访问

## 环境变量

关键配置项在 `.env` 文件中：

- `JWT_SECRET` - JWT 签名密钥（生产环境必须修改）
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` - MinIO 凭据
- `MONGODB_URL` - MongoDB 连接字符串
- `REDIS_URL` - Redis 连接字符串

## 开发注意事项

- 前端 ScratchEditor 组件通过 iframe 嵌入 Scratch GUI，通过 postMessage 进行安全通信
- 后端使用 Lifespan 管理应用生命周期，在启动时初始化数据库和存储服务
- 所有 API 端点都在 `/api` 前缀下
