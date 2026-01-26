FROM python:3.12-slim

WORKDIR /app

# 使用阿里云镜像源（国内服务器加速）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true

COPY webhook-server.py .
COPY deploy.sh .

RUN chmod +x deploy.sh

# 安装 docker CLI 和 git (用于执行部署)
RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    git \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 9000

CMD ["python", "webhook-server.py"]
