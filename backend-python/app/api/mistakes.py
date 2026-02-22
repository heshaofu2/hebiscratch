from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, status

from app.models import MistakeEntry
from app.schemas.mistake import (
    MistakeCreate,
    MistakeUpdate,
    MistakeBatchCreate,
    MistakeResponse,
    MistakeListResponse,
    ImageRecognitionResponse,
    MistakeStats,
)
from app.services.mistake import (
    store_mistake_image,
    recognize_questions_from_image,
    get_mistake_image_url,
    delete_mistake_image,
)

from .deps import CurrentUser, OwnedMistake

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


@router.get("/subjects")
async def list_subjects(current_user: CurrentUser):
    """获取当前用户已使用的科目列表"""
    mistakes = await MistakeEntry.find(
        MistakeEntry.owner.id == current_user.id,
    ).to_list()
    subjects = sorted({m.subject for m in mistakes})
    return subjects


@router.get("/stats", response_model=MistakeStats)
async def get_stats(current_user: CurrentUser):
    """获取错题统计数据"""
    mistakes = await MistakeEntry.find(
        MistakeEntry.owner.id == current_user.id,
    ).to_list()

    total = len(mistakes)
    mastered = sum(1 for m in mistakes if m.is_mastered)
    subjects: dict[str, int] = {}
    for m in mistakes:
        subjects[m.subject] = subjects.get(m.subject, 0) + 1

    return MistakeStats(
        total=total,
        mastered=mastered,
        unmastered=total - mastered,
        subjects=subjects,
    )


@router.get("", response_model=list[MistakeListResponse])
async def list_mistakes(
    current_user: CurrentUser,
    subject: Optional[str] = None,
    mastered: Optional[bool] = None,
    search: Optional[str] = None,
):
    """获取当前用户的错题列表，支持筛选"""
    query = {"owner.$id": current_user.id}

    if subject:
        query["subject"] = subject
    if mastered is not None:
        query["is_mastered"] = mastered
    if search:
        query["question"] = {"$regex": search, "$options": "i"}

    mistakes = await MistakeEntry.find_many(
        query
    ).sort(-MistakeEntry.created_at).to_list()

    return [m.to_list_response() for m in mistakes]


@router.post("", response_model=MistakeResponse, status_code=status.HTTP_201_CREATED)
async def create_mistake(data: MistakeCreate, current_user: CurrentUser):
    """手动创建单个错题"""
    mistake = MistakeEntry(
        owner=current_user,
        subject=data.subject,
        question=data.question,
        wrong_answer=data.wrongAnswer,
        correct_answer=data.correctAnswer,
        analysis=data.analysis,
        tags=data.tags,
        source="manual",
    )
    await mistake.insert()
    return mistake.to_response()


@router.post("/batch", response_model=list[MistakeResponse], status_code=status.HTTP_201_CREATED)
async def create_mistakes_batch(data: MistakeBatchCreate, current_user: CurrentUser):
    """批量创建错题（图片识别确认后提交）"""
    results = []
    for item in data.items:
        mistake = MistakeEntry(
            owner=current_user,
            subject=item.subject,
            question=item.question,
            wrong_answer=item.wrongAnswer,
            correct_answer=item.correctAnswer,
            analysis=item.analysis,
            source="image",
            source_image_path=item.sourceImagePath or data.sourceImagePath,
        )
        await mistake.insert()
        results.append(mistake.to_response())
    return results


@router.post("/recognize", response_model=ImageRecognitionResponse)
async def recognize_image(
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    """上传图片进行 AI 识别"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的图片格式，仅支持: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    image_data = await file.read()

    # 存储原始图片到 MinIO
    image_path = store_mistake_image(image_data, str(current_user.id), file.content_type)

    # 调用 LLM 识别
    try:
        questions = await recognize_questions_from_image(image_data, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 识别失败: {str(e)}",
        )

    return ImageRecognitionResponse(imagePath=image_path, questions=questions)


@router.get("/{mistake_id}", response_model=MistakeResponse)
async def get_mistake(mistake: OwnedMistake):
    """获取错题详情"""
    response = mistake.to_response()
    # 如有图片，附带预签名 URL
    if mistake.source_image_path:
        url = get_mistake_image_url(mistake.source_image_path)
        if url:
            response["sourceImageUrl"] = url
    return response


@router.put("/{mistake_id}", response_model=MistakeResponse)
async def update_mistake(data: MistakeUpdate, mistake: OwnedMistake):
    """更新错题"""
    update_data = data.model_dump(exclude_unset=True)

    # camelCase → snake_case 字段映射
    field_map = {
        "wrongAnswer": "wrong_answer",
        "correctAnswer": "correct_answer",
        "isMastered": "is_mastered",
    }
    for camel, snake in field_map.items():
        if camel in update_data:
            update_data[snake] = update_data.pop(camel)

    for field, value in update_data.items():
        setattr(mistake, field, value)

    mistake.updated_at = datetime.now(timezone.utc)
    await mistake.save()
    return mistake.to_response()


@router.delete("/{mistake_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mistake(mistake: OwnedMistake):
    """删除错题（同时清理 MinIO 图片）"""
    if mistake.source_image_path:
        delete_mistake_image(mistake.source_image_path)
    await mistake.delete()


@router.post("/{mistake_id}/review", response_model=MistakeResponse)
async def review_mistake(mistake: OwnedMistake):
    """增加复习次数"""
    mistake.review_count += 1
    mistake.updated_at = datetime.now(timezone.utc)
    await mistake.save()
    return mistake.to_response()
