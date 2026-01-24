from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    """用户注册请求"""

    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """用户登录请求"""

    username: str
    password: str


class UserResponse(BaseModel):
    """用户响应"""

    id: str = Field(..., alias="_id")
    username: str
    avatar: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


class AuthResponse(BaseModel):
    """认证响应"""

    user: UserResponse
    token: str
