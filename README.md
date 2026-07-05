# 4K Video Generator

AI-powered video generation pipeline with a browser frontend and FastAPI backend.

## Architecture

```
┌──────────┐     HTTP      ┌──────────┐     ┌──────────────┐
│  Frontend │ ──────────▶ │  Backend  │ ──▶ │  Your Model   │
│  (React)  │ ◀────────── │ (FastAPI) │ ◀── │ (PyTorch/ML)  │
└──────────┘              └──────────┘     └──────────────┘
                                │
                                ▼
                          ┌──────────┐
                          │   Cloud   │
                          │  Storage  │
                          └──────────┘
```

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/4k-video-generator.git
cd 4k-video-generator

# 2. Configure
cp .env.example .env
# Edit .env with your model path and cloud storage settings

# 3. Place your model weights
# Copy your model checkpoint to ./models/your_model.pt

# 4. Run with Docker
docker compose up --build
```

## Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint                | Description               |
|--------|-------------------------|---------------------------|
| POST   | `/api/generate`         | Submit a generation job   |
| GET    | `/api/status/{job_id}`  | Poll job status           |
| GET    | `/api/model/info`       | Model information         |
| GET    | `/api/health`           | Health check              |

## Customizing the Model

Edit `backend/app/models/video_model.py` to integrate your own model. Search for `# ── Replace ──` comments — those are the sections you need to swap with your model's load and inference code.

## Storage

Generated videos can be:
- Stored locally (set `CLOUD_STORAGE_ENABLED=false`)
- Uploaded to S3-compatible storage (AWS, MinIO, DigitalOcean Spaces)
- Served via CDN (CloudFront)

## License

MIT
