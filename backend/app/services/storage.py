import io
from functools import lru_cache
from typing import Optional

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings


class StorageService:
    """MinIO 存储服务"""

    def __init__(self):
        settings = get_settings()
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self.bucket = settings.minio_bucket
        self._ensure_bucket()

    def _ensure_bucket(self):
        """确保 bucket 存在"""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                print(f'Bucket "{self.bucket}" created successfully')
            else:
                print(f'Bucket "{self.bucket}" already exists')
        except S3Error as e:
            print(f"Error creating bucket: {e}")

    def upload_file(
        self,
        file_data: bytes,
        object_name: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """上传文件"""
        try:
            self.client.put_object(
                self.bucket,
                object_name,
                io.BytesIO(file_data),
                length=len(file_data),
                content_type=content_type,
            )
            return f"{self.bucket}/{object_name}"
        except S3Error as e:
            raise Exception(f"Failed to upload file: {e}")

    def download_file(self, object_name: str) -> Optional[bytes]:
        """下载文件"""
        try:
            response = self.client.get_object(self.bucket, object_name)
            return response.read()
        except S3Error:
            return None
        finally:
            if 'response' in locals():
                response.close()
                response.release_conn()

    def delete_file(self, object_name: str) -> bool:
        """删除文件"""
        try:
            self.client.remove_object(self.bucket, object_name)
            return True
        except S3Error:
            return False

    def get_presigned_url(self, object_name: str, expires_hours: int = 1) -> str:
        """获取预签名 URL"""
        from datetime import timedelta

        try:
            return self.client.presigned_get_object(
                self.bucket,
                object_name,
                expires=timedelta(hours=expires_hours),
            )
        except S3Error as e:
            raise Exception(f"Failed to generate presigned URL: {e}")

    def file_exists(self, object_name: str) -> bool:
        """检查文件是否存在"""
        try:
            self.client.stat_object(self.bucket, object_name)
            return True
        except S3Error:
            return False


@lru_cache
def get_storage_service() -> StorageService:
    return StorageService()
