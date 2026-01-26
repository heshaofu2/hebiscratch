FROM python:3.12-slim

WORKDIR /app

COPY webhook-server.py .
COPY deploy.sh .

RUN chmod +x deploy.sh

# 安装 docker CLI 和 git (用于执行部署)
RUN apt-get update && apt-get install -y \
    docker.io \
    docker-compose \
    git \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 9000

CMD ["python", "webhook-server.py"]
