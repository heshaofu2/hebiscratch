"""提示词管理器 - 支持模板变量替换"""

import logging
from functools import lru_cache
from pathlib import Path
from string import Template
from typing import Any

import yaml

logger = logging.getLogger(__name__)

# 提示词模板目录
TEMPLATES_DIR = Path(__file__).parent / "templates"


class PromptManager:
    """提示词管理器

    支持:
    - YAML 文件存储提示词模板
    - 变量替换 (使用 $variable 或 ${variable} 语法)
    - 按模块分类管理
    """

    def __init__(self, templates_dir: Path = TEMPLATES_DIR):
        self.templates_dir = templates_dir
        self._cache: dict[str, dict] = {}
        self._load_all_templates()

    def _load_all_templates(self) -> None:
        """加载所有提示词模板文件"""
        if not self.templates_dir.exists():
            logger.warning(f"Templates directory not found: {self.templates_dir}")
            return

        for yaml_file in self.templates_dir.glob("*.yaml"):
            module_name = yaml_file.stem
            try:
                with open(yaml_file, encoding="utf-8") as f:
                    self._cache[module_name] = yaml.safe_load(f) or {}
                logger.info(f"Loaded prompts from {yaml_file.name}")
            except Exception as e:
                logger.error(f"Failed to load {yaml_file}: {e}")

    def reload(self) -> None:
        """重新加载所有模板（用于开发时热更新）"""
        self._cache.clear()
        self._load_all_templates()

    def get(self, key: str, **variables: Any) -> str:
        """获取提示词并替换变量

        Args:
            key: 提示词键名，格式为 "module.prompt_name" 或 "module.prompt_name.sub_key"
            **variables: 要替换的变量

        Returns:
            替换变量后的提示词文本

        Raises:
            KeyError: 提示词不存在

        Example:
            >>> manager.get("mistakes.extract_question", language="中文")
            >>> manager.get("mistakes.extract_question.system")
        """
        parts = key.split(".")
        if len(parts) < 2:
            raise KeyError(f"Invalid prompt key format: {key}. Expected 'module.name'")

        module = parts[0]
        if module not in self._cache:
            raise KeyError(f"Prompt module not found: {module}")

        # 逐级查找
        value = self._cache[module]
        for part in parts[1:]:
            if not isinstance(value, dict) or part not in value:
                raise KeyError(f"Prompt not found: {key}")
            value = value[part]

        if not isinstance(value, str):
            raise KeyError(f"Prompt value is not a string: {key}")

        # 使用 Template 进行变量替换
        template = Template(value)
        try:
            return template.substitute(variables)
        except KeyError as e:
            # 如果有未提供的变量，使用 safe_substitute 保留原始占位符
            logger.warning(f"Missing variable {e} in prompt {key}, using safe_substitute")
            return template.safe_substitute(variables)

    def get_raw(self, key: str) -> str:
        """获取原始提示词模板（不替换变量）"""
        return self.get(key)

    def list_modules(self) -> list[str]:
        """列出所有已加载的模块"""
        return list(self._cache.keys())

    def list_prompts(self, module: str) -> list[str]:
        """列出模块下所有提示词名称"""
        if module not in self._cache:
            return []
        return list(self._cache[module].keys())


# 全局单例
_prompt_manager: PromptManager | None = None


@lru_cache(maxsize=1)
def get_prompt_manager() -> PromptManager:
    """获取提示词管理器单例"""
    global _prompt_manager
    if _prompt_manager is None:
        _prompt_manager = PromptManager()
    return _prompt_manager
