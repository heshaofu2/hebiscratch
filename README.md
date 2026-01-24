# Scratch 私有化部署服务

私有化部署的 Scratch 编程平台，支持用户账号、项目管理和作品分享功能。

## 项目结构

```
scratch/
├── frontend/           # Next.js 前端
├── backend-python/     # FastAPI 后端
├── nginx/              # Nginx 配置
├── docker-compose.yml  # 生产环境部署
└── docker-compose.dev.yml  # 本地开发
```

## 快速开始

### 生产环境部署

1. **配置环境变量**

```bash
cp .env.example .env
# 编辑 .env 文件，修改 JWT_SECRET 和 MinIO 凭据
```

2. **启动所有服务**

```bash
docker-compose up -d --build
```

3. **访问服务**

- 网站: http://localhost
- MinIO 控制台: http://localhost:9001

### 本地开发

1. **启动基础设施**

```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. **启动后端**

```bash
cd backend-python
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
python run.py
```

3. **启动前端**

```bash
cd frontend
npm install
npm run dev
```

4. **访问服务**

- 前端: http://localhost:3000
- 后端 API: http://localhost:3001
- API 文档: http://localhost:3001/docs

## API 接口

### 认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/auth/logout` | POST | 退出登录 |

### 项目

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/projects` | GET | 获取项目列表 |
| `/api/projects` | POST | 创建项目 |
| `/api/projects/{id}` | GET | 获取项目详情 |
| `/api/projects/{id}` | PUT | 更新项目 |
| `/api/projects/{id}` | DELETE | 删除项目 |
| `/api/projects/{id}/share` | POST | 生成分享链接 |

### 分享

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/share/{token}` | GET | 获取分享的项目 |

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: FastAPI, Python 3.12, Beanie (MongoDB ODM)
- **数据库**: MongoDB
- **缓存**: Redis
- **存储**: MinIO
- **部署**: Docker, Nginx
