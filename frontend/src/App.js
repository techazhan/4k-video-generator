import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = '/api';

const STYLE_OPTIONS = [
  { id: 'cinematic', label: 'Cinematic', icon: '🎬', desc: 'Film grain, dramatic lighting, anamorphic' },
  { id: 'anime', label: 'Anime', icon: '🦊', desc: 'Cel-shaded, vibrant, manga aesthetic' },
  { id: 'realistic', label: 'Realistic', icon: '📷', desc: 'Photorealistic, natural, 8K detail' },
  { id: '3d-render', label: '3D Render', icon: '🧊', desc: 'Octane render, ray traced, hyperreal' },
  { id: 'pixel-art', label: 'Pixel Art', icon: '🕹️', desc: '8-bit retro, chunky pixels, game aesthetic' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🌃', desc: 'Neon, rain, holographic, dystopian' },
  { id: 'vintage-film', label: 'Vintage Film', icon: '🎞️', desc: '16mm grain, warm tones, nostalgic' },
  { id: 'fantasy', label: 'Fantasy', icon: '🧙', desc: 'Ethereal, magical glow, mythical' },
  { id: 'horror', label: 'Horror', icon: '👻', desc: 'Dark, eerie, unsettling, shadowy' },
  { id: 'documentary', label: 'Documentary', icon: '🌍', desc: 'Natural light, handheld, raw' },
];

const RESOLUTIONS = [
  { w: 3840, h: 2160, label: '4K UHD' },
  { w: 1920, h: 1080, label: '1080p' },
  { w: 1280, h: 720, label: '720p' },
  { w: 854, h: 480, label: '480p' },
  { w: 640, h: 360, label: '360p' },
];

const TYPEWRITER_PROMPTS = [
  'A cinematic aerial shot of a futuristic cyberpunk city at sunset with neon lights reflecting on wet streets...',
  'A majestic dragon soaring above misty mountains at golden hour, cinematic lighting...',
  'Slow motion shot of waves crashing against volcanic black sand beach, documentary style...',
  'Anime-style magical girl transformation sequence with sparkling light particles...',
  'Time-lapse of a bustling Tokyo street crossing at night with rain and reflections...',
];

function App() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [resolution, setResolution] = useState(RESOLUTIONS[4]);
  const [fps, setFps] = useState(24);
  const [duration, setDuration] = useState(5);
  const [guidanceScale, setGuidanceScale] = useState(7);
  const [steps, setSteps] = useState(50);
  const [seed, setSeed] = useState('');

  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);

  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const pollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTypewriterIndex((prev) => {
        const nextIdx = (prev + 1) % TYPEWRITER_PROMPTS.length;
        setCharIndex(0);
        setTypewriterText('');
        return nextIdx;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentPrompt = TYPEWRITER_PROMPTS[typewriterIndex];
    if (charIndex < currentPrompt.length) {
      const timer = setTimeout(() => {
        setTypewriterText(currentPrompt.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [charIndex, typewriterIndex]);

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
        style: selectedStyle,
        width: resolution.w,
        height: resolution.h,
        fps,
        duration,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
        seed: seed ? parseInt(seed) : null,
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
            setHistory((prev) => [
              {
                id,
                prompt: prompt.slice(0, 80),
                style: selectedStyle,
                videoUrl: job.video_url,
                timestamp: new Date().toLocaleTimeString(),
              },
              ...prev,
            ]);
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
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to start generation');
      setStatus('error');
    }
  }, [prompt, negativePrompt, selectedStyle, resolution, fps, duration, guidanceScale, steps, seed]);

  const cancelGeneration = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setStatus('idle');
    setJobId(null);
    setProgress(0);
  }, []);

  const isLoading = ['submitting', 'queued', 'generating', 'encoding', 'uploading'].includes(status);

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">✦</span>
          <h1>AI Video Forge</h1>
        </div>
        <p className="subtitle">Generate cinematic 4K videos from text prompts</p>
      </header>

      <main className="main">
        <section className="panel input-panel">
          <div className="panel-header">
            <h2>Prompt Studio</h2>
          </div>

          <div className="field">
            <span>Prompt <em>(required)</em></span>
            <div className="typewriter-wrapper">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder=""
                rows={4}
                disabled={isLoading}
                className="prompt-textarea"
              />
              {!prompt && (
                <div className="typewriter-overlay" onClick={() => textareaRef.current?.focus()}>
                  <span className="typewriter-text">{typewriterText}</span>
                  <span className="typewriter-cursor">|</span>
                </div>
              )}
            </div>
          </div>

          <div className="field">
            <span>Negative Prompt <span className="badge">optional</span></span>
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="blurry, low quality, distorted, bad anatomy, ugly"
              rows={2}
              disabled={isLoading}
              className="neg-prompt"
            />
          </div>

          <div className="field">
            <span>Style <em>pick a mood</em></span>
            <div className="style-grid">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  className={`style-card ${selectedStyle === s.id ? 'active' : ''}`}
                  onClick={() => setSelectedStyle(s.id)}
                  disabled={isLoading}
                >
                  <span className="style-icon">{s.icon}</span>
                  <span className="style-label">{s.label}</span>
                  <span className="style-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <span>Resolution</span>
              <select value={`${resolution.w}x${resolution.h}`} onChange={e => {
                const [w, h] = e.target.value.split('x').map(Number);
                const found = RESOLUTIONS.find(r => r.w === w && r.h === h) || RESOLUTIONS[4];
                setResolution(found);
              }} disabled={isLoading}>
                {RESOLUTIONS.map(r => (
                  <option key={r.label} value={`${r.w}x${r.h}`}>{r.label} ({r.w}x{r.h})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>FPS</span>
              <select value={fps} onChange={e => setFps(Number(e.target.value))} disabled={isLoading}>
                {[8, 12, 16, 24, 30, 48, 60].map(f => (
                  <option key={f} value={f}>{f} fps</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <span>Duration (seconds)</span>
              <input type="range" min={1} max={30} value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={isLoading} />
              <div className="range-label">{duration}s</div>
            </div>
            <div className="field">
              <span>Inference Steps</span>
              <input type="range" min={10} max={150} step={5} value={steps} onChange={e => setSteps(Number(e.target.value))} disabled={isLoading} />
              <div className="range-label">{steps} steps</div>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <span>Guidance Scale</span>
              <input type="range" min={1} max={30} step={0.5} value={guidanceScale} onChange={e => setGuidanceScale(Number(e.target.value))} disabled={isLoading} />
              <div className="range-label">{guidanceScale}</div>
            </div>
            <div className="field">
              <span>Seed <span className="badge">optional</span></span>
              <input type="text" value={seed} onChange={e => setSeed(e.target.value.replace(/\D/g, ''))} placeholder="random" disabled={isLoading} />
            </div>
          </div>

          <div className="actions">
            {!isLoading ? (
              <button className="btn btn-primary" onClick={startGeneration} disabled={!prompt.trim()}>
                <span className="btn-icon">▶</span>
                Generate Video
              </button>
            ) : (
              <button className="btn btn-danger" onClick={cancelGeneration}>
                <span className="btn-icon">■</span>
                Cancel Generation
              </button>
            )}
          </div>
        </section>

        <section className="panel result-panel">
          <div className="panel-header">
            <h2>Output</h2>
          </div>

          {isLoading && (
            <div className="status-bar">
              <div className="status-label">
                <span className={`status-dot ${status}`} />
                <strong>{status.charAt(0).toUpperCase() + status.slice(1)}</strong>
              </div>
              {(status === 'generating' || status === 'encoding' || status === 'uploading') && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.max(progress * 100, 5)}%` }} />
                </div>
              )}
              {message && <p className="message">{message}</p>}
            </div>
          )}

          {error && (
            <div className="error-bar">
              <span className="error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {videoUrl && (
            <div className="video-container">
              <div className="video-wrapper">
                <video controls autoPlay className="video-player" key={videoUrl}>
                  <source src={videoUrl} type="video/mp4" />
                </video>
              </div>
              <div className="video-actions">
                <a href={videoUrl} download className="btn btn-download">
                  <span className="btn-icon">↓</span>
                  Download MP4
                </a>
                <button className="btn btn-secondary" onClick={() => {
                  setVideoUrl(null);
                  setStatus('idle');
                }}>
                  <span className="btn-icon">✕</span>
                  Clear
                </button>
              </div>
            </div>
          )}

          {!videoUrl && !isLoading && !error && status === 'idle' && (
            <div className="placeholder">
              <div className="placeholder-graphic">
                <div className="pulse-ring" />
                <span className="placeholder-icon">✦</span>
              </div>
              <p className="placeholder-title">Ready to Create</p>
              <p className="placeholder-text">Write a prompt, choose a style, and generate your video</p>
              <div className="placeholder-tips">
                <span>💡 Try: "cinematic aerial shot of a futuristic city"</span>
              </div>
            </div>
          )}

          {history.length > 0 && !isLoading && (
            <div className="history-section">
              <h3>Recent Generations</h3>
              <div className="history-list">
                {history.map((h) => (
                  <div key={h.id} className="history-item">
                    <span className="history-style-badge">{h.style}</span>
                    <span className="history-prompt">"{h.prompt}"</span>
                    <span className="history-time">{h.timestamp}</span>
                    <button className="history-play" onClick={() => setVideoUrl(h.videoUrl)}>▶</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
