from fastapi import APIRouter, HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas import UserRegister, UserLogin, AuthResponse

from .deps import CurrentUser

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister):
    """用户注册"""
    # 检查用户名是否已存在
    existing_username = await User.find_one(User.username == data.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该用户名已被使用",
        )

    # 创建用户
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
    )
    await user.insert()

    # 生成 token
    token = create_access_token(str(user.id))

    return AuthResponse(
        user=user.to_response(),
        token=token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: UserLogin):
    """用户登录"""
    # 查找用户
    user = await User.find_one(User.username == data.username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    # 验证密码
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    # 生成 token
    token = create_access_token(str(user.id))

    return AuthResponse(
        user=user.to_response(),
        token=token,
    )


@router.get("/me")
async def get_me(current_user: CurrentUser):
    """获取当前用户信息"""
    return current_user.to_response()


@router.post("/logout")
async def logout(current_user: CurrentUser):
    """退出登录"""
    # JWT 是无状态的，客户端删除 token 即可
    # 如需实现 token 黑名单，可使用 Redis
    return {"message": "退出登录成功"}
