# Scratch 私有化部署指南

本文档指导您将 Scratch 服务部署到阿里云轻量应用服务器。

## 目录

- [项目概述](#项目概述)
- [快速开始](#快速开始)
- [首次部署](#首次部署)
- [HTTPS 配置](#https-配置可选)
- [运维指南](#运维指南)
- [常见问题](#常见问题)

---

## 项目概述

### 项目架构

```
scratch/                          # 主仓库 (GitHub: heshaofu2/hebiscratch)
├── frontend/                     # Next.js 前端
├── backend-python/               # FastAPI 后端
├── nginx/                        # Nginx 配置
├── docker-compose.yml            # 生产环境 Docker 配置
├── docker-compose.dev.full.yml   # 开发环境 Docker 配置
├── start.sh                      # 启动脚本
├── build-scratch.sh              # scratch-gui 本地构建脚本
└── scratch-gui-build/            # scratch-gui 源码 (独立仓库，已 gitignore)
                                  # GitHub: heshaofu2/scratch-gui (develop 分支)
```

### 仓库说明

| 仓库 | 地址 | 说明 |
|------|------|------|
| 主项目 | https://github.com/heshaofu2/hebiscratch | 前端 + 后端 + 部署配置 |
| scratch-gui fork | https://github.com/heshaofu2/scratch-gui | Scratch 编辑器（定制版） |

### 服务架构

```
                    ┌─────────────┐
                    │   用户浏览器  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │ :80/:443
                    │  (反向代理)  │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
       │  Frontend  │ │ Backend │ │   MinIO   │
       │  (Next.js) │ │(FastAPI)│ │ (对象存储) │
       │   :3000    │ │  :3001  │ │   :9000   │
       └────────────┘ └────┬────┘ └───────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼─────┐           ┌───────▼───────┐
       │  MongoDB   │           │     Redis     │
       │  (数据库)   │           │    (缓存)     │
       │   :27017   │           │    :6379      │
       └────────────┘           └───────────────┘
```

### 端口说明

| 服务 | 内部端口 | 外部端口 | 说明 |
|-----|---------|---------|------|
| Nginx | 80/443 | 80/443 | 反向代理，对外暴露 |
| Frontend | 3000 | - | 内部访问 |
| Backend | 3001 | - | 内部访问 |
| MongoDB | 27017 | - | 内部访问 |
| Redis | 6379 | - | 内部访问 |
| MinIO | 9000/9001 | - | 内部访问 |

---

## 快速开始

> 本节面向已完成首次部署的用户，提供日常开发和部署的快速参考。

### 服务器信息

- **服务器**: 阿里云轻量级服务器
- **IP**: 120.26.7.208
- **SSH 密钥**: `./hsf.pem`
- **项目路径**: `/opt/scratch`
- **访问地址**: http://120.26.7.208

### 本地开发

```bash
# 首次克隆项目
git clone https://github.com/heshaofu2/hebiscratch.git scratch
cd scratch

# 克隆 scratch-gui（如需修改编辑器）
./build-scratch.sh clone

# 启动开发环境
./start.sh dev

# 访问地址
# 前端: http://localhost:3000
# 后端: http://localhost:3001
# API 文档: http://localhost:3001/docs
```

### 线上部署

#### 方式一：一键部署

```bash
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && git pull origin main && ./start.sh prod"
```

#### 方式二：手动部署

```bash
# 1. 连接服务器
ssh -i ./hsf.pem root@120.26.7.208

# 2. 进入项目目录
cd /opt/scratch

# 3. 拉取最新代码
git pull origin main

# 4. 重新构建并启动
./start.sh prod
```

#### 方式三：查看服务状态

```bash
# 查看容器状态
ssh -i ./hsf.pem root@120.26.7.208 "docker ps"

# 查看日志
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && ./start.sh logs"

# 停止服务
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && ./start.sh stop"
```

### 常用命令速查

#### 本地命令

| 命令 | 说明 |
|------|------|
| `./start.sh dev` | 启动本地开发环境 |
| `./start.sh stop` | 停止所有服务 |
| `./build-scratch.sh` | 构建 scratch-gui 并复制到前端 |
| `./build-scratch.sh clone` | 首次克隆 scratch-gui |
| `./build-scratch.sh pull` | 更新并重新构建 scratch-gui |

#### 服务器命令

| 命令 | 说明 |
|------|------|
| `./start.sh prod` | 启动生产环境 |
| `./start.sh stop` | 停止所有服务 |
| `./start.sh logs` | 查看服务日志 |
| `./start.sh status` | 查看服务状态 |

### 完整更新流程示例

#### 场景 1：只修改前端/后端代码

```bash
# 1. 本地修改代码并提交
git add .
git commit -m "fix: bug description"
git push origin main

# 2. 部署到服务器
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && git pull origin main && ./start.sh prod"
```

#### 场景 2：修改 scratch-gui 编辑器

```bash
# 1. 修改 scratch-gui-build 中的代码

# 2. 提交 scratch-gui 修改
cd scratch-gui-build
git add .
git commit -m "feat: add new feature to editor"
git push origin develop

# 3. 部署到服务器（Docker 构建时会自动拉取最新的 scratch-gui）
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && docker builder prune -af && ./start.sh prod"
```

---

## 首次部署

> 本节提供完整的首次部署指南，包括服务器初始化和项目配置。

### 前置要求

- 阿里云轻量应用服务器（推荐配置：2vCPU 4GiB）
- 操作系统：Ubuntu 22.04 LTS 或 Debian 11+
- 已配置 SSH 访问
- （可选）已备案的域名

### 1. 服务器初始化

#### 1.1 连接服务器

```bash
ssh root@<你的服务器IP>
```

#### 1.2 更新系统

```bash
apt update && apt upgrade -y
```

#### 1.3 安装 Docker

```bash
# 安装必要依赖
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 软件源（Ubuntu）
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

> **国内加速**：如果下载速度慢，可使用阿里云镜像源：
> ```bash
> curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
> echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
> ```

#### 1.4 配置 Docker 镜像加速（推荐）

```bash
# 创建 Docker 配置目录
mkdir -p /etc/docker

# 配置镜像加速器
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerhub.azk8s.cn",
    "https://registry.cn-hangzhou.aliyuncs.com"
  ]
}
EOF

# 重启 Docker
systemctl daemon-reload
systemctl restart docker
```

#### 1.5 配置防火墙

```bash
# 安装 ufw（如未安装）
apt install -y ufw

# 配置防火墙规则
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# 启用防火墙
ufw --force enable

# 查看状态
ufw status
```

#### 1.6 安装 Git

```bash
apt install -y git
```

### 2. 项目部署

#### 2.1 克隆代码

```bash
# 创建部署目录
mkdir -p /opt/apps
cd /opt/apps

# 克隆代码
git clone https://github.com/heshaofu2/hebiscratch.git scratch
cd scratch
```

#### 2.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.production .env

# 生成安全的 JWT 密钥
JWT_SECRET=$(openssl rand -base64 32)
echo "生成的 JWT_SECRET: $JWT_SECRET"

# 生成 MinIO 密钥
MINIO_ACCESS_KEY=$(openssl rand -hex 16)
MINIO_SECRET_KEY=$(openssl rand -hex 32)
echo "生成的 MINIO_ACCESS_KEY: $MINIO_ACCESS_KEY"
echo "生成的 MINIO_SECRET_KEY: $MINIO_SECRET_KEY"

# 编辑 .env 文件
nano .env
```

将生成的密钥填入 `.env` 文件：

```env
# 生产环境配置

# JWT 密钥（使用上面生成的密钥）
JWT_SECRET=<粘贴生成的JWT_SECRET>

# MinIO 凭据（使用上面生成的密钥）
MINIO_ACCESS_KEY=<粘贴生成的MINIO_ACCESS_KEY>
MINIO_SECRET_KEY=<粘贴生成的MINIO_SECRET_KEY>
```

按 `Ctrl+O` 保存，`Ctrl+X` 退出。

#### 2.3 构建并启动服务

```bash
# 构建镜像（首次部署需要较长时间）
docker compose build

# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps
```

预期输出：

```
NAME               STATUS    PORTS
scratch-nginx      Up        0.0.0.0:80->80/tcp
scratch-frontend   Up        3000/tcp
scratch-backend    Up        3001/tcp
scratch-mongo      Up        27017/tcp
scratch-redis      Up        6379/tcp
scratch-minio      Up        9000/tcp, 9001/tcp
```

#### 2.4 验证部署

```bash
# 检查健康状态
curl http://localhost/health

# 检查 API 服务
curl http://localhost/api/health
```

在浏览器中访问 `http://<你的服务器IP>`，应该能看到 Scratch 首页。

#### 2.5 初始化 MinIO 存储桶

首次部署需要创建存储桶：

```bash
# 进入 MinIO 容器
docker exec -it scratch-minio sh

# 使用 mc 客户端创建桶
mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
mc mb local/scratch-assets
mc anonymous set download local/scratch-assets

# 退出容器
exit
```

---

## HTTPS 配置（可选）

如果你有域名并已完成备案，建议配置 HTTPS。

### 1. 域名解析

在阿里云域名控制台添加 A 记录：

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| A | @ 或 scratch | 你的服务器IP |

### 2. 安装 Certbot

```bash
apt install -y certbot
```

### 3. 获取 SSL 证书

```bash
# 停止 Nginx 以释放 80 端口
docker compose stop nginx

# 获取证书（替换为你的域名和邮箱）
certbot certonly --standalone -d your-domain.com --email your-email@example.com --agree-tos --no-eff-email

# 重启 Nginx
docker compose start nginx
```

### 4. 配置 HTTPS

创建支持 HTTPS 的 Nginx 配置：

```bash
cat > nginx/nginx-ssl.conf << 'EOF'
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:3001;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书路径
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # 客户端最大请求体大小
    client_max_body_size 50M;

    # 后端 API 代理
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 前端代理
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 健康检查
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF
```

修改 `docker-compose.yml` 以挂载 SSL 证书：

```bash
# 备份原配置
cp docker-compose.yml docker-compose.yml.bak

# 编辑配置
nano docker-compose.yml
```

修改 nginx 服务部分：

```yaml
nginx:
  image: nginx:alpine
  container_name: scratch-nginx
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
  depends_on:
    - frontend
    - backend
  restart: unless-stopped
```

重启服务：

```bash
docker compose down
docker compose up -d
```

### 5. 配置证书自动续期

```bash
# 添加定时任务
crontab -e
```

添加以下内容：

```cron
0 0 1 * * certbot renew --pre-hook "docker compose -f /opt/apps/scratch/docker-compose.yml stop nginx" --post-hook "docker compose -f /opt/apps/scratch/docker-compose.yml start nginx"
```

---

## 运维指南

### 查看日志

```bash
# 查看所有服务日志
docker compose logs

# 查看特定服务日志
docker compose logs frontend
docker compose logs backend
docker compose logs nginx

# 实时追踪日志
docker compose logs -f

# 查看最近 100 行日志
docker compose logs --tail=100
```

### 服务管理

```bash
# 停止所有服务
docker compose stop

# 启动所有服务
docker compose start

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart backend

# 停止并删除容器（保留数据）
docker compose down

# 停止并删除容器和数据卷（危险！会删除所有数据）
docker compose down -v
```

### 更新部署

```bash
cd /opt/apps/scratch

# 拉取最新代码
git pull

# 重新构建并部署
docker compose build
docker compose up -d
```

### 数据备份

#### 自动备份脚本

创建备份脚本：

```bash
cat > /opt/apps/scratch/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/opt/backups/scratch"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

echo "开始备份 MongoDB..."
docker exec scratch-mongo mongodump --archive=/tmp/mongo_backup.gz --gzip
docker cp scratch-mongo:/tmp/mongo_backup.gz $BACKUP_DIR/mongo_$DATE.gz
docker exec scratch-mongo rm /tmp/mongo_backup.gz

echo "开始备份 MinIO..."
docker run --rm -v scratch_minio_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/minio_$DATE.tar.gz -C /data .

echo "删除 7 天前的备份..."
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成：$BACKUP_DIR"
ls -lh $BACKUP_DIR
EOF

chmod +x /opt/apps/scratch/backup.sh
```

#### 设置定时备份

```bash
crontab -e
```

添加每日凌晨 3 点自动备份：

```cron
0 3 * * * /opt/apps/scratch/backup.sh >> /var/log/scratch_backup.log 2>&1
```

#### 手动备份

```bash
/opt/apps/scratch/backup.sh
```

#### 恢复数据

```bash
# 恢复 MongoDB
docker cp /opt/backups/scratch/mongo_XXXXXX.gz scratch-mongo:/tmp/
docker exec scratch-mongo mongorestore --archive=/tmp/mongo_XXXXXX.gz --gzip --drop

# 恢复 MinIO
docker compose stop minio
docker run --rm -v scratch_minio_data:/data -v /opt/backups/scratch:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/minio_XXXXXX.tar.gz -C /data"
docker compose start minio
```

### 监控资源使用

```bash
# 查看容器资源使用情况
docker stats

# 查看磁盘使用
df -h

# 清理未使用的 Docker 资源
docker system prune -f
```

---

## 常见问题

### Q1: 构建时内存不足

**现象**：构建前端镜像时出现 `JavaScript heap out of memory`

**解决方案**：

```bash
# 增加 Node.js 内存限制
# 修改 frontend/Dockerfile，在构建命令前添加：
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

或者使用 swap：

```bash
# 创建 2GB swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久启用
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Q2: 服务启动失败

**诊断步骤**：

```bash
# 查看失败的容器日志
docker compose logs <服务名>

# 检查容器状态
docker compose ps -a

# 重新构建问题服务
docker compose build --no-cache <服务名>
docker compose up -d <服务名>
```

### Q3: 端口被占用

**现象**：启动时提示 `port is already allocated`

**解决方案**：

```bash
# 查看端口占用
lsof -i :80
lsof -i :443

# 停止占用端口的进程
kill <PID>

# 或修改 docker-compose.yml 使用其他端口
```

### Q4: 无法访问服务

**检查清单**：

1. 检查服务是否运行：`docker compose ps`
2. 检查防火墙：`ufw status`
3. 检查阿里云安全组是否开放 80/443 端口
4. 检查 Nginx 日志：`docker compose logs nginx`

### Q5: 数据库连接失败

```bash
# 检查 MongoDB 状态
docker compose logs mongo

# 进入 MongoDB 容器测试
docker exec -it scratch-mongo mongosh

# 检查网络连接
docker network ls
docker network inspect scratch_default
```

### Q6: 文件上传失败

**可能原因**：

1. Nginx `client_max_body_size` 限制（默认已配置为 50M）
2. MinIO 存储桶未创建或权限不足

**解决方案**：

```bash
# 检查 MinIO 存储桶
docker exec -it scratch-minio sh
mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
mc ls local/
mc mb local/scratch-assets --ignore-existing
mc anonymous set download local/scratch-assets
```

### Q7: 构建失败

1. 清理构建缓存：`docker builder prune -af`
2. 检查网络：国内服务器需要配置镜像加速（已在 Dockerfile 中配置）
3. 查看详细构建日志

---

## 附录

### 数据目录

| 数据卷 | 说明 |
|-------|------|
| mongo_data | MongoDB 数据 |
| redis_data | Redis 数据 |
| minio_data | MinIO 文件存储 |

### 注意事项

1. **安全组配置**: 确保阿里云安全组开放了 80 端口

2. **环境变量**: 生产环境的 `.env` 文件包含敏感信息（JWT_SECRET、MINIO 凭据），请妥善保管

3. **构建缓存**: 如果 scratch-gui 更新后服务器没有拉取最新代码，先清理构建缓存：
   ```bash
   docker builder prune -af
   ```

4. **micro:bit 功能**: 当前构建跳过了 micro:bit 固件下载，如需此功能请手动配置

5. **SSH 密钥权限**: 确保密钥文件权限正确：
   ```bash
   chmod 600 ./hsf.pem
   ```

---

## 技术支持

如遇到部署问题，请检查：

1. 服务器配置是否满足最低要求（2vCPU 4GiB）
2. 所有服务是否正常运行（`docker compose ps`）
3. 日志中是否有错误信息（`docker compose logs`）

如仍无法解决，请提供以下信息寻求帮助：

- `docker compose ps` 输出
- `docker compose logs` 相关日志
- 服务器配置信息
