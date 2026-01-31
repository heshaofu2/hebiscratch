from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Query
from fastapi.responses import Response, StreamingResponse
import io

from app.common.api import CurrentUser
from app.mistakes.models import MistakeQuestion
from app.mistakes.schemas import (
    MistakeCreate,
    MistakeUpdate,
    MistakeResponse,
    MistakeListResponse,
    MistakeStatsResponse,
    AIExtractResponse,
)
from app.mistakes.services import (
    save_mistake_image,
    get_mistake_image,
    delete_mistake_images,
    extract_wrong_questions,
    generate_mistakes_pdf,
)

from .deps import OwnedMistake

router = APIRouter()


@router.get("", response_model=List[MistakeListResponse])
async def list_mistakes(
    current_user: CurrentUser,
    subject: Optional[str] = Query(None, pattern="^(math|chinese|english|physics|chemistry|biology|other)$"),
    tag: Optional[str] = None,
    is_mastered: Optional[bool] = None,
):
    """获取错题列表，支持筛选"""
    query = {"owner.$id": current_user.id}

    if subject:
        query["subject"] = subject
    if tag:
        query["tags"] = tag
    if is_mastered is not None:
        query["is_mastered"] = is_mastered

    mistakes = await MistakeQuestion.find(query).sort(-MistakeQuestion.created_at).to_list()

    return [mistake.to_list_response() for mistake in mistakes]


@router.post("", response_model=MistakeResponse, status_code=status.HTTP_201_CREATED)
async def create_mistake(data: MistakeCreate, current_user: CurrentUser):
    """创建错题"""
    mistake = MistakeQuestion(
        owner=current_user,
        title=data.title,
        subject=data.subject,
        difficulty=data.difficulty,
        question_content=data.questionContent,
        answer_content=data.answerContent,
        my_answer=data.myAnswer,
        analysis=data.analysis,
        tags=data.tags,
        source=data.source,
        notes=data.notes,
    )
    await mistake.insert()

    return mistake.to_response()


@router.get("/stats", response_model=MistakeStatsResponse)
async def get_stats(current_user: CurrentUser):
    """获取错题统计"""
    # 总数
    total = await MistakeQuestion.find(
        MistakeQuestion.owner.id == current_user.id
    ).count()

    # 已掌握
    mastered = await MistakeQuestion.find(
        MistakeQuestion.owner.id == current_user.id,
        MistakeQuestion.is_mastered == True,
    ).count()

    # 待复习（未掌握）
    need_review = total - mastered

    # 按学科统计
    pipeline = [
        {"$match": {"owner.$id": current_user.id}},
        {"$group": {"_id": "$subject", "count": {"$sum": 1}}},
    ]
    by_subject_result = await MistakeQuestion.aggregate(pipeline).to_list()
    by_subject = {item["_id"]: item["count"] for item in by_subject_result}

    return MistakeStatsResponse(
        total=total,
        mastered=mastered,
        needReview=need_review,
        bySubject=by_subject,
    )


@router.get("/export/pdf")
async def export_pdf(
    current_user: CurrentUser,
    subject: Optional[str] = Query(None, pattern="^(math|chinese|english|physics|chemistry|biology|other)$"),
    include_images: bool = Query(True),
):
    """导出错题为 PDF"""
    query = {"owner.$id": current_user.id}
    if subject:
        query["subject"] = subject

    mistakes = await MistakeQuestion.find(query).sort(-MistakeQuestion.created_at).to_list()

    if not mistakes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="没有可导出的错题",
        )

    # 加载 owner 关联（用于获取 owner.id）
    for mistake in mistakes:
        await mistake.fetch_link(MistakeQuestion.owner)

    # 生成标题
    subject_names = {
        "math": "数学",
        "chinese": "语文",
        "english": "英语",
        "physics": "物理",
        "chemistry": "化学",
        "biology": "生物",
        "other": "其他",
    }
    title = f"错题本 - {subject_names.get(subject, '全部')}"

    pdf_data = await generate_mistakes_pdf(mistakes, title, include_images)

    # 返回 PDF 文件
    filename = f"mistakes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/{mistake_id}", response_model=MistakeResponse)
async def get_mistake(mistake: OwnedMistake):
    """获取错题详情"""
    return mistake.to_response()


@router.put("/{mistake_id}", response_model=MistakeResponse)
async def update_mistake(mistake: OwnedMistake, data: MistakeUpdate):
    """更新错题"""
    update_data = data.model_dump(exclude_unset=True)

    # 字段名映射：camelCase -> snake_case
    field_mapping = {
        "questionContent": "question_content",
        "answerContent": "answer_content",
        "myAnswer": "my_answer",
        "isMastered": "is_mastered",
    }

    for camel, snake in field_mapping.items():
        if camel in update_data:
            update_data[snake] = update_data.pop(camel)

    for field, value in update_data.items():
        setattr(mistake, field, value)

    mistake.updated_at = datetime.now(timezone.utc)
    await mistake.save()

    return mistake.to_response()


@router.delete("/{mistake_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mistake(mistake: OwnedMistake):
    """删除错题"""
    await delete_mistake_images(mistake)
    await mistake.delete()


@router.post("/{mistake_id}/images", response_model=MistakeResponse)
async def upload_image(
    mistake: OwnedMistake,
    file: UploadFile = File(...),
):
    """上传错题图片"""
    # 验证文件类型
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只支持图片文件",
        )

    # 限制文件大小 (10MB)
    max_size = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="图片大小不能超过 10MB",
        )

    # 保存图片
    image_path = await save_mistake_image(mistake, contents, file.content_type)

    # 更新错题
    mistake.image_paths.append(image_path)
    mistake.updated_at = datetime.now(timezone.utc)
    await mistake.save()

    return mistake.to_response()


@router.get("/{mistake_id}/images/{index}")
async def get_image(mistake: OwnedMistake, index: int):
    """获取错题图片"""
    image_data = await get_mistake_image(mistake, index)

    if image_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="图片不存在",
        )

    # 从路径推断 content_type
    if index < len(mistake.image_paths):
        path = mistake.image_paths[index]
        if path.endswith(".png"):
            content_type = "image/png"
        elif path.endswith(".webp"):
            content_type = "image/webp"
        elif path.endswith(".gif"):
            content_type = "image/gif"
        else:
            content_type = "image/jpeg"
    else:
        content_type = "image/jpeg"

    return Response(
        content=image_data,
        media_type=content_type,
    )


@router.post("/{mistake_id}/extract", response_model=AIExtractResponse)
async def extract_content(mistake: OwnedMistake):
    """AI 识别试卷图片中的错题（支持多题）"""
    if not mistake.image_paths:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先上传图片",
        )

    # 获取第一张图片
    image_data = await get_mistake_image(mistake, 0)
    if image_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法读取图片",
        )

    # AI 识别错题
    result = await extract_wrong_questions(image_data)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 识别失败，请检查配置或稍后重试",
        )

    return AIExtractResponse(**result)


@router.post("/{mistake_id}/review", response_model=MistakeResponse)
async def mark_reviewed(mistake: OwnedMistake):
    """标记已复习"""
    mistake.review_count += 1
    mistake.last_review_at = datetime.now(timezone.utc)
    mistake.updated_at = datetime.now(timezone.utc)
    await mistake.save()

    return mistake.to_response()
