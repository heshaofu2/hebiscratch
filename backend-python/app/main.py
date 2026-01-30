from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from app.common.core import get_settings
from app.common.models import User
from app.common.services import get_storage_service
from app.common.api import auth_router
from app.scratch.models import Project
from app.scratch.api import projects_router, share_router
from app.mistakes.models import MistakeQuestion
from app.mistakes.api import mistakes_router
from app.admin.api import admin_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print("Starting application...")

    # 初始化 MongoDB
    client = AsyncIOMotorClient(settings.mongodb_url)
    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=[User, Project, MistakeQuestion],
    )
    print(f"Connected to MongoDB: {settings.mongodb_db_name}")

    # 初始化存储服务
    get_storage_service()
    print("Storage service initialized")

    yield

    # 关闭时
    print("Shutting down application...")
    client.close()


app = FastAPI(
    title="Scratch Backend API",
    description="Scratch 私有化部署后端服务",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router, prefix="/api/auth", tags=["认证"])
app.include_router(projects_router, prefix="/api/projects", tags=["项目"])
app.include_router(share_router, prefix="/api/share", tags=["分享"])
app.include_router(mistakes_router, prefix="/api/mistakes", tags=["错题本"])
app.include_router(admin_router, prefix="/api/admin", tags=["管理后台"])


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Scratch Backend API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}
