"""公共 LLM 服务

提供统一的大语言模型调用接口，支持纯文本和多模态（图片）补全。
作为公共基础设施，不与具体业务耦合，便于后续扩展更多 AI 能力。
"""

import base64
from functools import lru_cache
from pathlib import Path

from litellm import acompletion

from app.core.config import get_settings


class LLMService:
    """LLM 服务 — 封装 LiteLLM 异步接口"""

    def __init__(self):
        settings = get_settings()
        self.model = settings.ai_model
        self.api_key = settings.ai_api_key
        self.api_base = settings.ai_api_base or None
        self.max_tokens = settings.ai_max_tokens
        self.temperature = settings.ai_temperature
        self.prompts_dir = Path(settings.prompts_dir)

    def load_prompt(self, name: str) -> str:
        """从 prompts/ 目录加载提示词文件

        Args:
            name: 文件名（不含 .md 后缀）
        """
        prompt_file = self.prompts_dir / f"{name}.md"
        if not prompt_file.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
        return prompt_file.read_text(encoding="utf-8").strip()

    async def complete(
        self,
        prompt: str,
        system_prompt: str = "",
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> str:
        """纯文本补全"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await acompletion(
            model=self.model,
            messages=messages,
            api_key=self.api_key,
            api_base=self.api_base,
            max_tokens=max_tokens or self.max_tokens,
            temperature=temperature if temperature is not None else self.temperature,
        )
        return response.choices[0].message.content

    async def complete_with_image(
        self,
        prompt: str,
        image_data: bytes,
        mime_type: str = "image/png",
        system_prompt: str = "",
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> str:
        """多模态补全（图片 + 文本）

        图片以 base64 data URL 格式编码到 message content 数组中。
        """
        b64 = base64.b64encode(image_data).decode("utf-8")
        data_url = f"data:{mime_type};base64,{b64}"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": data_url}},
                {"type": "text", "text": prompt},
            ],
        })

        response = await acompletion(
            model=self.model,
            messages=messages,
            api_key=self.api_key,
            api_base=self.api_base,
            max_tokens=max_tokens or self.max_tokens,
            temperature=temperature if temperature is not None else self.temperature,
        )
        return response.choices[0].message.content


@lru_cache
def get_llm_service() -> LLMService:
    return LLMService()
