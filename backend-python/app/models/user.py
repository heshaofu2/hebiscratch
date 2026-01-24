from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class User(Document):
    """用户模型"""

    username: Indexed(str, unique=True)
    password_hash: str
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        use_state_management = True

    def to_response(self) -> dict:
        """转换为响应格式（不包含密码）"""
        return {
            "_id": str(self.id),
            "username": self.username,
            "avatar": self.avatar,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
