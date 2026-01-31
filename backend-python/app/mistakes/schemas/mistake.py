from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MistakeCreate(BaseModel):
    """创建错题请求"""

    title: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., pattern="^(math|chinese|english|physics|chemistry|biology|other)$")
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    questionContent: str = ""
    answerContent: str = ""
    myAnswer: str = ""
    analysis: str = ""
    tags: list[str] = Field(default_factory=list)
    source: str = ""
    notes: str = ""


class MistakeUpdate(BaseModel):
    """更新错题请求"""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    subject: Optional[str] = Field(None, pattern="^(math|chinese|english|physics|chemistry|biology|other)$")
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    questionContent: Optional[str] = None
    answerContent: Optional[str] = None
    myAnswer: Optional[str] = None
    analysis: Optional[str] = None
    tags: Optional[list[str]] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    isMastered: Optional[bool] = None


class MistakeResponse(BaseModel):
    """错题响应"""

    id: str = Field(..., alias="_id")
    title: str
    subject: str
    difficulty: str
    imagePaths: list[str]
    questionContent: str
    answerContent: str
    myAnswer: str
    analysis: str
    tags: list[str]
    source: str
    reviewCount: int
    isMastered: bool
    lastReviewAt: Optional[datetime] = None
    notes: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class MistakeListResponse(BaseModel):
    """错题列表响应"""

    id: str = Field(..., alias="_id")
    title: str
    subject: str
    difficulty: str
    tags: list[str]
    reviewCount: int
    isMastered: bool
    hasImages: bool
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class MistakeStatsResponse(BaseModel):
    """错题统计响应"""

    total: int
    mastered: int
    needReview: int
    bySubject: dict[str, int]


class AIExtractedQuestion(BaseModel):
    """单个识别出的错题"""

    questionNumber: str = ""
    questionContent: str
    studentAnswer: str = ""
    correctAnswer: str = ""
    analysis: str = ""
    errorType: str = "other"
    suggestedTags: list[str] = Field(default_factory=list)
    suggestedSubject: str = "other"
    confidence: str = "medium"


class AIExtractResponse(BaseModel):
    """AI 识别响应（支持多题，单题时 questions 长度为 1）"""

    questions: list[AIExtractedQuestion]
    totalFound: int
    imageNote: str = ""
