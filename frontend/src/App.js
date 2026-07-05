import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = '/api';

function App() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [width, setWidth] = useState(3840);
  const [height, setHeight] = useState(2160);
  const [fps, setFps] = useState(24);
  const [duration, setDuration] = useState(5);
  const [guidanceScale, setGuidanceScale] = useState(7);
  const [steps, setSteps] = useState(50);

  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const pollRef = useRef(null);

  const startGeneration = useCallback(async () => {
    if (!prompt.trim()) return;

    setStatus('submitting');
    setError(null);
    setVideoUrl(null);
    setProgress(0);

    try {
      const res = await axios.post(`${API_BASE}/generate`, {
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        fps,
        duration,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
      });

      const id = res.data.job_id;
      setJobId(id);
      setStatus('queued');
      setMessage(res.data.message);

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API_BASE}/status/${id}`);
          const job = statusRes.data;
          setStatus(job.status);
          setProgress(job.progress);

          if (job.status === 'completed') {
            clearInterval(pollRef.current);
            setVideoUrl(job.video_url);
            setMessage('Video generated successfully!');
          } else if (job.status === 'failed') {
            clearInterval(pollRef.current);
            setError(job.error || 'Generation failed');
            setMessage('');
          }
        } catch (err) {
          clearInterval(pollRef.current);
          setError('Failed to check job status');
          setStatus('error');
        }
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to start generation');
      setStatus('error');
    }
  }, [prompt, negativePrompt, width, height, fps, duration, guidanceScale, steps]);

  const cancelGeneration = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setStatus('idle');
    setJobId(null);
    setProgress(0);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>4K Video Generator</h1>
        <p className="subtitle">Generate high-quality videos with your AI model</p>
      </header>

      <main className="main">
        <section className="panel input-panel">
          <h2>Generation Parameters</h2>

          <label className="field">
            <span>Prompt <em>(required)</em></span>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="A cinematic aerial shot of a futuristic city at sunset..."
              rows={3}
              disabled={status === 'submitting' || status === 'generating' || status === 'encoding' || status === 'uploading'}
            />
          </label>

          <label className="field">
            <span>Negative Prompt</span>
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="blurry, low quality, distorted faces, artifacts"
              rows={2}
              disabled={status === 'submitting' || status === 'generating' || status === 'encoding' || status === 'uploading'}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Width</span>
              <select value={width} onChange={e => setWidth(Number(e.target.value))} disabled={loadingStates.includes(status)}>
                <option value={7680}>7680 (8K)</option>
                <option value={3840}>3840 (4K)</option>
                <option value={1920}>1920 (1080p)</option>
                <option value={1280}>1280 (720p)</option>
              </select>
            </label>
            <label className="field">
              <span>Height</span>
              <select value={height} onChange={e => setHeight(Number(e.target.value))} disabled={loadingStates.includes(status)}>
                <option value={4320}>4320 (8K)</option>
                <option value={2160}>2160 (4K)</option>
                <option value={1080}>1080 (1080p)</option>
                <option value={720}>720 (720p)</option>
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>FPS</span>
              <input type="number" value={fps} min={8} max={60} onChange={e => setFps(Number(e.target.value))} disabled={loadingStates.includes(status)} />
            </label>
            <label className="field">
              <span>Duration (sec)</span>
              <input type="number" value={duration} min={1} max={30} onChange={e => setDuration(Number(e.target.value))} disabled={loadingStates.includes(status)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Guidance Scale</span>
              <input type="number" value={guidanceScale} min={1} max={30} step={0.5} onChange={e => setGuidanceScale(Number(e.target.value))} disabled={loadingStates.includes(status)} />
            </label>
            <label className="field">
              <span>Inference Steps</span>
              <input type="number" value={steps} min={1} max={200} onChange={e => setSteps(Number(e.target.value))} disabled={loadingStates.includes(status)} />
            </label>
          </div>

          <div className="actions">
            {status === 'idle' || status === 'error' ? (
              <button className="btn btn-primary" onClick={startGeneration} disabled={!prompt.trim()}>
                Generate Video
              </button>
            ) : (
              <button className="btn btn-danger" onClick={cancelGeneration}>
                Cancel
              </button>
            )}
          </div>
        </section>

        <section className="panel result-panel">
          <h2>Output</h2>

          {status !== 'idle' && (
            <div className="status-bar">
              <div className="status-label">
                Status: <strong>{status}</strong>
                {status === 'queued' && <span className="spinner" />}
                {status === 'generating' && <span className="spinner" />}
                {status === 'encoding' && <span className="spinner" />}
                {status === 'uploading' && <span className="spinner" />}
              </div>
              {(status === 'generating' || status === 'encoding' || status === 'uploading') && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
                </div>
              )}
              {message && <p className="message">{message}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          )}

          {videoUrl && (
            <div className="video-container">
              <video controls autoPlay className="video-player">
                <source src={videoUrl} type="video/mp4" />
              </video>
              <a href={videoUrl} download className="btn btn-download">
                Download Video
              </a>
            </div>
          )}

          {!videoUrl && status === 'idle' && (
            <div className="placeholder">
              <div className="placeholder-icon">🎬</div>
              <p>Enter a prompt and click "Generate Video" to start</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const loadingStates = ['submitting', 'queued', 'generating', 'encoding', 'uploading'];

export default App;
