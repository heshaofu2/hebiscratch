# Next.js 前端 Dockerfile
FROM node:20-alpine AS base

# 使用阿里云 Alpine 源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装 git（用于克隆 scratch-gui）
RUN apk add --no-cache git

# 使用淘宝 npm 源
RUN npm config set registry https://registry.npmmirror.com

# ========== 阶段 1: 构建 scratch-gui ==========
FROM base AS scratch-builder
WORKDIR /scratch-gui

# 克隆 scratch-gui fork 并构建
ARG SCRATCH_GUI_REPO=https://github.com/heshaofu2/scratch-gui.git
ARG SCRATCH_GUI_BRANCH=develop

RUN git clone --depth 1 --branch ${SCRATCH_GUI_BRANCH} ${SCRATCH_GUI_REPO} . && \
    npm ci && \
    npm run build

# ========== 阶段 2: 安装前端依赖 ==========
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ========== 阶段 3: 构建前端 ==========
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 复制 scratch-gui 构建产物
COPY --from=scratch-builder /scratch-gui/build ./public/scratch

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
