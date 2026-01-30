"""AI 识别服务 - 使用 LiteLLM 提取题目内容"""

import base64
import json
import logging
from typing import Optional

from app.common.core import get_settings

logger = logging.getLogger(__name__)

# AI 提取的 prompt 模板
EXTRACT_PROMPT = """请识别图片中的题目，并提取以下信息：
1. 题目内容（完整题目文本，包括选项等）
2. 正确答案（如果可见）
3. 解析（如果可见）
4. 推荐的知识点标签（1-3个，简短关键词）
5. 推荐的学科分类

你必须返回纯 JSON 格式，不要有任何其他文字：
{
  "questionContent": "完整题目内容",
  "answerContent": "正确答案（如无则为空字符串）",
  "analysis": "解析内容（如无则为空字符串）",
  "suggestedTags": ["标签1", "标签2"],
  "suggestedSubject": "math|chinese|english|physics|chemistry|biology|other"
}

注意：
- 如果看不清某部分内容，该字段留空
- suggestedSubject 必须是以上7个选项之一
- 返回的必须是合法的 JSON，不要包含 markdown 代码块标记"""


async def extract_question_from_image(image_data: bytes) -> Optional[dict]:
    """使用 AI 从图片中提取题目信息

    Args:
        image_data: 图片二进制数据

    Returns:
        提取的信息字典，格式如下：
        {
            "questionContent": str,
            "answerContent": str,
            "analysis": str,
            "suggestedTags": list[str],
            "suggestedSubject": str,
        }
        失败则返回 None
    """
    settings = get_settings()

    if not settings.ai_api_key:
        logger.warning("AI API key not configured, skipping extraction")
        return None

    try:
        import litellm

        # 配置 API key
        if settings.ai_api_base:
            litellm.api_base = settings.ai_api_base

        # 编码图片为 base64
        image_base64 = base64.b64encode(image_data).decode("utf-8")

        # 调用 AI 模型
        response = litellm.completion(
            model=settings.ai_model,
            api_key=settings.ai_api_key,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": EXTRACT_PROMPT,
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}",
                            },
                        },
                    ],
                }
            ],
            max_tokens=2000,
        )

        # 解析响应
        content = response.choices[0].message.content
        logger.debug(f"AI response: {content}")

        # 尝试解析 JSON
        # 有些模型可能会返回 markdown 代码块
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        result = json.loads(content.strip())

        # 验证必要字段
        required_fields = ["questionContent", "answerContent", "analysis", "suggestedTags", "suggestedSubject"]
        for field in required_fields:
            if field not in result:
                result[field] = "" if field != "suggestedTags" else []

        # 验证 subject 值
        valid_subjects = ["math", "chinese", "english", "physics", "chemistry", "biology", "other"]
        if result["suggestedSubject"] not in valid_subjects:
            result["suggestedSubject"] = "other"

        return result

    except ImportError:
        logger.error("litellm not installed, please run: pip install litellm")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"AI extraction failed: {e}")
        return None
