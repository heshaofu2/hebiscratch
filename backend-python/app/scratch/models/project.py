from datetime import datetime, timezone
from typing import Optional
import secrets

from beanie import Document, Indexed, Link
from pydantic import Field

from app.common.models import User


class Project(Document):
    """项目模型

    项目数据统一存储到 MinIO，MongoDB 只保存元数据。
    """

    title: str = "未命名项目"
    description: Optional[str] = None
    owner: Link[User]

    # MinIO 存储路径
    storage_path: Optional[str] = None

    thumbnail: Optional[str] = None
    is_public: bool = False
    share_token: Optional[Indexed(str, unique=True)] = None
    view_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "projects"
        use_state_management = True

    def generate_share_token(self) -> str:
        """生成分享 token"""
        self.share_token = secrets.token_urlsafe(16)
        self.is_public = True
        return self.share_token

    def revoke_share_token(self) -> None:
        """撤销分享 token"""
        self.share_token = None
        self.is_public = False

    def get_storage_object_name(self) -> str:
        """获取 MinIO 存储对象名称"""
        return f"projects/{self.id}/project.sb3"

    def to_response(self) -> dict:
        """转换为响应格式"""
        return {
            "_id": str(self.id),
            "title": self.title,
            "description": self.description,
            "owner": str(self.owner.id) if self.owner else None,
            "storagePath": self.storage_path,
            "thumbnail": self.thumbnail,
            "isPublic": self.is_public,
            "shareToken": self.share_token,
            "viewCount": self.view_count,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }

    def to_list_response(self) -> dict:
        """转换为列表响应格式（不包含项目数据）"""
        return {
            "_id": str(self.id),
            "title": self.title,
            "description": self.description,
            "thumbnail": self.thumbnail,
            "isPublic": self.is_public,
            "viewCount": self.view_count,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
