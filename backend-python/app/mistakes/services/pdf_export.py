"""PDF 导出服务"""

import io
import logging
from datetime import datetime
from typing import Optional

from app.mistakes.models import MistakeQuestion
from app.common.services import get_storage_service

logger = logging.getLogger(__name__)

# 学科名称映射
SUBJECT_NAMES = {
    "math": "数学",
    "chinese": "语文",
    "english": "英语",
    "physics": "物理",
    "chemistry": "化学",
    "biology": "生物",
    "other": "其他",
}

# 难度名称映射
DIFFICULTY_NAMES = {
    "easy": "简单",
    "medium": "中等",
    "hard": "困难",
}


async def generate_mistakes_pdf(
    mistakes: list[MistakeQuestion],
    title: str = "错题本",
    include_images: bool = True,
) -> bytes:
    """生成错题 PDF

    Args:
        mistakes: 错题列表
        title: PDF 标题
        include_images: 是否包含图片

    Returns:
        PDF 文件的二进制数据
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
            Image,
            PageBreak,
        )
    except ImportError:
        logger.error("reportlab not installed, please run: pip install reportlab")
        raise

    # 尝试注册中文字体
    # 优先使用系统字体，如果没有则使用默认字体
    chinese_font = "Helvetica"
    font_paths = [
        "/System/Library/Fonts/PingFang.ttc",  # macOS
        "/System/Library/Fonts/STHeiti Light.ttc",  # macOS
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",  # Linux
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",  # Linux
        "C:/Windows/Fonts/msyh.ttc",  # Windows
    ]

    for font_path in font_paths:
        try:
            import os
            if os.path.exists(font_path):
                pdfmetrics.registerFont(TTFont("ChineseFont", font_path))
                chinese_font = "ChineseFont"
                break
        except Exception:
            continue

    # 创建 PDF 文档
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    # 获取样式
    styles = getSampleStyleSheet()

    # 创建中文样式
    title_style = ParagraphStyle(
        "ChineseTitle",
        parent=styles["Heading1"],
        fontName=chinese_font,
        fontSize=18,
        spaceAfter=20,
    )
    heading_style = ParagraphStyle(
        "ChineseHeading",
        parent=styles["Heading2"],
        fontName=chinese_font,
        fontSize=14,
        spaceBefore=10,
        spaceAfter=5,
    )
    normal_style = ParagraphStyle(
        "ChineseNormal",
        parent=styles["Normal"],
        fontName=chinese_font,
        fontSize=10,
        leading=14,
    )

    # 构建内容
    elements = []

    # 标题
    elements.append(Paragraph(title, title_style))
    elements.append(Paragraph(
        f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        normal_style
    ))
    elements.append(Spacer(1, 20))

    storage = get_storage_service()

    # 遍历错题
    for i, mistake in enumerate(mistakes, 1):
        # 题目标题
        subject_name = SUBJECT_NAMES.get(mistake.subject, "其他")
        difficulty_name = DIFFICULTY_NAMES.get(mistake.difficulty, "中等")
        elements.append(Paragraph(
            f"{i}. {mistake.title} [{subject_name}] [{difficulty_name}]",
            heading_style
        ))

        # 图片
        if include_images and mistake.image_paths:
            for image_path in mistake.image_paths:
                try:
                    image_data = storage.download_file(image_path)
                    if image_data:
                        img_buffer = io.BytesIO(image_data)
                        img = Image(img_buffer, width=14*cm, height=10*cm, kind="bound")
                        elements.append(img)
                        elements.append(Spacer(1, 10))
                except Exception as e:
                    logger.warning(f"Failed to load image {image_path}: {e}")

        # 题目内容
        if mistake.question_content:
            elements.append(Paragraph(f"<b>题目:</b> {mistake.question_content}", normal_style))
            elements.append(Spacer(1, 5))

        # 我的答案
        if mistake.my_answer:
            elements.append(Paragraph(f"<b>我的答案:</b> {mistake.my_answer}", normal_style))
            elements.append(Spacer(1, 5))

        # 正确答案
        if mistake.answer_content:
            elements.append(Paragraph(f"<b>正确答案:</b> {mistake.answer_content}", normal_style))
            elements.append(Spacer(1, 5))

        # 解析
        if mistake.analysis:
            elements.append(Paragraph(f"<b>解析:</b> {mistake.analysis}", normal_style))
            elements.append(Spacer(1, 5))

        # 知识点标签
        if mistake.tags:
            tags_str = " ".join([f"#{tag}" for tag in mistake.tags])
            elements.append(Paragraph(f"<b>知识点:</b> {tags_str}", normal_style))
            elements.append(Spacer(1, 5))

        # 笔记
        if mistake.notes:
            elements.append(Paragraph(f"<b>笔记:</b> {mistake.notes}", normal_style))

        elements.append(Spacer(1, 20))

        # 每5道题分页
        if i % 5 == 0 and i < len(mistakes):
            elements.append(PageBreak())

    # 生成 PDF
    doc.build(elements)

    return buffer.getvalue()
