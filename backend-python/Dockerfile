# FastAPI 后端 Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 使用阿里云 Debian 源加速
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY pyproject.toml ./

# 使用阿里云 PyPI 源
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    pip config set install.trusted-host mirrors.aliyun.com

# 安装 Python 依赖
RUN pip install --no-cache-dir -e .

# 复制应用代码
COPY app ./app
COPY run.py ./

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["python", "run.py"]
