#!/bin/bash

# Scratch 平台启动脚本
# 用法:
#   ./start.sh dev    - 启动开发模式（支持热重载）
#   ./start.sh prod   - 启动生产模式
#   ./start.sh stop   - 停止所有服务
#   ./start.sh logs   - 查看日志
#   ./start.sh status - 查看服务状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
}

# 启动开发模式
start_dev() {
    print_info "启动开发模式..."

    # 使用开发环境配置
    if [ -f ".env.development" ]; then
        cp .env.development .env
        print_info "已加载开发环境配置"
    fi

    docker-compose -f docker-compose.dev.full.yml up -d --build

    echo ""
    print_success "开发模式启动成功！"
    echo ""
    echo "  前端地址: http://localhost:3000"
    echo "  后端 API: http://localhost:3001"
    echo "  API 文档: http://localhost:3001/docs"
    echo "  MinIO 控制台: http://localhost:9001"
    echo ""
    print_info "修改代码后会自动热重载"
    print_info "查看日志: ./start.sh logs"
}

# 启动生产模式
start_prod() {
    print_info "启动生产模式..."

    # 检查生产环境配置
    if [ ! -f ".env" ]; then
        if [ -f ".env.production" ]; then
            cp .env.production .env
            print_warning "已从 .env.production 复制配置，请确保已修改敏感信息！"
        else
            print_error "缺少 .env 配置文件，请先创建"
            exit 1
        fi
    fi

    # 检查是否使用了默认的不安全密钥
    if grep -q "your-super-secret-jwt-key-change-in-production" .env 2>/dev/null; then
        print_warning "检测到使用默认 JWT_SECRET，生产环境请务必修改！"
    fi

    docker-compose -f docker-compose.yml up -d --build

    echo ""
    print_success "生产模式启动成功！"
    echo ""
    echo "  网站地址: http://localhost"
    echo "  （通过 Nginx 反向代理）"
    echo ""
    print_info "查看日志: ./start.sh logs"
}

# 停止所有服务
stop_all() {
    print_info "停止所有服务..."

    # 停止开发模式容器
    if docker-compose -f docker-compose.dev.full.yml ps -q 2>/dev/null | grep -q .; then
        docker-compose -f docker-compose.dev.full.yml down
        print_info "已停止开发模式服务"
    fi

    # 停止生产模式容器
    if docker-compose -f docker-compose.yml ps -q 2>/dev/null | grep -q .; then
        docker-compose -f docker-compose.yml down
        print_info "已停止生产模式服务"
    fi

    # 停止旧的基础设施容器
    if docker-compose -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
        docker-compose -f docker-compose.dev.yml down
        print_info "已停止基础设施服务"
    fi

    print_success "所有服务已停止"
}

# 查看日志
show_logs() {
    if docker-compose -f docker-compose.dev.full.yml ps -q 2>/dev/null | grep -q .; then
        docker-compose -f docker-compose.dev.full.yml logs -f
    elif docker-compose -f docker-compose.yml ps -q 2>/dev/null | grep -q .; then
        docker-compose -f docker-compose.yml logs -f
    else
        print_warning "没有运行中的服务"
    fi
}

# 查看状态
show_status() {
    echo ""
    print_info "服务状态:"
    echo ""

    if docker-compose -f docker-compose.dev.full.yml ps -q 2>/dev/null | grep -q .; then
        echo "【开发模式】"
        docker-compose -f docker-compose.dev.full.yml ps
    elif docker-compose -f docker-compose.yml ps -q 2>/dev/null | grep -q .; then
        echo "【生产模式】"
        docker-compose -f docker-compose.yml ps
    else
        print_warning "没有运行中的服务"
    fi
}

# 显示帮助
show_help() {
    echo ""
    echo "Scratch 平台启动脚本"
    echo ""
    echo "用法: ./start.sh <command>"
    echo ""
    echo "命令:"
    echo "  dev     启动开发模式（支持热重载）"
    echo "  prod    启动生产模式"
    echo "  stop    停止所有服务"
    echo "  logs    查看服务日志"
    echo "  status  查看服务状态"
    echo "  help    显示此帮助信息"
    echo ""
}

# 主逻辑
check_docker

case "${1:-}" in
    dev)
        start_dev
        ;;
    prod)
        start_prod
        ;;
    stop)
        stop_all
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "未知命令: ${1:-}"
        show_help
        exit 1
        ;;
esac
