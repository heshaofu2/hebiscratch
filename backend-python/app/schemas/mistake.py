from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── 请求模型 ──────────────────────────────────────

class MistakeCreate(BaseModel):
    """手动创建错题"""
    subject: str
    question: str
    wrongAnswer: str = ""
    correctAnswer: str = ""
    analysis: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class MistakeUpdate(BaseModel):
    """更新错题"""
    subject: Optional[str] = None
    question: Optional[str] = None
    wrongAnswer: Optional[str] = None
    correctAnswer: Optional[str] = None
    analysis: Optional[str] = None
    tags: Optional[list[str]] = None
    isMastered: Optional[bool] = None


class MistakeBatchDeleteRequest(BaseModel):
    """批量删除错题"""
    ids: list[str]


class MistakeBatchUpdateRequest(BaseModel):
    """批量更新错题"""
    ids: list[str]
    update: MistakeUpdate


class MistakeBatchItem(BaseModel):
    """批量创建中的单条错题（图片识别确认后提交）"""
    subject: str
    question: str
    wrongAnswer: str = ""
    correctAnswer: str = ""
    analysis: Optional[str] = None
    sourceImagePath: Optional[str] = None
    croppedImagePath: Optional[str] = None


class MistakeBatchCreate(BaseModel):
    """批量创建错题"""
    items: list[MistakeBatchItem]
    sourceImagePath: Optional[str] = None


# ── 响应模型 ──────────────────────────────────────

class MistakeResponse(BaseModel):
    """错题详情响应"""
    id: str = Field(..., alias="_id")
    subject: str
    question: str
    wrongAnswer: str
    correctAnswer: str
    analysis: Optional[str] = None
    source: str
    sourceImagePath: Optional[str] = None
    sourceImageUrl: Optional[str] = None
    croppedImagePath: Optional[str] = None
    croppedImageUrl: Optional[str] = None
    tags: list[str]
    isMastered: bool
    reviewCount: int
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class MistakeListResponse(BaseModel):
    """错题列表项响应"""
    id: str = Field(..., alias="_id")
    subject: str
    question: str  # 已截断
    isMastered: bool
    reviewCount: int
    source: str
    tags: list[str]
    createdAt: datetime

    class Config:
        populate_by_name = True


# ── AI 识别相关 ───────────────────────────────────

class BBox(BaseModel):
    """题目在图片中的归一化位置坐标"""
    x: float
    y: float
    width: float
    height: float


class RecognizedQuestion(BaseModel):
    """AI 识别的单道题目"""
    index: int
    question: str
    wrongAnswer: str = ""
    correctAnswer: str = ""
    analysis: str = ""
    subjectGuess: str = ""
    bbox: BBox
    croppedImagePath: Optional[str] = None


class ImageRecognitionResponse(BaseModel):
    """图片识别整体响应"""
    imagePath: str
    questions: list[RecognizedQuestion]


# ── 统计相关 ──────────────────────────────────────

class MistakeStats(BaseModel):
    """错题统计"""
    total: int
    mastered: int
    unmastered: int
    subjects: dict[str, int]  # 各科目计数
