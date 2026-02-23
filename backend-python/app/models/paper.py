from datetime import datetime, timezone
from typing import Optional

from beanie import Document, Link, PydanticObjectId
from pydantic import Field

from .user import User


class Paper(Document):
    """试卷模型"""

    owner: Link[User]
    title: str  # 试卷标题
    description: str = ""  # 备注
    subject: Optional[str] = None  # 科目（筛选用）
    questions: list[PydanticObjectId] = Field(default_factory=list)  # 有序的错题 ID 列表
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "papers"
        use_state_management = True

    def to_response(self, expanded_questions: list[dict] | None = None) -> dict:
        """转换为详情响应格式

        Args:
            expanded_questions: 展开后的题目列表，若为 None 则只返回 ID 列表
        """
        result = {
            "_id": str(self.id),
            "title": self.title,
            "description": self.description,
            "subject": self.subject,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
        if expanded_questions is not None:
            result["questions"] = expanded_questions
        else:
            result["questions"] = [str(q) for q in self.questions]
        return result

    def to_list_response(self) -> dict:
        """转换为列表响应格式"""
        return {
            "_id": str(self.id),
            "title": self.title,
            "description": self.description,
            "subject": self.subject,
            "questionCount": len(self.questions),
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
