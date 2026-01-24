from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, status

from app.models import Project
from app.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ShareResponse,
)
from app.services import save_project_data, load_project_data, delete_project_data

from .deps import CurrentUser, OwnedProject

router = APIRouter()


@router.get("", response_model=List[ProjectListResponse])
async def list_projects(current_user: CurrentUser):
    """获取当前用户的项目列表"""
    projects = await Project.find(
        Project.owner.id == current_user.id
    ).sort(-Project.updated_at).to_list()

    return [project.to_list_response() for project in projects]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(data: ProjectCreate, current_user: CurrentUser):
    """创建新项目"""
    project = Project(
        title=data.title,
        description=data.description,
        owner=current_user,
    )
    await project.insert()

    # 保存项目数据到 MinIO
    if data.projectJson:
        await save_project_data(project, data.projectJson)
        await project.save()

    return await _build_project_response(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project: OwnedProject):
    """获取项目详情"""
    return await _build_project_response(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project: OwnedProject, data: ProjectUpdate):
    """更新项目"""
    update_data = data.model_dump(exclude_unset=True)

    # 保存项目数据到 MinIO
    if "projectJson" in update_data:
        await save_project_data(project, update_data.pop("projectJson"))

    # 更新其他字段
    for field, value in update_data.items():
        setattr(project, field, value)

    project.updated_at = datetime.now(timezone.utc)
    await project.save()

    return await _build_project_response(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project: OwnedProject):
    """删除项目"""
    await delete_project_data(project)
    await project.delete()


@router.post("/{project_id}/share", response_model=ShareResponse)
async def share_project(project: OwnedProject):
    """生成分享链接"""
    if not project.share_token:
        project.generate_share_token()
        await project.save()

    return ShareResponse(
        shareToken=project.share_token,
        shareUrl=f"/share/{project.share_token}",
    )


@router.delete("/{project_id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def unshare_project(project: OwnedProject):
    """取消分享"""
    project.share_token = None
    project.is_public = False
    project.updated_at = datetime.now(timezone.utc)
    await project.save()


async def _build_project_response(project: Project) -> dict:
    """构建项目响应，从 MinIO 加载项目数据"""
    response = project.to_response()
    response["projectJson"] = await load_project_data(project)
    return response
