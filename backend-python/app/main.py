from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from app.api import api_router
from app.core.config import get_settings
from app.core.security import hash_password
from app.models import User, Project
from app.services import get_storage_service

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
        document_models=[User, Project],
    )
    print(f"Connected to MongoDB: {settings.mongodb_db_name}")

    # 初始化存储服务
    get_storage_service()
    print("Storage service initialized")

    # 初始化默认管理员账号
    admin_user = await User.find_one(User.username == "admin")
    if admin_user is None:
        admin_user = User(
            username="admin",
            password_hash=hash_password("admin"),
            role="admin",
            is_active=True,
        )
        await admin_user.insert()
        print("Default admin user created: admin / admin")
    elif admin_user.role != "admin":
        # 升级旧的 admin 用户为管理员
        admin_user.role = "admin"
        admin_user.is_active = True
        await admin_user.save()
        print("Admin user upgraded to admin role")
    else:
        print("Admin user already exists")

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
app.include_router(api_router, prefix="/api")


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
