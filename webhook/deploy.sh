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

# 重新构建并启动
log "Building and starting services..."
docker compose build
docker compose up -d

# 清理旧镜像
log "Cleaning up old images..."
docker image prune -f

log "=== Deployment completed ==="
