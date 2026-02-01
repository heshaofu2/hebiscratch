FROM python:3.12-slim

WORKDIR /app

# 使用阿里云镜像源（国内服务器加速）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true

COPY webhook-server.py .
COPY deploy.sh .

RUN chmod +x deploy.sh

# 安装 docker CLI 和 git (用于执行部署)
# 注意: docker.io 在 Debian 13 不包含 docker CLI，需要从 Docker 官方源安装
# 使用阿里云 Docker 镜像源（国内服务器加速）
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 9000

CMD ["python", "webhook-server.py"]
