# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Development (auto-reload)
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Start production server
npm start

# Docker development (includes PostgreSQL)
docker-compose up --build
```

## Architecture

Express.js + TypeScript backend for a Gemini AI chatbot with image generation.

### Request Flow
```
Routes → Controllers → Services → Gemini API
                    ↘ Database (PostgreSQL)
```

### Key Components

**src/services/gemini-service.ts** - Core AI integration:
- `gemini-1.5-flash` for chat and intent classification
- `gemini-2.0-flash-exp` for image generation
- AI-powered intent classifier detects when user wants image generation (including Vietnamese)
- In-memory chat session cache (`chatSessions` Map)

**src/config/db.ts** - PostgreSQL helpers:
- `query<T>()` - returns array
- `queryOne<T>()` - returns single or null
- Pool connection with env vars

### API Routes

- `/api/chat/*` - Chat session CRUD + streaming messages
- `/api/images/*` - Direct image generation endpoint
- `/health` - Health check

### Streaming Response Pattern

Chat endpoint supports SSE streaming:
```typescript
res.setHeader('Content-Type', 'text/event-stream');
// Image chunks: {type: 'image', imageId, imageUrl}
// Text chunks: {type: 'text', text, done: false}
// Done: {type: 'done', done: true}
```

## Environment Variables

Required: `GEMINI_API_KEY`

Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (defaults: localhost:5432, postgres/postgres, chat_db)

## Database Schema

Tables: `users`, `chat_sessions`, `messages`, `images` (see `db/init.sql`)
