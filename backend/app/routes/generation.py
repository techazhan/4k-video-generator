from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from app.models.schemas import (
    GenerationRequest,
    GenerationResponse,
    JobStatusResponse,
    ModelInfoResponse,
)
from app.models.video_model import model_instance, STYLE_PROMPTS
from app.services.generator import start_generation, jobs
from app.config import settings

router = APIRouter()


@router.post("/generate", response_model=GenerationResponse)
async def create_generation(req: GenerationRequest):
    job_id = start_generation(req)
    frames = req.num_frames or req.duration * req.fps
    return GenerationResponse(
        job_id=job_id,
        status="queued",
        message=f"Generating {req.style} video: \"{req.prompt[:60]}...\"",
        estimated_time=int(frames * 0.15),
    )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(**job)


@router.get("/videos/{job_id}/{filename}")
async def serve_video(job_id: str, filename: str):
    video_path = Path(settings.output_dir) / job_id / filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(video_path), media_type="video/mp4")


@router.get("/styles")
async def list_styles():
    return {
        "styles": [
            {"id": k, "name": k.replace("-", " ").title(), "description": v}
            for k, v in STYLE_PROMPTS.items()
        ]
    }


@router.get("/model/info", response_model=ModelInfoResponse)
async def get_model_info():
    return ModelInfoResponse(
        model_name="YourCustomModel",
        model_version="1.0.0",
        device=settings.model_device,
        supported_resolutions=["3840x2160", "1920x1080", "1280x720", "854x480", "640x360"],
        supported_styles=list(STYLE_PROMPTS.keys()),
        max_frames=settings.max_video_duration * settings.fps,
        is_loaded=model_instance.is_loaded,
        uptime="N/A",
    )


@router.get("/health")
async def health_check():
    return {"status": "ok", "model_loaded": model_instance.is_loaded}
