# Scratch 平台部署指南

## 项目架构

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

## 仓库说明

| 仓库 | 地址 | 说明 |
|------|------|------|
| 主项目 | https://github.com/heshaofu2/hebiscratch | 前端 + 后端 + 部署配置 |
| scratch-gui fork | https://github.com/heshaofu2/scratch-gui | Scratch 编辑器（定制版） |

## 服务器信息

- **服务器**: 阿里云轻量级服务器
- **IP**: 120.26.7.208
- **SSH 密钥**: `./hsf.pem`
- **项目路径**: `/opt/scratch`
- **访问地址**: http://120.26.7.208

---

## 本地开发流程

### 1. 首次克隆项目

```bash
# 克隆主项目
git clone https://github.com/heshaofu2/hebiscratch.git scratch
cd scratch

# 克隆 scratch-gui（如需修改编辑器）
./build-scratch.sh clone
```

### 2. 本地开发 scratch-gui（可选）

如果需要修改 Scratch 编辑器：

```bash
# 进入 scratch-gui 目录
cd scratch-gui-build

# 修改代码后，构建并复制到前端
cd ..
./build-scratch.sh

# 提交 scratch-gui 的修改
cd scratch-gui-build
git add .
git commit -m "your changes"
git push origin develop
```

### 3. 本地开发主项目

```bash
# 启动开发环境（Docker）
./start.sh dev

# 访问
# 前端: http://localhost:3000
# 后端: http://localhost:3001
# API 文档: http://localhost:3001/docs
```

### 4. 提交主项目代码

```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

---

## 线上部署流程

### 方式一：手动部署（SSH）

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

### 方式二：一键部署脚本

在本地执行：

```bash
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && git pull origin main && ./start.sh prod"
```

### 方式三：查看服务状态

```bash
# 查看容器状态
ssh -i ./hsf.pem root@120.26.7.208 "docker ps"

# 查看日志
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && ./start.sh logs"

# 停止服务
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && ./start.sh stop"
```

---

## 完整更新流程示例

### 场景 1：只修改前端/后端代码

```bash
# 1. 本地修改代码
# 2. 提交并推送
git add .
git commit -m "fix: bug description"
git push origin main

# 3. 部署到服务器
ssh -i ./hsf.pem root@120.26.7.208 "cd /opt/scratch && git pull origin main && ./start.sh prod"
```

### 场景 2：修改 scratch-gui 编辑器

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

## 常用命令速查

### 本地命令

| 命令 | 说明 |
|------|------|
| `./start.sh dev` | 启动本地开发环境 |
| `./start.sh stop` | 停止所有服务 |
| `./build-scratch.sh` | 构建 scratch-gui 并复制到前端 |
| `./build-scratch.sh clone` | 首次克隆 scratch-gui |
| `./build-scratch.sh pull` | 更新并重新构建 scratch-gui |

### 服务器命令

| 命令 | 说明 |
|------|------|
| `./start.sh prod` | 启动生产环境 |
| `./start.sh stop` | 停止所有服务 |
| `./start.sh logs` | 查看服务日志 |
| `./start.sh status` | 查看服务状态 |

### Docker 命令

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止）
docker ps -a

# 查看某个容器的日志
docker logs scratch-frontend -f

# 重启某个容器
docker restart scratch-backend

# 清理构建缓存（解决构建问题）
docker builder prune -af
```

---

## 注意事项

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

## 故障排查

### 服务无法访问

1. 检查容器是否运行：`docker ps`
2. 检查安全组是否开放 80 端口
3. 查看 nginx 日志：`docker logs scratch-nginx`

### 构建失败

1. 清理构建缓存：`docker builder prune -af`
2. 检查网络：国内服务器需要配置镜像加速（已在 Dockerfile 中配置）
3. 查看详细构建日志

### 数据库连接失败

1. 检查 MongoDB 容器：`docker logs scratch-mongo`
2. 检查后端日志：`docker logs scratch-backend`
