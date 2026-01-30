"""错题服务层 - 图片存储相关"""

import logging
from typing import Optional

from app.mistakes.models import MistakeQuestion
from app.common.services import get_storage_service

logger = logging.getLogger(__name__)


async def save_mistake_image(
    mistake: MistakeQuestion,
    image_data: bytes,
    content_type: str = "image/jpeg",
) -> str:
    """保存错题图片到 MinIO

    Args:
        mistake: 错题实例（必须已经有 id）
        image_data: 图片二进制数据
        content_type: 图片 MIME 类型

    Returns:
        图片存储路径
    """
    # 获取下一个图片索引
    index = len(mistake.image_paths)

    # 根据 content_type 确定扩展名
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
    }
    ext = ext_map.get(content_type, "jpg")

    object_name = f"mistakes/{mistake.owner.id}/{mistake.id}/image_{index}.{ext}"

    storage = get_storage_service()
    storage.upload_file(
        file_data=image_data,
        object_name=object_name,
        content_type=content_type,
    )

    logger.info(f"Mistake {mistake.id}: saved image {index} ({len(image_data)} bytes)")
    return object_name


async def get_mistake_image(
    mistake: MistakeQuestion,
    index: int,
) -> Optional[bytes]:
    """从 MinIO 获取错题图片

    Args:
        mistake: 错题实例
        index: 图片索引

    Returns:
        图片二进制数据，或 None（如果不存在）
    """
    if index < 0 or index >= len(mistake.image_paths):
        return None

    storage = get_storage_service()
    image_path = mistake.image_paths[index]
    return storage.download_file(image_path)


async def delete_mistake_images(mistake: MistakeQuestion) -> None:
    """删除错题的所有图片

    Args:
        mistake: 错题实例
    """
    storage = get_storage_service()

    # 删除所有图片
    prefix = f"mistakes/{mistake.owner.id}/{mistake.id}/"
    deleted = storage.delete_files_by_prefix(prefix)

    if deleted > 0:
        logger.info(f"Mistake {mistake.id}: deleted {deleted} images")
