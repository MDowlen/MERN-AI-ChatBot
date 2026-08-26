# Nexa — MERN AI ChatBot

Nexa is a live, full-stack conversation workspace built with **MongoDB, Express, React, and Node.js**, with production AI responses powered through the OpenAI Responses API.

**Live app:** https://mern-ai-chat-bot-one.vercel.app

## Production status

- React 19 + Vite frontend
- Express 5 REST API on Node.js
- MongoDB Atlas persistence through Mongoose
- OpenAI Responses API integration
- Vercel production deployment
- Conversation creation, deletion, history search, optimistic updates, and error handling
- Responsive desktop/mobile interface

## Architecture

```text
React + Vite
   │
   ├── GET/POST/DELETE /api/conversations
   ├── POST /api/conversations/:id/messages
   │
Express 5 / Node.js
   │
   ├── Mongoose → MongoDB Atlas
   └── OpenAI Responses API
```

## Why I built it

This project demonstrates the full path from UI to API to persistent data to model response in one deployable application. The goal was to show practical full-stack engineering rather than a static AI mockup.

## Key engineering decisions

- A single Vercel project serves both the Vite frontend and Express API.
- MongoDB Atlas stores conversation history so data survives redeploys and serverless restarts.
- Mongoose keeps the conversation schema and persistence layer explicit.
- The frontend uses optimistic updates so messages appear immediately while the server request completes.
- The backend keeps API keys and database credentials server-side in environment variables.
- A deterministic demo fallback remains available for local development when provider credentials are omitted.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The React app runs on `http://localhost:5173` and proxies `/api` to the local Express server on port `3001`.

## Environment variables

| Variable | Required for production | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas persistence |
| `OPENAI_API_KEY` | Yes | Live AI responses |
| `OPENAI_MODEL` | No | Optional model override |
| `PORT` | No | Local API port; defaults to `3001` |

## Verification

```bash
npm run build
npm run check
```

The smoke test checks `/api/health`, creates a conversation, sends a message, and validates the assistant response flow. Production QA also verifies the live conversation endpoint and Vercel runtime logs.

## API surface

- `GET /api/health`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id`
- `DELETE /api/conversations/:id`
- `POST /api/conversations/:id/messages`

## Repository

Source: https://github.com/MDowlen/MERN-AI-ChatBot

## License

MIT © 2026 Mareza Dowlen
