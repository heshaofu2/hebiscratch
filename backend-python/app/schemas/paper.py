from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── 请求模型 ──────────────────────────────────────

class PaperCreate(BaseModel):
    """创建试卷"""
    title: str
    description: str = ""
    subject: Optional[str] = None
    questions: list[str] = Field(default_factory=list)  # 错题 ID 列表


class PaperUpdate(BaseModel):
    """更新试卷"""
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    questions: Optional[list[str]] = None


class PaperAddQuestions(BaseModel):
    """追加题目到试卷"""
    questions: list[str]  # 要追加的错题 ID


# ── 响应模型 ──────────────────────────────────────

class PaperListResponse(BaseModel):
    """试卷列表项响应"""
    id: str = Field(..., alias="_id")
    title: str
    description: str
    subject: Optional[str] = None
    questionCount: int
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class PaperQuestionItem(BaseModel):
    """试卷中的题目（展开后）"""
    id: str = Field(..., alias="_id")
    subject: str
    question: str
    wrongAnswer: str = ""
    correctAnswer: str = ""
    analysis: Optional[str] = None
    source: str = "manual"
    croppedImagePath: Optional[str] = None
    knowledgePoints: list[str] = Field(default_factory=list)
    isMastered: bool = False

    class Config:
        populate_by_name = True


class PaperResponse(BaseModel):
    """试卷详情响应"""
    id: str = Field(..., alias="_id")
    title: str
    description: str
    subject: Optional[str] = None
    questions: list[PaperQuestionItem | str]  # 展开的题目或 ID
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True
