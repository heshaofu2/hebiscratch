from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, status
from fastapi.responses import Response as RawResponse

from app.models import MistakeEntry
from app.schemas.mistake import (
    MistakeCreate,
    MistakeUpdate,
    MistakeBatchCreate,
    MistakeBatchDeleteRequest,
    MistakeBatchUpdateRequest,
    MistakeResponse,
    MistakeListResponse,
    ImageRecognitionResponse,
    MistakeStats,
)
from app.services.mistake import (
    store_mistake_image,
    recognize_questions_from_image,
    crop_and_store_question_image,
    get_mistake_image_url,
    delete_mistake_image,
)
from app.services.storage import get_storage_service

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
    subject: Optional[list[str]] = Query(None),
    mastered: Optional[bool] = None,
    search: Optional[str] = None,
):
    """获取当前用户的错题列表，支持筛选"""
    query = {"owner.$id": current_user.id}

    if subject:
        query["subject"] = subject[0] if len(subject) == 1 else {"$in": subject}
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
        knowledge_points=data.knowledgePoints,
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
            cropped_image_path=item.croppedImagePath,
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
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 识别失败: {str(e)}",
        )

    # 根据 bbox 裁剪每道题的图片区域
    user_id = str(current_user.id)
    for q in questions:
        bbox = q.get("bbox") if isinstance(q, dict) else None
        if not bbox:
            print(f"[CROP] question {q.get('index')}: no bbox, skipping")
            continue
        try:
            cropped_path = crop_and_store_question_image(image_data, bbox, user_id)
            q["croppedImagePath"] = cropped_path
            print(f"[CROP] question {q.get('index')}: OK → {cropped_path}")
        except Exception as e:
            print(f"[CROP] question {q.get('index')}: FAILED → {e}")
            import traceback
            traceback.print_exc()

    return ImageRecognitionResponse(imagePath=image_path, questions=questions)


@router.post("/batch-delete")
async def batch_delete_mistakes(
    data: MistakeBatchDeleteRequest,
    current_user: CurrentUser,
):
    """批量删除错题（验证所有权 + 清理 MinIO 图片）"""
    from bson import ObjectId

    deleted = 0
    cropped_paths: list[str] = []
    source_paths: list[str] = []
    ids_to_delete: list[ObjectId] = []

    # 第一遍：验证所有权，收集图片路径
    for raw_id in data.ids:
        try:
            oid = ObjectId(raw_id)
        except Exception:
            continue
        mistake = await MistakeEntry.get(oid)
        if not mistake or mistake.owner.ref.id != current_user.id:
            continue
        if mistake.cropped_image_path:
            cropped_paths.append(mistake.cropped_image_path)
        if mistake.source_image_path:
            source_paths.append(mistake.source_image_path)
        ids_to_delete.append(oid)

    # 批量删除文档
    for oid in ids_to_delete:
        mistake = await MistakeEntry.get(oid)
        if mistake:
            await mistake.delete()
            deleted += 1

    # 清理裁剪图（一对一，直接删除）
    for path in cropped_paths:
        delete_mistake_image(path)

    # 清理原图（仅当无其他引用时）
    for path in set(source_paths):
        sibling_count = await MistakeEntry.find(
            MistakeEntry.source_image_path == path,
        ).count()
        if sibling_count == 0:
            delete_mistake_image(path)

    return {"deleted": deleted}


@router.post("/batch-update")
async def batch_update_mistakes(
    data: MistakeBatchUpdateRequest,
    current_user: CurrentUser,
):
    """批量更新错题"""
    from bson import ObjectId

    update_data = data.update.model_dump(exclude_unset=True)
    field_map = {
        "wrongAnswer": "wrong_answer",
        "correctAnswer": "correct_answer",
        "isMastered": "is_mastered",
        "knowledgePoints": "knowledge_points",
    }
    for camel, snake in field_map.items():
        if camel in update_data:
            update_data[snake] = update_data.pop(camel)

    updated = 0
    for raw_id in data.ids:
        try:
            oid = ObjectId(raw_id)
        except Exception:
            continue
        mistake = await MistakeEntry.get(oid)
        if not mistake or mistake.owner.ref.id != current_user.id:
            continue
        for field, value in update_data.items():
            setattr(mistake, field, value)
        mistake.updated_at = datetime.now(timezone.utc)
        await mistake.save()
        updated += 1

    return {"updated": updated}


@router.get("/{mistake_id}", response_model=MistakeResponse)
async def get_mistake(mistake: OwnedMistake):
    """获取错题详情"""
    response = mistake.to_response()
    # 如有裁剪图片，附带预签名 URL
    if mistake.cropped_image_path:
        url = get_mistake_image_url(mistake.cropped_image_path)
        if url:
            response["croppedImageUrl"] = url
    # 如有原始图片，附带预签名 URL
    if mistake.source_image_path:
        url = get_mistake_image_url(mistake.source_image_path)
        if url:
            response["sourceImageUrl"] = url
    return response


def _image_media_type(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower()
    return "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"


@router.get("/{mistake_id}/image")
async def get_mistake_image(mistake: OwnedMistake):
    """获取题目图片（优先裁剪图，回退原图）"""
    path = mistake.cropped_image_path or mistake.source_image_path
    if not path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="无图片")
    data = get_storage_service().download_file(path)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在")
    return RawResponse(content=data, media_type=_image_media_type(path))


@router.get("/{mistake_id}/source-image")
async def get_mistake_source_image(mistake: OwnedMistake):
    """获取原始完整图片"""
    if not mistake.source_image_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="无原始图片")
    data = get_storage_service().download_file(mistake.source_image_path)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在")
    return RawResponse(content=data, media_type=_image_media_type(mistake.source_image_path))


@router.put("/{mistake_id}", response_model=MistakeResponse)
async def update_mistake(data: MistakeUpdate, mistake: OwnedMistake):
    """更新错题"""
    update_data = data.model_dump(exclude_unset=True)

    # camelCase → snake_case 字段映射
    field_map = {
        "wrongAnswer": "wrong_answer",
        "correctAnswer": "correct_answer",
        "isMastered": "is_mastered",
        "knowledgePoints": "knowledge_points",
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
    # 裁剪图片是一对一关系，直接删除
    if mistake.cropped_image_path:
        delete_mistake_image(mistake.cropped_image_path)
    # 原图可能被多道题共享，仅当无其他引用时才删除
    if mistake.source_image_path:
        sibling_count = await MistakeEntry.find(
            MistakeEntry.source_image_path == mistake.source_image_path,
            MistakeEntry.id != mistake.id,
        ).count()
        if sibling_count == 0:
            delete_mistake_image(mistake.source_image_path)
    await mistake.delete()


@router.post("/{mistake_id}/review", response_model=MistakeResponse)
async def review_mistake(mistake: OwnedMistake):
    """增加复习次数"""
    mistake.review_count += 1
    mistake.updated_at = datetime.now(timezone.utc)
    await mistake.save()
    return mistake.to_response()
