"""管理后台 API"""

import secrets
from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel

from app.common.models import User
from app.scratch.models import Project
from app.mistakes.models import MistakeQuestion

router = APIRouter()
security = HTTPBasic()

# 管理员账号（写死）
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"


def verify_admin(credentials: Annotated[HTTPBasicCredentials, Depends(security)]):
    """验证管理员身份"""
    is_correct_username = secrets.compare_digest(
        credentials.username.encode("utf-8"),
        ADMIN_USERNAME.encode("utf-8"),
    )
    is_correct_password = secrets.compare_digest(
        credentials.password.encode("utf-8"),
        ADMIN_PASSWORD.encode("utf-8"),
    )
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


AdminUser = Annotated[str, Depends(verify_admin)]


# ========== Response Models ==========

class UserListItem(BaseModel):
    id: str
    username: str
    avatar: Optional[str]
    projectCount: int
    mistakeCount: int
    createdAt: datetime
    updatedAt: datetime


class UserListResponse(BaseModel):
    total: int
    users: List[UserListItem]


class StatsResponse(BaseModel):
    totalUsers: int
    totalProjects: int
    totalMistakes: int
    todayUsers: int
    todayProjects: int
    todayMistakes: int


# ========== API Endpoints ==========

@router.get("/stats", response_model=StatsResponse)
async def get_stats(admin: AdminUser):
    """获取系统统计数据"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = await User.count()
    total_projects = await Project.count()
    total_mistakes = await MistakeQuestion.count()

    today_users = await User.find(User.created_at >= today_start).count()
    today_projects = await Project.find(Project.created_at >= today_start).count()
    today_mistakes = await MistakeQuestion.find(MistakeQuestion.created_at >= today_start).count()

    return StatsResponse(
        totalUsers=total_users,
        totalProjects=total_projects,
        totalMistakes=total_mistakes,
        todayUsers=today_users,
        todayProjects=today_projects,
        todayMistakes=today_mistakes,
    )


@router.get("/users", response_model=UserListResponse)
async def list_users(
    admin: AdminUser,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
):
    """获取用户列表"""
    query = {}
    if search:
        query["username"] = {"$regex": search, "$options": "i"}

    total = await User.find(query).count()
    users = await User.find(query).skip(skip).limit(limit).sort(-User.created_at).to_list()

    user_list = []
    for user in users:
        project_count = await Project.find(Project.owner.id == user.id).count()
        mistake_count = await MistakeQuestion.find(MistakeQuestion.owner.id == user.id).count()

        user_list.append(UserListItem(
            id=str(user.id),
            username=user.username,
            avatar=user.avatar,
            projectCount=project_count,
            mistakeCount=mistake_count,
            createdAt=user.created_at,
            updatedAt=user.updated_at,
        ))

    return UserListResponse(total=total, users=user_list)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, admin: AdminUser):
    """删除用户（同时删除其所有项目和错题）"""
    from beanie import PydanticObjectId
    from app.scratch.services import delete_project_data
    from app.mistakes.services import delete_mistake_images

    try:
        obj_id = PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=404, detail="无效的用户 ID")

    user = await User.get(obj_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 删除用户的所有项目
    projects = await Project.find(Project.owner.id == obj_id).to_list()
    for project in projects:
        await delete_project_data(project)
        await project.delete()

    # 删除用户的所有错题
    mistakes = await MistakeQuestion.find(MistakeQuestion.owner.id == obj_id).to_list()
    for mistake in mistakes:
        await mistake.fetch_link(MistakeQuestion.owner)
        await delete_mistake_images(mistake)
        await mistake.delete()

    # 删除用户
    await user.delete()
