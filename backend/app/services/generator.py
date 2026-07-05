import uuid
import json
import time
import threading
import numpy as np
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

from app.config import settings
from app.models.video_model import model_instance
from app.models.schemas import GenerationRequest
from app.services.storage import upload_video


class JobTracker:
    def __init__(self):
        self._jobs: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create(self, job_id: str, params: dict) -> dict:
        entry = {
            "job_id": job_id,
            "status": "queued",
            "progress": 0.0,
            "video_url": None,
            "thumbnail_url": None,
            "error": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "params": params,
        }
        with self._lock:
            self._jobs[job_id] = entry
        return entry

    def update(self, job_id: str, **kwargs):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(kwargs)

    def get(self, job_id: str) -> dict | None:
        with self._lock:
            return self._jobs.get(job_id)


jobs = JobTracker()
executor = ThreadPoolExecutor(max_workers=2)


def frames_to_video(frames: np.ndarray, fps: int, output_path: Path):
    """Write numpy frames to an MP4 video file using FFmpeg."""
    import subprocess as sp

    num_frames, height, width, _ = frames.shape

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{width}x{height}",
        "-pix_fmt", "rgb24",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "veryslow",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-level", "5.1",
        str(output_path),
    ]

    proc = sp.Popen(cmd, stdin=sp.PIPE, stderr=sp.PIPE)
    proc.stdin.write(frames.tobytes())
    proc.stdin.close()
    proc.wait()

    if proc.returncode != 0:
        err = proc.stderr.read().decode()
        raise RuntimeError(f"FFmpeg failed: {err}")


def generate_video_task(job_id: str, req: GenerationRequest):
    try:
        jobs.update(job_id, status="generating", progress=0.05)

        num_frames = req.num_frames or (req.duration * req.fps)

        frames = model_instance.generate(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            width=req.width,
            height=req.height,
            fps=req.fps,
            num_frames=num_frames,
            guidance_scale=req.guidance_scale,
            num_inference_steps=req.num_inference_steps,
            seed=req.seed,
        )

        jobs.update(job_id, status="encoding", progress=0.8)

        output_dir = Path(settings.output_dir) / job_id
        output_dir.mkdir(parents=True, exist_ok=True)
        video_path = output_dir / "output.mp4"

        frames_to_video(frames, req.fps, video_path)

        jobs.update(job_id, status="uploading", progress=0.95)

        if settings.cloud_storage_enabled:
            video_url = upload_video(video_path, f"videos/{job_id}/output.mp4")
        else:
            video_url = f"/api/videos/{job_id}/output.mp4"

        jobs.update(
            job_id,
            status="completed",
            progress=1.0,
            video_url=video_url,
            completed_at=datetime.now(timezone.utc).isoformat(),
        )

    except Exception as e:
        jobs.update(
            job_id,
            status="failed",
            error=str(e),
            completed_at=datetime.now(timezone.utc).isoformat(),
        )


def start_generation(req: GenerationRequest) -> str:
    job_id = str(uuid.uuid4())
    params = req.model_dump()
    params.pop("callback_url", None)
    jobs.create(job_id, params)
    executor.submit(generate_video_task, job_id, req)
    return job_id
