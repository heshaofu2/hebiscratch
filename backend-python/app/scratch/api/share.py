from fastapi import APIRouter, HTTPException, status

from app.scratch.models import Project
from app.scratch.schemas import ProjectResponse
from app.scratch.services import load_project_data

router = APIRouter()


@router.get("/{token}", response_model=ProjectResponse)
async def get_shared_project(token: str):
    """通过分享 token 获取项目（公开接口，无需登录）"""
    project = await Project.find_one(
        Project.share_token == token,
        Project.is_public == True,
        fetch_links=True,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分享链接不存在或已失效",
        )

    # 增加浏览次数
    project.view_count += 1
    await project.save()

    # 构建响应，从 MinIO 加载项目数据
    response = project.to_response()
    response["projectJson"] = await load_project_data(project)
    return response
