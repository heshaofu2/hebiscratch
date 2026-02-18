#!/bin/bash
set -e

DEPLOY_DIR="/opt/scratch"
LOG_FILE="/var/log/deploy.log"
LOCK_FILE="/tmp/deploy.lock"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# 防止并发部署
if [ -f "$LOCK_FILE" ]; then
    log "Deploy already in progress, skipping..."
    exit 0
fi

trap "rm -f $LOCK_FILE" EXIT
touch $LOCK_FILE

log "=== Starting deployment ==="

cd $DEPLOY_DIR

# 记录当前 commit，用于后续 diff
OLD_HEAD=$(git rev-parse HEAD)

# 拉取最新代码
log "Pulling latest code..."
git pull origin main

NEW_HEAD=$(git rev-parse HEAD)

# 检测变更的文件，判断需要重建哪些服务
CHANGED_FILES=$(git diff --name-only "$OLD_HEAD" "$NEW_HEAD")
log "Changed files: $(echo $CHANGED_FILES | tr '\n' ' ')"

BUILD_FRONTEND=false
BUILD_BACKEND=false
BUILD_WEBHOOK=false
RESTART_NGINX=false

for file in $CHANGED_FILES; do
    case "$file" in
        frontend/*)   BUILD_FRONTEND=true ;;
        backend-python/*) BUILD_BACKEND=true ;;
        webhook/*)    BUILD_WEBHOOK=true ;;
        nginx/*)      RESTART_NGINX=true ;;
        docker-compose.yml) BUILD_FRONTEND=true; BUILD_BACKEND=true; BUILD_WEBHOOK=true; RESTART_NGINX=true ;;
    esac
done

# 收集需要构建和重启的服务
SERVICES_TO_BUILD=""
SERVICES_TO_RESTART=""

if [ "$BUILD_FRONTEND" = true ]; then
    SERVICES_TO_BUILD="$SERVICES_TO_BUILD frontend"
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART frontend"
fi
if [ "$BUILD_BACKEND" = true ]; then
    SERVICES_TO_BUILD="$SERVICES_TO_BUILD backend"
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART backend"
fi
if [ "$BUILD_WEBHOOK" = true ]; then
    SERVICES_TO_BUILD="$SERVICES_TO_BUILD webhook"
fi
if [ "$RESTART_NGINX" = true ]; then
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART nginx"
fi

# 执行构建
if [ -n "$SERVICES_TO_BUILD" ]; then
    log "Building:$SERVICES_TO_BUILD"
    docker compose build $SERVICES_TO_BUILD
else
    log "No services need rebuilding, skipping build"
fi

# 重启服务（排除 webhook）
if [ -n "$SERVICES_TO_RESTART" ]; then
    log "Restarting:$SERVICES_TO_RESTART"
    docker compose up -d --no-deps $SERVICES_TO_RESTART
else
    log "No services need restarting"
fi

# 清理旧镜像
if [ -n "$SERVICES_TO_BUILD" ]; then
    log "Cleaning up old images..."
    docker image prune -f
fi

log "=== Deployment completed ==="

# 最后重启 webhook 自身（此操作会终止当前脚本，放在最后确保其他工作已完成）
if [ "$BUILD_WEBHOOK" = true ]; then
    log "Restarting webhook (script will be terminated)..."
    docker compose up -d --no-deps webhook
fi
