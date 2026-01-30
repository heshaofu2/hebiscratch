from typing import Annotated

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status

from app.common.api import CurrentUser
from app.mistakes.models import MistakeQuestion


async def get_mistake_with_ownership(
    mistake_id: str,
    current_user: CurrentUser,
) -> MistakeQuestion:
    """获取错题并验证所有权

    Raises:
        HTTPException 404: 错题 ID 无效或错题不存在
        HTTPException 403: 当前用户无权访问该错题
    """
    try:
        obj_id = PydanticObjectId(mistake_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="无效的错题 ID",
        )

    mistake = await MistakeQuestion.get(obj_id)

    if mistake is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="错题不存在",
        )

    # 加载 owner 关联
    await mistake.fetch_link(MistakeQuestion.owner)

    # 检查权限
    if mistake.owner.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该错题",
        )

    return mistake


# 错题所有权依赖注入类型
OwnedMistake = Annotated[MistakeQuestion, Depends(get_mistake_with_ownership)]
