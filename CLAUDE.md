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

### 后端依赖注入 (`backend-python/app/api/deps.py`)

可复用的 FastAPI 依赖，用于路由端点的权限控制：

- `CurrentUser` - 获取当前登录用户，验证 JWT Token
- `AdminUser` - 验证管理员权限 (role == "admin")
- `OwnedProject` - 获取项目并验证所有权，自动处理 404/403 错误

### 前端 API 客户端 (`frontend/src/lib/api.ts`)

Axios 实例封装，自动处理 JWT Token 和 401 重定向：

- `authApi` - 登录、注册、获取当前用户
- `projectsApi` - 项目 CRUD、资源上传、分享管理
- `shareApi` - 公开分享页面获取项目
- `adminApi` - 用户管理（列表、创建、修改、删除、重置密码）

### Scratch GUI 通信协议

ScratchEditor 组件通过 postMessage 与 iframe 中的 Scratch GUI 通信：

```
父窗口 → iframe:
  LOAD_PROJECT(data)  - 加载项目 (base64 sb3)
  SAVE_PROJECT        - 请求保存
  RUN_PROJECT         - 运行项目
  STOP_PROJECT        - 停止运行
  GET_THUMBNAIL       - 获取舞台截图

iframe → 父窗口:
  EDITOR_LOADED       - 编辑器 DOM 已加载
  EDITOR_READY        - 编辑器就绪，可接收项目
  PROJECT_LOADED      - 项目加载完成
  PROJECT_SAVED       - 项目保存完成 (返回 base64 数据)
  THUMBNAIL           - 截图完成 (返回 base64 PNG)
  PROJECT_CHANGED     - 项目内容已修改
```

## 环境变量

关键配置项在 `.env` 文件中：

- `JWT_SECRET` - JWT 签名密钥（生产环境必须修改）
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` - MinIO 凭据
- `MONGODB_URL` - MongoDB 连接字符串
- `REDIS_URL` - Redis 连接字符串

## 默认账号

首次启动时自动创建管理员账号：
- 用户名: `admin`
- 密码: `admin`
- 权限: 管理员 (可访问 `/admin` 用户管理页面)

**生产环境请务必修改默认密码！**

## scratch-gui-build 集成

`scratch-gui-build/` 是定制的 Scratch 编辑器，独立 git 仓库（被主项目 .gitignore 忽略）。

**集成方式**：构建产物复制到 `frontend/public/scratch/`，前端通过 iframe 加载 `/scratch/embedded.html`。

**构建**：`cd scratch-gui-build && npm install && npm run build`

## 开发注意事项

- 前端 ScratchEditor 组件通过 iframe 嵌入 Scratch GUI，通过 postMessage 进行安全通信
- 后端使用 Lifespan 管理应用生命周期，在启动时初始化数据库和存储服务
- 所有 API 端点都在 `/api` 前缀下
- 项目目前没有自动化测试，添加新功能时建议手动测试相关 API 端点
- `scratch-gui-build/` 目录在主项目的 .gitignore 中，是独立的 git 仓库
