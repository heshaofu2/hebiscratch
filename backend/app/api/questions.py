from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, status
from fastapi.responses import Response as RawResponse

from app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionBatchCreate,
    QuestionBatchDeleteRequest,
    QuestionBatchUpdateRequest,
    QuestionResponse,
    QuestionListResponse,
    ImageRecognitionResponse,
    QuestionStats,
)
from app.services.question import (
    store_question_image,
    recognize_questions_from_image,
    crop_and_store_question_image,
    get_question_image_url,
    delete_question_image,
)
from app.services.storage import get_storage_service

from .deps import CurrentUser, QuestionRepo, OwnedQuestion

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


@router.get("/subjects")
async def list_subjects(current_user: CurrentUser, repo: QuestionRepo):
    """获取当前用户已使用的科目列表"""
    return await repo.get_subjects(str(current_user.id))


@router.get("/stats", response_model=QuestionStats)
async def get_stats(current_user: CurrentUser, repo: QuestionRepo):
    """获取题目统计数据"""
    stats = await repo.get_stats(str(current_user.id))
    return QuestionStats(**stats)


@router.get("", response_model=list[QuestionListResponse])
async def list_questions(
    current_user: CurrentUser,
    repo: QuestionRepo,
    subject: Optional[list[str]] = Query(None),
    mastered: Optional[bool] = None,
    search: Optional[str] = None,
):
    """获取当前用户的题目列表，支持筛选"""
    questions = await repo.list_by_owner(
        str(current_user.id),
        subjects=subject,
        mastered=mastered,
        search=search,
    )
    return [q.to_list_response() for q in questions]


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    data: QuestionCreate, current_user: CurrentUser, repo: QuestionRepo
):
    """手动创建单个题目"""
    question = await repo.create(
        current_user,
        subject=data.subject,
        question=data.question,
        wrong_answer=data.wrongAnswer,
        correct_answer=data.correctAnswer,
        analysis=data.analysis,
        knowledge_points=data.knowledgePoints,
        source="manual",
    )
    return question.to_response()


@router.post("/batch", response_model=list[QuestionResponse], status_code=status.HTTP_201_CREATED)
async def create_questions_batch(
    data: QuestionBatchCreate, current_user: CurrentUser, repo: QuestionRepo
):
    """批量创建题目（图片识别确认后提交）"""
    items = [
        {
            "subject": item.subject,
            "question": item.question,
            "wrong_answer": item.wrongAnswer,
            "correct_answer": item.correctAnswer,
            "analysis": item.analysis,
            "source": "image",
            "source_image_path": item.sourceImagePath or data.sourceImagePath,
            "cropped_image_path": item.croppedImagePath,
        }
        for item in data.items
    ]
    results = await repo.create_batch(current_user, items)
    return [q.to_response() for q in results]


@router.post("/recognize", response_model=ImageRecognitionResponse)
async def recognize_image(
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    """上传图片进行 AI 识别"""
    # 配额检查
    if (
        current_user.recognize_limit is not None
        and current_user.recognize_count >= current_user.recognize_limit
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"已达到图片识别上限（{current_user.recognize_limit} 次），请联系管理员提升额度",
        )

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的图片格式，仅支持: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    image_data = await file.read()

    # 存储原始图片到 MinIO
    image_path = store_question_image(image_data, str(current_user.id), file.content_type)

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

    # LLM 识别成功后才递增配额计数器
    current_user.recognize_count += 1
    current_user.updated_at = datetime.now(timezone.utc)
    await current_user.save()

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
async def batch_delete_questions(
    data: QuestionBatchDeleteRequest,
    current_user: CurrentUser,
    repo: QuestionRepo,
):
    """批量删除题目（验证所有权 + 清理 MinIO 图片）"""
    questions = await repo.get_owned_by_ids(data.ids, str(current_user.id))

    cropped_paths: list[str] = []
    source_paths: list[str] = []
    for question in questions:
        if question.cropped_image_path:
            cropped_paths.append(question.cropped_image_path)
        if question.source_image_path:
            source_paths.append(question.source_image_path)

    deleted = await repo.delete_many(questions)

    # 清理裁剪图（一对一，直接删除）
    for path in cropped_paths:
        delete_question_image(path)

    # 清理原图（仅当无其他引用时）
    for path in set(source_paths):
        sibling_count = await repo.count_by_source_image(path)
        if sibling_count == 0:
            delete_question_image(path)

    return {"deleted": deleted}


@router.post("/batch-update")
async def batch_update_questions(
    data: QuestionBatchUpdateRequest,
    current_user: CurrentUser,
    repo: QuestionRepo,
):
    """批量更新题目"""
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

    questions = await repo.get_owned_by_ids(data.ids, str(current_user.id))
    updated = 0
    for question in questions:
        for field, value in update_data.items():
            setattr(question, field, value)
        question.updated_at = datetime.now(timezone.utc)
        await repo.save(question)
        updated += 1

    return {"updated": updated}


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(question: OwnedQuestion):
    """获取题目详情"""
    response = question.to_response()
    # 如有裁剪图片，附带预签名 URL
    if question.cropped_image_path:
        url = get_question_image_url(question.cropped_image_path)
        if url:
            response["croppedImageUrl"] = url
    # 如有原始图片，附带预签名 URL
    if question.source_image_path:
        url = get_question_image_url(question.source_image_path)
        if url:
            response["sourceImageUrl"] = url
    return response


def _image_media_type(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower()
    return "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"


@router.get("/{question_id}/image")
async def get_question_image(question: OwnedQuestion):
    """获取题目图片（优先裁剪图，回退原图）"""
    path = question.cropped_image_path or question.source_image_path
    if not path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="无图片")
    data = get_storage_service().download_file(path)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在")
    return RawResponse(content=data, media_type=_image_media_type(path))


@router.get("/{question_id}/source-image")
async def get_question_source_image(question: OwnedQuestion):
    """获取原始完整图片"""
    if not question.source_image_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="无原始图片")
    data = get_storage_service().download_file(question.source_image_path)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在")
    return RawResponse(content=data, media_type=_image_media_type(question.source_image_path))


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    data: QuestionUpdate, question: OwnedQuestion, repo: QuestionRepo
):
    """更新题目"""
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
        setattr(question, field, value)

    question.updated_at = datetime.now(timezone.utc)
    await repo.save(question)
    return question.to_response()


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(question: OwnedQuestion, repo: QuestionRepo):
    """删除题目（同时清理 MinIO 图片）"""
    # 裁剪图片是一对一关系，直接删除
    if question.cropped_image_path:
        delete_question_image(question.cropped_image_path)
    # 原图可能被多道题共享，仅当无其他引用时才删除
    if question.source_image_path:
        sibling_count = await repo.count_by_source_image(
            question.source_image_path, exclude_id=str(question.id)
        )
        if sibling_count == 0:
            delete_question_image(question.source_image_path)
    await repo.delete(question)


@router.post("/{question_id}/review", response_model=QuestionResponse)
async def review_question(question: OwnedQuestion, repo: QuestionRepo):
    """增加复习次数"""
    question.review_count += 1
    question.updated_at = datetime.now(timezone.utc)
    await repo.save(question)
    return question.to_response()
