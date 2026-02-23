from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, Query, status

from app.models import MistakeEntry
from app.models.paper import Paper
from app.schemas.paper import PaperAddQuestions, PaperCreate, PaperUpdate

from .deps import CurrentUser, OwnedPaper

router = APIRouter()


@router.get("")
async def list_papers(
    current_user: CurrentUser,
    subject: Optional[str] = None,
    search: Optional[str] = None,
):
    """获取当前用户的试卷列表"""
    query = {"owner.$id": current_user.id}

    if subject:
        query["subject"] = subject
    if search:
        query["title"] = {"$regex": search, "$options": "i"}

    papers = await Paper.find_many(query).sort(-Paper.updated_at).to_list()
    return [p.to_list_response() for p in papers]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_paper(data: PaperCreate, current_user: CurrentUser):
    """创建试卷，验证所引用的错题存在且属于当前用户"""
    question_ids = await _validate_question_ids(data.questions, current_user.id)

    paper = Paper(
        owner=current_user,
        title=data.title,
        description=data.description,
        subject=data.subject,
        questions=question_ids,
    )
    await paper.insert()
    return paper.to_list_response()


@router.get("/{paper_id}")
async def get_paper(paper: OwnedPaper):
    """获取试卷详情，展开每道题的完整内容"""
    expanded = await _expand_questions(paper.questions)
    return paper.to_response(expanded_questions=expanded)


@router.put("/{paper_id}")
async def update_paper(data: PaperUpdate, paper: OwnedPaper):
    """更新试卷"""
    if data.title is not None:
        paper.title = data.title
    if data.description is not None:
        paper.description = data.description
    if data.subject is not None:
        paper.subject = data.subject
    if data.questions is not None:
        # 获取 owner ID（可能是 Link 对象或已 fetch 的 User）
        owner_id = paper.owner.id if hasattr(paper.owner, 'id') else paper.owner
        paper.questions = await _validate_question_ids(data.questions, owner_id)

    paper.updated_at = datetime.now(timezone.utc)
    await paper.save()

    expanded = await _expand_questions(paper.questions)
    return paper.to_response(expanded_questions=expanded)


@router.post("/{paper_id}/questions")
async def add_questions_to_paper(data: PaperAddQuestions, paper: OwnedPaper):
    """追加题目到试卷尾部（自动去重）"""
    owner_id = paper.owner.id if hasattr(paper.owner, 'id') else paper.owner
    new_ids = await _validate_question_ids(data.questions, owner_id)
    existing_set = {str(q) for q in paper.questions}
    added = 0
    for qid in new_ids:
        if str(qid) not in existing_set:
            paper.questions.append(qid)
            existing_set.add(str(qid))
            added += 1
    paper.updated_at = datetime.now(timezone.utc)
    await paper.save()
    return {"added": added, "total": len(paper.questions)}


@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(paper: OwnedPaper):
    """删除试卷"""
    await paper.delete()


# ── 工具函数 ──────────────────────────────────────

async def _validate_question_ids(
    raw_ids: list[str], owner_id: PydanticObjectId
) -> list[PydanticObjectId]:
    """验证错题 ID 列表：格式合法、存在、且属于当前用户"""
    result: list[PydanticObjectId] = []
    for raw_id in raw_ids:
        try:
            oid = PydanticObjectId(raw_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的错题 ID: {raw_id}",
            )
        mistake = await MistakeEntry.get(oid)
        if mistake is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"错题不存在: {raw_id}",
            )
        # 检查所有权（owner 可能是 Link 引用）
        mistake_owner_id = (
            mistake.owner.ref.id
            if hasattr(mistake.owner, "ref")
            else mistake.owner.id
        )
        if mistake_owner_id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"无权引用该错题: {raw_id}",
            )
        result.append(oid)
    return result


async def _expand_questions(question_ids: list[PydanticObjectId]) -> list[dict]:
    """展开题目 ID 列表为完整的题目内容，保持顺序"""
    result: list[dict] = []
    for oid in question_ids:
        mistake = await MistakeEntry.get(oid)
        if mistake is None:
            # 错题已被删除，跳过
            continue
        result.append(mistake.to_response())
    return result
