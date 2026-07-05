"""
Cloud storage service for uploading generated videos.

Supports S3-compatible storage (AWS, MinIO, DigitalOcean Spaces, etc.)
and local filesystem fallback.
"""

from pathlib import Path
from app.config import settings


def upload_video(local_path: Path, remote_key: str) -> str:
    """
    Upload a video file to cloud storage and return the public URL.

    Falls back to a local path if cloud storage is disabled.
    """
    if not settings.cloud_storage_enabled:
        return f"/api/videos/{remote_key}"

    # ────────────────────────────────────────────────────────────
    # Replace with your cloud storage provider (AWS S3 / GCS / etc.)
    #
    # import boto3
    # s3 = boto3.client(
    #     "s3",
    #     region_name=settings.s3_region,
    #     aws_access_key_id=settings.s3_access_key,
    #     aws_secret_access_key=settings.s3_secret_key,
    # )
    # s3.upload_file(str(local_path), settings.s3_bucket, remote_key)
    #
    # if settings.cloudfront_url:
    #     return f"{settings.cloudfront_url}/{remote_key}"
    # return f"https://{settings.s3_bucket}.s3.{settings.s3_region}.amazonaws.com/{remote_key}"
    # ────────────────────────────────────────────────────────────

    return f"https://storage.example.com/{remote_key}"
