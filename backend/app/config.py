import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "4K Video Generator API"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    model_path: str = os.getenv("MODEL_PATH", "")
    model_device: str = os.getenv("MODEL_DEVICE", "cpu")
    model_dtype: str = os.getenv("MODEL_DTYPE", "float32")

    output_dir: str = os.getenv("OUTPUT_DIR", "C:\\Users\\Usmani Sir\\4k-video-generator\\outputs")
    max_video_duration: int = int(os.getenv("MAX_VIDEO_DURATION", "30"))
    max_resolution: str = os.getenv("MAX_RESOLUTION", "3840x2160")
    fps: int = int(os.getenv("FPS", "24"))

    cloud_storage_enabled: bool = os.getenv("CLOUD_STORAGE_ENABLED", "false").lower() == "true"
    s3_bucket: str = os.getenv("S3_BUCKET", "your-bucket-name")
    s3_region: str = os.getenv("S3_REGION", "us-east-1")
    s3_access_key: str = os.getenv("S3_ACCESS_KEY", "")
    s3_secret_key: str = os.getenv("S3_SECRET_KEY", "")
    cloudfront_url: str = os.getenv("CLOUDFRONT_URL", "")

    hf_token: str = os.getenv("HF_TOKEN", "")
    replicate_api_key: str = os.getenv("REPLICATE_API_KEY", "")

    class Config:
        env_file = ".env"


settings = Settings()
