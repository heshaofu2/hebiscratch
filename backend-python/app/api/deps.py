from typing import Annotated, Callable, TypeVar

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.models import User, Project

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

    # 检查权限
    if project.owner.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目",
        )

    return project


# 项目所有权依赖注入类型
OwnedProject = Annotated[Project, Depends(get_project_with_ownership)]
