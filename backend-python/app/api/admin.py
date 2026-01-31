import math
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, Query, status

from app.core.security import hash_password
from app.models import Project, User
from app.schemas.admin import (
    PaginatedUsers,
    PasswordReset,
    UserCreate,
    UserDetail,
    UserListItem,
    UserUpdate,
)

from .deps import AdminUser

router = APIRouter()


@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    _: AdminUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索用户名"),
):
    """获取用户列表（分页、搜索）"""
    query = {}
    if search:
        query["username"] = {"$regex": search, "$options": "i"}

    total = await User.find(query).count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    users = (
        await User.find(query)
        .sort(-User.created_at)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list()
    )

    items = [
        UserListItem(
            _id=str(user.id),
            username=user.username,
            avatar=user.avatar,
            role=user.role,
            isActive=user.is_active,
            createdAt=user.created_at,
        )
        for user in users
    ]

    return PaginatedUsers(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=total_pages,
    )


@router.post("/users", response_model=UserListItem, status_code=status.HTTP_201_CREATED)
async def create_user(_: AdminUser, data: UserCreate):
    """创建新用户"""
    existing = await User.find_one(User.username == data.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在",
        )

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=data.is_active,
    )
    await user.insert()

    return UserListItem(
        _id=str(user.id),
        username=user.username,
        avatar=user.avatar,
        role=user.role,
        isActive=user.is_active,
        createdAt=user.created_at,
    )


@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user(_: AdminUser, user_id: str):
    """获取用户详情"""
    try:
        obj_id = PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="无效的用户 ID",
        )

    user = await User.get(obj_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    project_count = await Project.find(Project.owner.id == user.id).count()

    return UserDetail(
        _id=str(user.id),
        username=user.username,
        avatar=user.avatar,
        role=user.role,
        isActive=user.is_active,
        projectCount=project_count,
        createdAt=user.created_at,
        updatedAt=user.updated_at,
    )


@router.put("/users/{user_id}", response_model=UserListItem)
async def update_user(_: AdminUser, user_id: str, data: UserUpdate):
    """更新用户信息"""
    try:
        obj_id = PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="无效的用户 ID",
        )

    user = await User.get(obj_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    if data.username is not None and data.username != user.username:
        existing = await User.find_one(User.username == data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已存在",
            )
        user.username = data.username

    if data.role is not None:
        user.role = data.role

    if data.is_active is not None:
        user.is_active = data.is_active

    user.updated_at = datetime.now(timezone.utc)
    await user.save()

    return UserListItem(
        _id=str(user.id),
        username=user.username,
        avatar=user.avatar,
        role=user.role,
        isActive=user.is_active,
        createdAt=user.created_at,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(admin: AdminUser, user_id: str):
    """删除用户及其关联数据"""
    try:
        obj_id = PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="无效的用户 ID",
        )

    user = await User.get(obj_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    # 禁止删除自己
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己",
        )

    # 删除用户的所有项目
    await Project.find(Project.owner.id == user.id).delete()

    # 删除用户
    await user.delete()

    return None


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(_: AdminUser, user_id: str, data: PasswordReset):
    """重置用户密码"""
    try:
        obj_id = PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="无效的用户 ID",
        )

    user = await User.get(obj_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    user.password_hash = hash_password(data.new_password)
    user.updated_at = datetime.now(timezone.utc)
    await user.save()

    return None
