from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.video_model import model_instance
from app.routes.generation import router as generation_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[{settings.app_name}] Starting up...")
    try:
        model_instance.load()
    except FileNotFoundError as e:
        print(f"[WARN] {e}")
        print("[WARN] Model not loaded. Only health-check endpoints will work.")
    yield
    print(f"[{settings.app_name}] Shutting down...")


app = FastAPI(
    title=settings.app_name,
    description="API for generating 4K videos using your custom AI model.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generation_router, prefix="/api")
