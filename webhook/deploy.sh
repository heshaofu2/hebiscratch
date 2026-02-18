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

# 拉取最新代码
log "Pulling latest code..."
git pull origin main

# 重新构建所有镜像
log "Building images..."
docker compose build

# 先启动/重启除 webhook 外的服务（避免 webhook 自我重建导致脚本中断）
log "Restarting services (excluding webhook)..."
docker compose up -d --no-deps frontend backend nginx

# 清理旧镜像和构建缓存
log "Cleaning up old images and build cache..."
docker image prune -f
docker builder prune -f --filter "until=24h"

log "=== Deployment completed ==="

# 最后重启 webhook 自身（此操作会终止当前脚本，放在最后确保其他工作已完成）
docker compose up -d --no-deps webhook
