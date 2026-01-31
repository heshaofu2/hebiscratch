from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserListItem(BaseModel):
    """用户列表项"""

    id: str = Field(..., alias="_id")
    username: str
    avatar: Optional[str] = None
    role: str
    is_active: bool = Field(..., alias="isActive")
    created_at: datetime = Field(..., alias="createdAt")

    class Config:
        populate_by_name = True


class UserDetail(BaseModel):
    """用户详情（含项目数）"""

    id: str = Field(..., alias="_id")
    username: str
    avatar: Optional[str] = None
    role: str
    is_active: bool = Field(..., alias="isActive")
    project_count: int = Field(..., alias="projectCount")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True


class UserCreate(BaseModel):
    """创建用户请求"""

    username: str = Field(..., min_length=2, max_length=20)
    password: str = Field(..., min_length=6, max_length=50)
    role: str = Field(default="user", pattern="^(user|admin)$")
    is_active: bool = True


class UserUpdate(BaseModel):
    """更新用户请求"""

    username: Optional[str] = Field(None, min_length=2, max_length=20)
    role: Optional[str] = Field(None, pattern="^(user|admin)$")
    is_active: Optional[bool] = None


class PasswordReset(BaseModel):
    """重置密码请求"""

    new_password: str = Field(..., min_length=6, max_length=50)


class PaginatedUsers(BaseModel):
    """分页用户列表响应"""

    items: list[UserListItem]
    total: int
    page: int
    page_size: int = Field(..., alias="pageSize")
    total_pages: int = Field(..., alias="totalPages")

    class Config:
        populate_by_name = True
