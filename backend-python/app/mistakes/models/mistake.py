from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Indexed, Link
from pydantic import Field
from pymongo import IndexModel

from app.common.models import User


class MistakeQuestion(Document):
    """错题模型"""

    owner: Link[User]
    title: str
    subject: str  # math/chinese/english/physics/chemistry/biology/other
    difficulty: str = "medium"  # easy/medium/hard

    # 内容
    image_paths: list[str] = Field(default_factory=list)  # MinIO 图片路径列表
    question_content: str = ""  # 题目内容 (AI 提取或手动输入)
    answer_content: str = ""  # 正确答案
    my_answer: str = ""  # 我的错误答案
    analysis: str = ""  # 解析

    # 分类
    tags: list[str] = Field(default_factory=list)  # 知识点标签
    source: str = ""  # 来源 (课本/试卷等)

    # 复习
    review_count: int = 0  # 复习次数
    is_mastered: bool = False  # 是否已掌握
    last_review_at: Optional[datetime] = None  # 上次复习时间

    # 笔记
    notes: str = ""  # 个人笔记

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "mistakes"
        indexes = [
            IndexModel([("owner", 1), ("subject", 1)]),
            IndexModel([("owner", 1), ("created_at", -1)]),
            IndexModel([("owner", 1), ("tags", 1)]),
            IndexModel([("owner", 1), ("is_mastered", 1)]),
        ]

    def get_image_object_name(self, index: int) -> str:
        """获取图片的 MinIO 存储路径"""
        return f"mistakes/{self.owner.id}/{self.id}/image_{index}.jpg"

    def to_response(self) -> dict:
        """转换为响应格式"""
        return {
            "_id": str(self.id),
            "title": self.title,
            "subject": self.subject,
            "difficulty": self.difficulty,
            "imagePaths": self.image_paths,
            "questionContent": self.question_content,
            "answerContent": self.answer_content,
            "myAnswer": self.my_answer,
            "analysis": self.analysis,
            "tags": self.tags,
            "source": self.source,
            "reviewCount": self.review_count,
            "isMastered": self.is_mastered,
            "lastReviewAt": self.last_review_at.isoformat() if self.last_review_at else None,
            "notes": self.notes,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }

    def to_list_response(self) -> dict:
        """转换为列表响应格式"""
        return {
            "_id": str(self.id),
            "title": self.title,
            "subject": self.subject,
            "difficulty": self.difficulty,
            "tags": self.tags,
            "reviewCount": self.review_count,
            "isMastered": self.is_mastered,
            "hasImages": len(self.image_paths) > 0,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
