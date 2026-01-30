from typing import Annotated

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status

from app.common.api import CurrentUser
from app.scratch.models import Project


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
