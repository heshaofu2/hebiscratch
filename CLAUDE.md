# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

私有化部署的 Scratch 编程平台，包含用户账号管理、Scratch 项目编辑/分享、错题本 + 试卷组卷、AI 图片识题等功能。

## 常用命令

### 开发环境

```bash
# 启动基础设施 (MongoDB, Redis, MinIO)
docker-compose -f docker-compose.dev.yml up -d

# 后端 (FastAPI, port 3001)
cd backend-python && source .venv/bin/activate
pip install -e .
python run.py

# 前端 (Next.js, port 3000)
cd frontend && npm install && npm run dev

# 代码检查 & 构建
cd frontend && npm run lint
cd frontend && npm run build

# 后端测试 (pytest + pytest-asyncio)
cd backend-python && pytest tests/ -v
```

### 快捷启动脚本

```bash
./start.sh dev      # 启动完整开发环境 (基础设施 + 前后端)
./start.sh prod     # 启动生产环境 (Docker Compose)
./start.sh stop     # 停止所有服务
./start.sh logs     # 查看日志
./start.sh status   # 服务状态
```

### API 文档

- Swagger UI: http://localhost:3001/docs
- ReDoc: http://localhost:3001/redoc

## 技术栈

- **前端**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Zustand 5, Radix UI
- **后端**: FastAPI 0.115, Python 3.12+, Beanie (MongoDB ODM), Motor (async driver), LiteLLM (AI 识题)
- **基础设施**: MongoDB 6.0, Redis 7.0, MinIO (对象存储), Nginx (反向代理)

## 系统架构

```
浏览器 → Nginx(:80) ─┬─ /api/    → Backend (FastAPI:3001) → MongoDB + Redis + MinIO
                      ├─ /webhook → Webhook (auto-deploy:9000)
                      └─ /        → Frontend (Next.js:3000)
                                       └─ iframe → Scratch GUI (/scratch/embedded.html)
```

### 三个功能模块

| 模块 | 前端路由 | 后端路由 | 说明 |
|------|---------|---------|------|
| Scratch 编程 | `(scratch)/editor/[[...id]]`, `(scratch)/projects` | `/api/projects`, `/api/share` | 项目编辑、保存、分享 |
| 错题本 | `mistakes/bank/**` | `/api/mistakes` | 手动录题、AI 图片识别、复习追踪 |
| 试卷 | `mistakes/papers/**` | `/api/papers` | 从错题组卷、编辑、打印 |
| 管理后台 | `admin/users`, `admin/projects` | `/api/admin` | 用户管理、项目管理 |

## 核心架构模式

### 后端依赖注入 (`backend-python/app/api/deps.py`)

通过 `Annotated[Model, Depends(...)]` 实现统一的认证和资源所有权校验，每个 Owned* 依赖自动处理 404/403：

```python
CurrentUser   # JWT 认证 → User
AdminUser     # JWT + role=="admin" → User
OwnedProject  # JWT + 项目所有权 → Project (管理员可访问任意)
OwnedMistake  # JWT + 错题所有权 → MistakeEntry
OwnedPaper    # JWT + 试卷所有权 → Paper
```

新增资源时，遵循此模式在 `deps.py` 中创建对应的 Owned* 类型。

### 模型序列化约定

Beanie 模型统一使用 `to_response()` / `to_list_response()` 方法手动将 snake_case 字段转为 camelCase 返回给前端。前端 TypeScript 类型定义在 `frontend/src/types/index.ts` 中使用 camelCase。

### 前端状态管理

```
frontend/src/store/
├── auth.ts       # 登录/注册/登出，token 存 Cookie (7天)
├── projects.ts   # Scratch 项目 CRUD
├── mistakes.ts   # 错题本 CRUD + AI 识题
├── papers.ts     # 试卷 CRUD
└── admin.ts      # 管理后台
```

所有 API 调用通过 `frontend/src/lib/api.ts` 的 Axios 实例发出，拦截器自动附加 JWT Header、处理 401 重定向。

### Scratch GUI 通信协议

ScratchEditor 组件 (`components/ScratchEditor.tsx`) 通过 iframe + postMessage 与 Scratch GUI 通信：

```
父窗口 → iframe:  LOAD_PROJECT(data), SAVE_PROJECT, RUN_PROJECT, STOP_PROJECT, GET_THUMBNAIL
iframe → 父窗口:  EDITOR_LOADED, EDITOR_READY, PROJECT_LOADED, PROJECT_SAVED, THUMBNAIL, PROJECT_CHANGED
```

`scratch-gui-build/` 是定制的 Scratch 编辑器（独立 git 仓库，被 .gitignore 忽略）。构建产物复制到 `frontend/public/scratch/`，前端通过 iframe 加载 `/scratch/embedded.html`。

### 认证流程

用户登录 → JWT Token (HS256, 7天过期) → 存入 Cookie → Axios 拦截器自动附加 `Authorization: Bearer {token}` → 后端 `CurrentUser` 依赖解析

### 数据模型

```
User         → username(唯一), role("user"|"admin"), recognize_limit/recognize_count(AI配额)
Project      → owner→Link[User], storage_path(MinIO), thumbnail(base64), share_token(唯一)
MistakeEntry → owner→Link[User], source("manual"|"image"), knowledge_points[], is_mastered
Paper        → owner→Link[User], questions[](MistakeEntry ID 有序列表)
```

存储：项目文件 → `MinIO: projects/{id}/project.sb3`，错题图片 → `MinIO: mistakes/{user_id}/{image_id}.png`

### 应用生命周期 (`backend-python/app/main.py`)

FastAPI Lifespan 在启动时：初始化 MongoDB (Beanie)、初始化 MinIO 存储服务、创建默认 admin 账号 (admin/admin)。

## CI/CD

- **CI** (`.github/workflows/ci.yml`): push 到 main/develop 时触发 → 后端 pytest → 前端 build → Docker 构建测试
- **Deploy** (`.github/workflows/deploy.yml`): push tag `v*` 时触发 → 构建 Docker 镜像 → 推送到 GHCR → Webhook 触发服务器部署
- Docker 镜像推送到 `ghcr.io`，生产环境通过 Webhook 自动拉取部署

## 环境变量

关键配置在 `.env` 中（后端通过 `pydantic-settings` 读取 `.env` 和 `../.env`）：

- `JWT_SECRET` - JWT 签名密钥
- `MONGODB_URL` / `REDIS_URL` - 数据库连接
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_ENDPOINT` - 对象存储
- `AI_MODEL` / `AI_API_KEY` / `AI_API_BASE` - LiteLLM AI 识题配置

## 开发注意事项

- 项目目前没有自动化测试覆盖，添加新功能时建议手动测试相关 API 端点
- 所有 API 端点都在 `/api` 前缀下
- 前端使用 `@/*` 路径别名指向 `./src/*`
- 前端路由组：`(home)` 首页/认证页，`(scratch)` 编辑器页（各有独立 layout）
- 后端 Dockerfile 使用阿里云镜像源加速构建
