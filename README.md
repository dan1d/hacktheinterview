# ⚡ HackTheInterview

AI-powered real-time interview assistant — transcribes interviewer questions and generates suggested answers in real-time.

[![tests](https://img.shields.io/github/actions/workflow/status/dan1d/hacktheinterview/ci.yml?label=tests)](https://github.com/dan1d/hacktheinterview/actions)
[![coverage](https://img.shields.io/codecov/c/github/dan1d/hacktheinterview)](https://codecov.io/gh/dan1d/hacktheinterview)
[![license](https://img.shields.io/github/license/dan1d/hacktheinterview)](./LICENSE)

## How it works

```
[Phone/Browser — MIC]  →  audio via WebSocket  →  [Node Backend]
                                                       ↓
                                                  Deepgram (transcription)
                                                       ↓
                                                  DeepSeek / Claude (answers)
                                                       ↓
[Desktop/Browser — READER]  ←  answers via WebSocket  ←
```

1. **Create a session** — pick interview type (Ruby, Python, System Design, etc.), paste context/job description, upload your resume PDF
2. **Calibrate** — speak for 10 seconds so the system learns your voice and filters it out
3. **Go live** — place your phone near the audio source; it streams to the backend
4. **Read answers** — open the same session URL on your desktop to see live transcription + AI-suggested answers

## Quick start

```bash
# Clone
git clone https://github.com/dan1d/hacktheinterview.git
cd hacktheinterview

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run (starts both server and client)
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPGRAM_API_KEY` | Yes | [Deepgram](https://deepgram.com) API key (free tier: 45hrs/month) |
| `DEEPSEEK_API_KEY` | Yes | [DeepSeek](https://platform.deepseek.com) API key |
| `PORT` | No | Server port (default: 3001) |

## Commands

```bash
npm run dev           # Start server + client in dev mode
npm run dev:server    # Start server only (tsx watch)
npm run dev:client    # Start client only (vite)
npm run build:client  # Build client for production
npm start             # Start production server
npm test              # Run tests
npm run test:coverage # Run tests with coverage
npm run test:watch    # Run tests in watch mode
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Backend | Node.js + Hono + WebSocket |
| Transcription | Deepgram (Nova-2, streaming) |
| AI Answers | DeepSeek (swappable to Claude) |
| Resume Parsing | pdf-parse |
| Deployment | Docker + Fly.io |
| Tests | Vitest + v8 coverage |

## Features

- **Real-time transcription** — Deepgram streaming with interim + final results
- **Speaker diarization** — calibrate your voice, only transcribe the interviewer
- **AI answer generation** — streaming answers as questions come in
- **Configurable interview type** — Ruby, Python, JS/TS, Go, Java, System Design, Behavioral, DevOps, SQL, or custom
- **Resume context** — upload PDF resume for personalized answers
- **Custom instructions** — paste job description or any context
- **Two-panel reader view** — transcript on the left, AI answers on the right
- **Session-based** — share a single URL across devices

## Deployment

```bash
# Deploy to Fly.io
fly launch
fly secrets set DEEPGRAM_API_KEY=... DEEPSEEK_API_KEY=...
fly deploy
```

## License

[MIT](./LICENSE)
