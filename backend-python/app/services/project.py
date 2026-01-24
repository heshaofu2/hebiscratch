"""项目服务层

所有项目数据统一存储到 MinIO，MongoDB 只保存元数据。
"""

import base64
import logging
from typing import Any, Optional

from app.models import Project
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


async def save_project_data(
    project: Project,
    project_json: Optional[dict[str, Any]],
) -> None:
    """保存项目数据到 MinIO

    Args:
        project: 项目实例（必须已经有 id）
        project_json: 项目数据，包含 sb3 字段
    """
    if not project_json:
        project.storage_path = None
        return

    sb3_data = project_json.get("sb3", "")
    if not sb3_data:
        project.storage_path = None
        return

    # 去掉 data URL 前缀（如果有）
    # 格式: data:application/x.scratch.sb3;base64,XXXX
    if sb3_data.startswith("data:"):
        # 提取 base64 部分
        sb3_data = sb3_data.split(",", 1)[1]

    # 解码 base64 数据并上传到 MinIO
    file_data = base64.b64decode(sb3_data)
    object_name = project.get_storage_object_name()

    storage = get_storage_service()
    storage.upload_file(
        file_data=file_data,
        object_name=object_name,
        content_type="application/x-scratch-project",
    )

    project.storage_path = object_name
    logger.info(f"Project {project.id}: stored in MinIO ({len(file_data)} bytes)")


async def load_project_data(project: Project) -> Optional[dict[str, Any]]:
    """从 MinIO 加载项目数据

    Args:
        project: 项目实例

    Returns:
        项目数据字典，包含 sb3 字段
    """
    if not project.storage_path:
        return None

    storage = get_storage_service()
    file_data = storage.download_file(project.storage_path)

    if not file_data:
        logger.warning(f"Project {project.id}: file not found: {project.storage_path}")
        return None

    sb3_base64 = base64.b64encode(file_data).decode("utf-8")
    # 返回 data URL 格式，前端需要这个格式来加载项目
    return {"sb3": f"data:application/x.scratch.sb3;base64,{sb3_base64}"}


async def delete_project_data(project: Project) -> None:
    """删除 MinIO 中的项目数据

    Args:
        project: 项目实例
    """
    if project.storage_path:
        storage = get_storage_service()
        storage.delete_file(project.storage_path)
        logger.info(f"Project {project.id}: deleted from MinIO")
