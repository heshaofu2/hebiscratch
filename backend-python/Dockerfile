# FastAPI 后端 Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY pyproject.toml ./

# 安装 Python 依赖
RUN pip install --no-cache-dir -e .

# 复制应用代码
COPY app ./app
COPY run.py ./

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["python", "run.py"]
