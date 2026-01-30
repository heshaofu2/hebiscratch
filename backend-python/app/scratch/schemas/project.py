from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """创建项目请求"""

    title: str = "未命名项目"
    description: Optional[str] = None
    projectJson: Optional[dict[str, Any]] = None


class ProjectUpdate(BaseModel):
    """更新项目请求"""

    title: Optional[str] = None
    description: Optional[str] = None
    projectJson: Optional[dict[str, Any]] = None
    thumbnail: Optional[str] = None


class ProjectResponse(BaseModel):
    """项目响应"""

    id: str = Field(..., alias="_id")
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    projectJson: Optional[dict[str, Any]] = None  # 从 MinIO 动态加载
    storagePath: Optional[str] = None
    thumbnail: Optional[str] = None
    isPublic: bool = False
    shareToken: Optional[str] = None
    viewCount: int = 0
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class ProjectListResponse(BaseModel):
    """项目列表响应"""

    id: str = Field(..., alias="_id")
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    isPublic: bool = False
    viewCount: int = 0
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class ShareResponse(BaseModel):
    """分享响应"""

    shareToken: str
    shareUrl: str
