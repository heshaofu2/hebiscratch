from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Link
from pydantic import Field

from .user import User


class MistakeEntry(Document):
    """错题模型"""

    owner: Link[User]
    subject: str  # 科目
    question: str  # 题目内容
    wrong_answer: str = ""  # 错误答案
    correct_answer: str = ""  # 正确答案
    analysis: Optional[str] = None  # 解析
    source: str = "manual"  # "manual" | "image"
    source_image_path: Optional[str] = None  # MinIO 图片路径
    tags: list[str] = Field(default_factory=list)
    is_mastered: bool = False
    review_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "mistakes"
        use_state_management = True

    def to_response(self) -> dict:
        """转换为详情响应格式"""
        return {
            "_id": str(self.id),
            "subject": self.subject,
            "question": self.question,
            "wrongAnswer": self.wrong_answer,
            "correctAnswer": self.correct_answer,
            "analysis": self.analysis,
            "source": self.source,
            "sourceImagePath": self.source_image_path,
            "tags": self.tags,
            "isMastered": self.is_mastered,
            "reviewCount": self.review_count,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }

    def to_list_response(self) -> dict:
        """转换为列表响应格式"""
        return {
            "_id": str(self.id),
            "subject": self.subject,
            "question": self.question[:100] + ("..." if len(self.question) > 100 else ""),
            "isMastered": self.is_mastered,
            "reviewCount": self.review_count,
            "source": self.source,
            "tags": self.tags,
            "createdAt": self.created_at.isoformat(),
        }
