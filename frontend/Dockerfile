# Next.js 前端 Dockerfile
FROM node:20-alpine AS base

# 使用阿里云 Alpine 源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 使用淘宝 npm 源
RUN npm config set registry https://registry.npmmirror.com

# ========== 注意 ==========
# scratch-gui 构建产物需要预先放在 public/scratch/ 目录中
# 本地构建方法：
#   cd scratch-gui-build && npm run build
#   cp -r build/* ../frontend/public/scratch/
# 或使用脚本：./build-scratch.sh pull
# ===========================

# ========== 阶段 1: 安装前端依赖 ==========
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ========== 阶段 2: 构建前端 ==========
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# 复制所有文件（包括 public/scratch/ 中的 scratch-gui 构建产物）
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
