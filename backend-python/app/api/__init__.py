from fastapi import APIRouter

from .auth import router as auth_router
from .projects import router as projects_router
from .share import router as share_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["认证"])
api_router.include_router(projects_router, prefix="/projects", tags=["项目"])
api_router.include_router(share_router, prefix="/share", tags=["分享"])
