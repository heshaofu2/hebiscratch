from typing import Annotated

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.models import User, Project, MistakeEntry
from app.models.paper import Paper
from app.repositories.mistake_repo import MistakeRepository
from app.repositories.paper_repo import PaperRepository

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> User:
    """获取当前登录用户"""
    token = credentials.credentials
    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await User.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_admin_user(current_user: CurrentUser) -> User:
    """获取当前管理员用户，验证管理员权限"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return current_user


AdminUser = Annotated[User, Depends(get_admin_user)]


async def get_project_with_ownership(
    project_id: str,
    current_user: CurrentUser,
) -> Project:
    """获取项目并验证所有权

    统一的项目权限检查依赖，消除重复代码。

    Raises:
        HTTPException 404: 项目 ID 无效或项目不存在
        HTTPException 403: 当前用户无权访问该项目
    """
    try:
        obj_id = PydanticObjectId(project_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="无效的项目 ID",
        )

    project = await Project.get(obj_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    # 加载 owner 关联
    await project.fetch_link(Project.owner)

    # 检查权限：管理员可以访问任意项目
    if current_user.role == "admin":
        return project
    # 普通用户只能访问自己的项目
    if project.owner.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目",
        )

    return project


# 项目所有权依赖注入类型
OwnedProject = Annotated[Project, Depends(get_project_with_ownership)]


# ── Repository 依赖注入 ──────────────────────────


def get_mistake_repo() -> MistakeRepository:
    return MistakeRepository()


def get_paper_repo(
    mistake_repo: MistakeRepository = Depends(get_mistake_repo),
) -> PaperRepository:
    return PaperRepository(mistake_repo)


MistakeRepo = Annotated[MistakeRepository, Depends(get_mistake_repo)]
PaperRepo = Annotated[PaperRepository, Depends(get_paper_repo)]


# ── 资源所有权依赖（使用 Repository）──────────────


async def get_mistake_with_ownership(
    mistake_id: str,
    current_user: CurrentUser,
    repo: MistakeRepo,
) -> MistakeEntry:
    """获取错题并验证所有权"""
    mistake = await repo.get_by_id(mistake_id)

    if mistake is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="错题不存在",
        )

    if current_user.role == "admin":
        return mistake
    if repo.get_owner_id(mistake) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该错题",
        )

    return mistake


OwnedMistake = Annotated[MistakeEntry, Depends(get_mistake_with_ownership)]


async def get_paper_with_ownership(
    paper_id: str,
    current_user: CurrentUser,
    repo: PaperRepo,
) -> Paper:
    """获取试卷并验证所有权"""
    paper = await repo.get_by_id(paper_id)

    if paper is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="试卷不存在",
        )

    if current_user.role == "admin":
        return paper
    if repo.get_owner_id(paper) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该试卷",
        )

    return paper


OwnedPaper = Annotated[Paper, Depends(get_paper_with_ownership)]
