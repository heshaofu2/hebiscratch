"""AI 识别服务 - 使用 LiteLLM 从试卷图片中提取错题"""

import base64
import json
import logging
from typing import Optional

from app.common.core import get_settings
from app.common.prompts import get_prompt_manager

logger = logging.getLogger(__name__)

# 有效的学科列表
VALID_SUBJECTS = ["math", "chinese", "english", "physics", "chemistry", "biology", "other"]

# 有效的错误类型
VALID_ERROR_TYPES = ["calculation", "concept", "careless", "unanswered", "other"]

# 有效的置信度
VALID_CONFIDENCE = ["high", "medium", "low"]


def _parse_json_response(content: str) -> dict:
    """解析 AI 返回的 JSON 响应，处理各种格式问题"""
    # 去除可能的 markdown 代码块
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]

    return json.loads(content.strip())


def _validate_question(question: dict) -> dict:
    """验证并修正单个错题的字段"""
    # 确保必要字段存在
    defaults = {
        "questionNumber": "",
        "questionContent": "",
        "studentAnswer": "",
        "correctAnswer": "",
        "analysis": "",
        "errorType": "other",
        "suggestedTags": [],
        "suggestedSubject": "other",
        "confidence": "medium",
    }

    for key, default_value in defaults.items():
        if key not in question:
            question[key] = default_value

    # 验证枚举值
    if question["suggestedSubject"] not in VALID_SUBJECTS:
        question["suggestedSubject"] = "other"
    if question["errorType"] not in VALID_ERROR_TYPES:
        question["errorType"] = "other"
    if question["confidence"] not in VALID_CONFIDENCE:
        question["confidence"] = "medium"

    # 确保 tags 是列表
    if not isinstance(question["suggestedTags"], list):
        question["suggestedTags"] = []

    return question


async def extract_wrong_questions(image_data: bytes) -> Optional[dict]:
    """从试卷图片中识别所有做错的题目

    Args:
        image_data: 图片二进制数据

    Returns:
        识别结果字典，格式如下：
        {
            "questions": [
                {
                    "questionNumber": str,
                    "questionContent": str,
                    "studentAnswer": str,
                    "correctAnswer": str,
                    "analysis": str,
                    "errorType": str,
                    "suggestedTags": list[str],
                    "suggestedSubject": str,
                    "confidence": str,
                }
            ],
            "totalFound": int,
            "imageNote": str,
        }
        失败则返回 None
    """
    settings = get_settings()

    if not settings.ai_api_key:
        logger.warning("AI API key not configured, skipping extraction")
        return None

    try:
        import litellm

        # 配置 API base（如果有）
        if settings.ai_api_base:
            litellm.api_base = settings.ai_api_base

        # 编码图片为 base64
        image_base64 = base64.b64encode(image_data).decode("utf-8")

        # 从提示词管理器获取模板并替换变量
        prompt_manager = get_prompt_manager()
        prompt = prompt_manager.get(
            "mistakes.extract_wrong_questions",
            valid_subjects="|".join(VALID_SUBJECTS)
        )

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
                            "text": prompt,
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
            max_tokens=4000,  # 增加 token 限制以支持多题
        )

        # 解析响应
        content = response.choices[0].message.content
        logger.debug(f"AI response: {content}")

        result = _parse_json_response(content)

        # 验证结构
        if "questions" not in result:
            result["questions"] = []
        if "totalFound" not in result:
            result["totalFound"] = len(result["questions"])
        if "imageNote" not in result:
            result["imageNote"] = ""

        # 验证每个题目
        result["questions"] = [_validate_question(q) for q in result["questions"]]
        result["totalFound"] = len(result["questions"])

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
