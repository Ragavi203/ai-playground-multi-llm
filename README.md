## AI Playground – Multi-LLM Prompt Arena

An AI playground where users can:

- Write a prompt
- Run it against multiple LLMs in parallel (GPT-4, Claude, Gemini, Llama, Mistral, etc.)
- See responses side-by-side in real time (streaming)
- Vote on the best response
- See community rankings (which LLM wins most)
- Save & share prompt experiments via URL
- Track costs per query

This repo is structured as a small monorepo:

- `frontend/` – Next.js app (React, TypeScript, shadcn-style UI, auth, streaming UI)
- `backend/` – Node.js API (Express, SSE streaming, LLM orchestration, PostgreSQL + Redis)

### High-level tech

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, dark mode, streaming UI
- **Backend**: Node.js, Express, SSE for streaming, multi-model orchestration, rate limiting
- **Database**: PostgreSQL (users, prompts, runs, votes, models), Redis (caching & rate-limits)
- **Auth**: NextAuth.js (JWT session), free vs paid tier logic
- **Infra**: Vercel (frontend), Railway/Fly.io (backend + Postgres + Redis), CI via GitHub Actions

> Note: API keys and deployment resources are not committed. You configure them via environment variables as described below.

---

## Getting started (local dev)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local or remote)
- Redis 6+
- pnpm / npm / yarn (examples use `pnpm`)

### 1. Clone & install

```bash
cd AI_PLAYGROUND

cd frontend
pnpm install   # or npm install / yarn

cd ../backend
pnpm install
```

### 2. Environment variables

Copy the example env files and fill them in:

```bash
cd frontend
cp .env.example .env.local

cd ../backend
cp .env.example .env
```

At minimum you will need:

- **Frontend**
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `NEXT_PUBLIC_API_BASE_URL` – URL of the backend service
  - Auth provider keys (e.g. GitHub) if you enable OAuth
- **Backend**
  - `PORT`
  - `DATABASE_URL` – PostgreSQL connection URL
  - `REDIS_URL`
  - LLM provider keys, e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, etc.

### 3. Database

Create a Postgres database (locally or via Railway/Fly/Neon/etc.) and apply the SQL schema from `backend/db/schema.sql`.

```bash
psql "$DATABASE_URL" -f backend/db/schema.sql
```

### 4. Run backend

```bash
cd backend
pnpm dev
```

The backend will start (by default) on `http://localhost:4000`.

### 5. Run frontend

```bash
cd frontend
pnpm dev
```

The frontend will start on `http://localhost:3000`.

---

## Core flows

- **Prompt run**
  - Frontend calls `POST /api/run` on the backend
  - Backend validates auth, rate limits, and model limits based on tier
  - Backend creates a `prompt_run` row and fires parallel calls to configured LLM providers
  - Responses are streamed back to the client via SSE (`/api/stream/:runId`)
  - When complete, backend records per-model usage & cost and updates totals

- **Voting**
  - Users can click a “vote” button on a model response
  - Frontend calls `POST /api/vote` with `runId` and `modelName`
  - Backend writes to `votes` and updates per-model win counters

- **Community rankings**
  - Backend exposes endpoints aggregating wins / runs by model
  - Frontend renders leaderboards and “top prompts”

---

## Deployment overview

- **Frontend (Next.js)**: Deploy to Vercel. Set env vars from `.env.local`. Point `NEXT_PUBLIC_API_BASE_URL` to your backend URL.
- **Backend (Node)**: Deploy to Railway or Fly.io. Attach Postgres & Redis, set `DATABASE_URL` and `REDIS_URL`, and configure LLM API keys.
- **CI/CD**:
  - GitHub Actions workflows (`.github/workflows/*`) lint & build frontend and backend on PRs / main pushes.
  - Optional: auto-deploy to Vercel/Railway using their GitHub integrations.

---

## Status

This skeleton is designed to be production-ready with:

- Clear separation of frontend and backend
- Streaming-capable API for multi-LLM runs
- Extensible database schema for prompts, runs, votes, tiers
- Hooks for plugging in real LLM providers & pricing metadata

Future extension:

- More providers / models
- Experiment templates
- Team workspaces
- Advanced analytics & AB testing


