from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── 请求模型 ──────────────────────────────────────

class QuestionCreate(BaseModel):
    """手动创建题目"""
    subject: str
    question: str
    wrongAnswer: str = ""
    correctAnswer: str = ""
    analysis: Optional[str] = None
    knowledgePoints: list[str] = Field(default_factory=list)


class QuestionUpdate(BaseModel):
    """更新题目"""
    subject: Optional[str] = None
    question: Optional[str] = None
    wrongAnswer: Optional[str] = None
    correctAnswer: Optional[str] = None
    analysis: Optional[str] = None
    knowledgePoints: Optional[list[str]] = None
    isMastered: Optional[bool] = None


class QuestionBatchDeleteRequest(BaseModel):
    """批量删除题目"""
    ids: list[str]


class QuestionBatchUpdateRequest(BaseModel):
    """批量更新题目"""
    ids: list[str]
    update: QuestionUpdate


class QuestionBatchItem(BaseModel):
    """批量创建中的单条题目（图片识别确认后提交）"""
    subject: str
    question: str
    wrongAnswer: str = ""
    correctAnswer: str = ""
    analysis: Optional[str] = None
    sourceImagePath: Optional[str] = None
    croppedImagePath: Optional[str] = None


class QuestionBatchCreate(BaseModel):
    """批量创建题目"""
    items: list[QuestionBatchItem]
    sourceImagePath: Optional[str] = None


# ── 响应模型 ──────────────────────────────────────

class QuestionResponse(BaseModel):
    """题目详情响应"""
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
    knowledgePoints: list[str]
    isMastered: bool
    reviewCount: int
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class QuestionListResponse(BaseModel):
    """题目列表项响应"""
    id: str = Field(..., alias="_id")
    subject: str
    question: str  # 已截断
    isMastered: bool
    reviewCount: int
    source: str
    knowledgePoints: list[str]
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

class QuestionStats(BaseModel):
    """题目统计"""
    total: int
    mastered: int
    unmastered: int
    subjects: dict[str, int]  # 各科目计数
