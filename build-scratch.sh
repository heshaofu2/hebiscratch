#!/bin/bash
# 构建 scratch-gui 并复制到前端目录
# 用法:
#   ./build-scratch.sh        - 构建并复制
#   ./build-scratch.sh clone  - 首次克隆仓库
#   ./build-scratch.sh pull   - 更新代码并重新构建

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
SCRATCH_GUI_DIR="scratch-gui-build"
SCRATCH_GUI_REPO="https://github.com/heshaofu2/scratch-gui.git"
SCRATCH_GUI_BRANCH="develop"
OUTPUT_DIR="frontend/public/scratch"

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 克隆仓库
clone_repo() {
    if [ -d "$SCRATCH_GUI_DIR" ]; then
        print_warning "目录 $SCRATCH_GUI_DIR 已存在"
        read -p "是否删除并重新克隆? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$SCRATCH_GUI_DIR"
        else
            print_info "跳过克隆"
            return 0
        fi
    fi

    print_info "克隆 scratch-gui..."
    git clone --branch "$SCRATCH_GUI_BRANCH" "$SCRATCH_GUI_REPO" "$SCRATCH_GUI_DIR"
    print_success "克隆完成"
}

# 更新代码
pull_repo() {
    if [ ! -d "$SCRATCH_GUI_DIR" ]; then
        print_error "目录 $SCRATCH_GUI_DIR 不存在，请先运行: ./build-scratch.sh clone"
        exit 1
    fi

    print_info "更新 scratch-gui 代码..."
    cd "$SCRATCH_GUI_DIR"
    git pull origin "$SCRATCH_GUI_BRANCH"
    cd ..
    print_success "更新完成"
}

# 构建
build() {
    if [ ! -d "$SCRATCH_GUI_DIR" ]; then
        print_error "目录 $SCRATCH_GUI_DIR 不存在，请先运行: ./build-scratch.sh clone"
        exit 1
    fi

    print_info "安装依赖..."
    cd "$SCRATCH_GUI_DIR"
    npm ci

    print_info "构建 scratch-gui..."
    npm run build

    print_info "复制构建产物到 $OUTPUT_DIR..."
    cd ..
    mkdir -p "$OUTPUT_DIR"
    cp -r "$SCRATCH_GUI_DIR/build/"* "$OUTPUT_DIR/"

    print_success "构建完成！"
    print_info "产物位置: $OUTPUT_DIR"
}

# 显示帮助
show_help() {
    echo ""
    echo "Scratch GUI 构建脚本"
    echo ""
    echo "用法: ./build-scratch.sh [command]"
    echo ""
    echo "命令:"
    echo "  (无参数)  构建并复制到前端目录"
    echo "  clone     首次克隆 scratch-gui 仓库"
    echo "  pull      更新代码并重新构建"
    echo "  help      显示此帮助信息"
    echo ""
    echo "配置:"
    echo "  仓库: $SCRATCH_GUI_REPO"
    echo "  分支: $SCRATCH_GUI_BRANCH"
    echo "  输出: $OUTPUT_DIR"
    echo ""
}

# 主逻辑
case "${1:-}" in
    clone)
        clone_repo
        ;;
    pull)
        pull_repo
        build
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        build
        ;;
esac
