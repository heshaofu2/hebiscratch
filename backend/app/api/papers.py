from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.paper import PaperAddQuestions, PaperCreate, PaperUpdate

from .deps import CurrentUser, OwnedPaper, PaperRepo

router = APIRouter()


@router.get("")
async def list_papers(
    current_user: CurrentUser,
    repo: PaperRepo,
    subject: Optional[str] = None,
    search: Optional[str] = None,
):
    """获取当前用户的试卷列表"""
    papers = await repo.list_by_owner(
        str(current_user.id), subject=subject, search=search,
    )
    return [p.to_list_response() for p in papers]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_paper(
    data: PaperCreate, current_user: CurrentUser, repo: PaperRepo
):
    """创建试卷，验证所引用的错题存在且属于当前用户"""
    try:
        question_ids = await repo.validate_question_ids(
            data.questions, str(current_user.id)
        )
    except ValueError as e:
        code, detail = str(e).split(":", 1)
        raise HTTPException(status_code=int(code), detail=detail)

    paper = await repo.create(
        current_user, data.title, data.description, data.subject, question_ids,
    )
    return paper.to_list_response()


@router.get("/{paper_id}")
async def get_paper(paper: OwnedPaper, repo: PaperRepo):
    """获取试卷详情，展开每道题的完整内容"""
    expanded = await repo.expand_questions(paper.questions)
    return paper.to_response(expanded_questions=expanded)


@router.put("/{paper_id}")
async def update_paper(
    data: PaperUpdate, paper: OwnedPaper, repo: PaperRepo
):
    """更新试卷"""
    if data.title is not None:
        paper.title = data.title
    if data.description is not None:
        paper.description = data.description
    if data.subject is not None:
        paper.subject = data.subject
    if data.questions is not None:
        try:
            paper.questions = await repo.validate_question_ids(
                data.questions, repo.get_owner_id(paper)
            )
        except ValueError as e:
            code, detail = str(e).split(":", 1)
            raise HTTPException(status_code=int(code), detail=detail)

    paper.updated_at = datetime.now(timezone.utc)
    await repo.save(paper)

    expanded = await repo.expand_questions(paper.questions)
    return paper.to_response(expanded_questions=expanded)


@router.post("/{paper_id}/questions")
async def add_questions_to_paper(
    data: PaperAddQuestions, paper: OwnedPaper, repo: PaperRepo
):
    """追加题目到试卷尾部（自动去重）"""
    try:
        added = await repo.add_questions(
            paper, data.questions, repo.get_owner_id(paper)
        )
    except ValueError as e:
        code, detail = str(e).split(":", 1)
        raise HTTPException(status_code=int(code), detail=detail)

    paper.updated_at = datetime.now(timezone.utc)
    await repo.save(paper)
    return {"added": added, "total": len(paper.questions)}


@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(paper: OwnedPaper, repo: PaperRepo):
    """删除试卷"""
    await repo.delete(paper)
