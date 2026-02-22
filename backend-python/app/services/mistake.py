"""错题本业务逻辑

负责图片存储（MinIO）和 AI 题目识别（LLM 服务）。
"""

import json
import re
import uuid
from typing import Optional

from app.services.llm import get_llm_service
from app.services.storage import get_storage_service


def store_mistake_image(image_data: bytes, user_id: str, content_type: str) -> str:
    """将错题图片存储到 MinIO，返回对象名称"""
    ext = content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    object_name = f"mistakes/{user_id}/{uuid.uuid4().hex}.{ext}"
    storage = get_storage_service()
    storage.upload_file(image_data, object_name, content_type)
    return object_name


async def recognize_questions_from_image(image_data: bytes, mime_type: str) -> list[dict]:
    """调用 LLM 服务识别图片中的题目

    Returns:
        解析后的题目字典列表，每项包含 index, question, wrongAnswer,
        correctAnswer, analysis, subjectGuess, bbox
    """
    llm = get_llm_service()
    system_prompt = llm.load_prompt("recognize_questions_system")
    user_prompt = llm.load_prompt("recognize_questions_user")

    raw = await llm.complete_with_image(
        prompt=user_prompt,
        image_data=image_data,
        mime_type=mime_type,
        system_prompt=system_prompt,
    )

    # LLM 有时会在 JSON 外包裹 markdown 代码块，需要容错提取
    raw = raw.strip()
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        raw = match.group(0)

    return json.loads(raw)


def get_mistake_image_url(object_name: str) -> Optional[str]:
    """获取错题图片的预签名 URL"""
    storage = get_storage_service()
    if not storage.file_exists(object_name):
        return None
    return storage.get_presigned_url(object_name, expires_hours=1)


def delete_mistake_image(object_name: str) -> bool:
    """删除 MinIO 中的错题图片"""
    storage = get_storage_service()
    return storage.delete_file(object_name)
