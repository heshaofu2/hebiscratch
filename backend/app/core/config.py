from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 3001
    debug: bool = True

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "scratch"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # JWT
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    # AI / LLM
    ai_model: str = "gemini/gemini-3-pro-preview"
    ai_api_key: str = ""
    ai_api_base: str = ""
    ai_max_tokens: int = 16384
    ai_temperature: float = 0.3
    prompts_dir: str = "prompts"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "scratch-assets"
    minio_secure: bool = False

    class Config:
        env_file = (".env", "../.env")
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
