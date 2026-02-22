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

    # LLM 返回的 JSON 可能不标准（markdown 代码块、尾逗号等），需要容错处理
    raw = raw.strip()

    # 提取 JSON 数组部分
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        raw = match.group(0)

    # 清理常见的非标准 JSON：尾逗号（对象和数组末尾的逗号）
    raw = re.sub(r",\s*([\]}])", r"\1", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # JSON 可能因 max_tokens 截断而不完整，尝试修复：
        # 找到最后一个完整的 "}," 或 "}" 对象结尾，截断后闭合数组
        last_complete = raw.rfind("}")
        if last_complete > 0:
            truncated = raw[:last_complete + 1]
            # 确保以 ] 结尾
            if not truncated.rstrip().endswith("]"):
                truncated = truncated.rstrip().rstrip(",") + "\n]"
            try:
                return json.loads(truncated)
            except json.JSONDecodeError:
                pass

        # 最终 fallback：返回空列表而不是崩溃
        print(f"[LLM WARNING] Failed to parse LLM response as JSON, returning empty list")
        return []


def crop_and_store_question_image(
    image_data: bytes, bbox: dict, user_id: str
) -> str:
    """根据归一化 bbox 裁剪题目区域，保存为 JPEG 并上传到 MinIO

    Args:
        image_data: 原始图片二进制数据
        bbox: 归一化坐标 {"x": float, "y": float, "width": float, "height": float}
        user_id: 用户 ID，用于构建存储路径

    Returns:
        MinIO 中裁剪图片的对象名称
    """
    from io import BytesIO
    from PIL import Image

    img = Image.open(BytesIO(image_data)).convert("RGB")
    w, h = img.size

    # 归一化坐标 → 像素坐标，clamp 到图片范围内
    left = max(0, int(bbox["x"] * w))
    top = max(0, int(bbox["y"] * h))
    right = min(w, int((bbox["x"] + bbox["width"]) * w))
    bottom = min(h, int((bbox["y"] + bbox["height"]) * h))

    cropped = img.crop((left, top, right, bottom))

    buf = BytesIO()
    cropped.save(buf, format="JPEG", quality=85)
    cropped_bytes = buf.getvalue()

    object_name = f"mistakes/{user_id}/cropped_{uuid.uuid4().hex}.jpg"
    storage = get_storage_service()
    storage.upload_file(cropped_bytes, object_name, "image/jpeg")
    return object_name


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
