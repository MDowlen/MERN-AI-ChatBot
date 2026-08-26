# Nexa — MERN AI ChatBot

A portfolio-ready full-stack conversation workspace built with **MongoDB, Express, React, and Node.js**.

## What this project demonstrates

- React 19 conversation UI with responsive desktop/mobile layouts
- Express 5 REST API running on Node.js
- MongoDB persistence through Mongoose when `MONGODB_URI` is configured
- Graceful demo-memory fallback so the public portfolio deployment remains testable without exposing database credentials
- Optional OpenAI Responses API integration via `OPENAI_API_KEY`
- Vercel-compatible single-project deployment for both frontend and API
- Optimistic UI updates, health status, conversation creation, deletion, history search, and error handling

## Architecture

```text
React + Vite
   │
   ├── GET/POST/DELETE /api/conversations
   ├── POST /api/conversations/:id/messages
   │
Express 5 / Node.js
   │
   ├── Mongoose → MongoDB Atlas (when configured)
   └── OpenAI Responses API (optional)
```

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The React app runs on `http://localhost:5173` and proxies `/api` to the local Express server on port `3001`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | No | Enables MongoDB persistence; without it the app uses demo-memory mode |
| `OPENAI_API_KEY` | No | Enables live model responses; without it the app uses a deterministic demo assistant |
| `OPENAI_MODEL` | No | Defaults to `gpt-5.4-mini` |
| `PORT` | No | Local API port; defaults to `3001` |

## Verification

```bash
npm run build
npm run check
```

The smoke test starts the Express app on an ephemeral port, checks `/api/health`, creates a conversation, posts a message, and confirms the assistant response flow.

## Deployment

This repository includes `vercel.json` so Vercel can build the Vite frontend and route `/api/*` requests to the Express function.

For full persistence, add `MONGODB_URI` in the Vercel project environment settings. For live AI responses, add `OPENAI_API_KEY` as a server-side environment variable.

## License

MIT © 2026 Mareza Dowlen
