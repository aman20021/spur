# Spur Chat — AI Live Chat Agent

A production-grade AI support agent for live chat. Built as a founding engineer take-home for [Spur](https://spur.so).

![Desktop](https://img.shields.io/badge/Desktop-✓-green) ![Mobile](https://img.shields.io/badge/Mobile-✓-green) ![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)

## Demo

The AI agent answers customer questions using Claude, with full conversation history and persistence.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | **Svelte** + TypeScript + Vite |
| Backend | **Node.js** + Express + **TypeScript** |
| Database | **SQLite** (better-sqlite3, WAL mode) |
| LLM | **Claude** (Anthropic API / AWS Bedrock) |
| Validation | Zod |

## Quick Start

```bash
# 1. Clone
git clone git@github.com:aman20021/spur.git
cd spur

# 2. Install all dependencies
npm run setup

# 3. Configure environment
cp server/.env.example server/.env
# Add your ANTHROPIC_API_KEY (or configure AWS Bedrock credentials)

# 4. Run (starts both server + client)
npm run dev
```

- Server: http://localhost:3001
- Client: http://localhost:5173

## Environment Variables

```env
# Option A: Direct Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Option B: AWS Bedrock (auto-discovers credentials from env)
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Server config
PORT=3001
MAX_MESSAGE_LENGTH=2000
MAX_HISTORY_MESSAGES=20
```

## Database

SQLite with WAL mode. Zero config — migrations run automatically on server start.

```bash
cd server
npm run db:migrate   # Creates tables (auto-runs on start)
npm run db:seed      # Seeds FAQ knowledge base (10 entries)
```

**Schema:**
- `conversations` — id, created_at, metadata
- `messages` — id, conversation_id, sender (user|ai), text, created_at
- `faq_knowledge` — id, category, question, answer

## Architecture

```
spur-chat/
├── server/
│   └── src/
│       ├── index.ts              — Express entry point + CORS + migrations
│       ├── config.ts             — Environment config (typed)
│       ├── routes/
│       │   └── chat.ts           — POST /chat/message
│       │                           GET /chat/history/:id
│       │                           GET /chat/conversations
│       │                           DELETE /chat/conversations/:id
│       ├── services/
│       │   ├── conversation.ts   — CRUD: create, get, addMessage, getHistory
│       │   ├── knowledge.ts      — FAQ knowledge base → prompt context
│       │   └── llm.ts            — Claude API (Anthropic or Bedrock)
│       ├── middleware/
│       │   └── validate.ts       — Zod schema validation
│       └── db/
│           ├── index.ts          — SQLite connection (WAL mode)
│           ├── migrate.ts        — Schema creation
│           └── seed.ts           — FAQ data seeding
├── client/
│   └── src/
│       ├── App.svelte            — Root
│       └── lib/
│           ├── ChatWidget.svelte — Full chat UI (sidebar + messages + composer)
│           └── api.ts            — Typed HTTP client
└── package.json                  — Root: `npm run dev` starts everything
```

## Design Decisions

**SQLite over PostgreSQL** — Zero-config for reviewers. No Docker, no connection strings. Schema is Postgres-compatible if you swap the driver.

**Services layer** — Routes are thin (validate → delegate → respond). Business logic in services. Adding WhatsApp/Instagram = new routes calling same services.

**Knowledge base in DB** — Editable without code changes, queryable for analytics, extensible per-store for multi-tenant.

**LLM encapsulation** — `generateReply(history, message)` is the only interface. Swap Claude for GPT by changing one file. The rest of the app doesn't know.

**Conversation history as context** — Last 20 messages passed to the LLM. Provides multi-turn coherence without blowing up token costs.

**Auto-resizing textarea** — Grows with input up to 120px. Better UX than a fixed single-line input for longer messages.

**Dark sidebar + floating white panel** — Visual hierarchy separates navigation from conversation. The chat panel "floats" over a subtle gradient background.

## LLM Integration

- **Provider:** Claude Sonnet 4 via AWS Bedrock (or direct Anthropic API)
- **System prompt:** Defines SparkStore support persona + injects FAQ knowledge
- **Context:** Last 20 messages for multi-turn awareness
- **Max tokens:** 300 per reply (concise responses)
- **Guardrails:** Timeouts, rate limit handling, auth error handling — all surface friendly messages in the UI
- **Cost:** ~$0.003/message

## Robustness

| Scenario | Handling |
|----------|----------|
| Empty message | 400 + validation error (Zod) |
| Message > 2000 chars | 400 + "Message too long" |
| LLM rate limit (429) | Friendly "try again" message in UI |
| LLM auth failure | "Team has been notified" message |
| LLM timeout | Graceful error, no crash |
| Invalid session ID | Creates new conversation |
| Server restart | Conversations persist in SQLite |
| Page reload | Session restored from localStorage + DB |

## If I Had More Time...

- **Streaming responses** — SSE for token-by-token delivery (typing effect)
- **Redis session cache** — Faster than SQLite at high concurrency
- **WebSocket typing indicators** — Real-time bidirectional
- **Multi-channel architecture** — Abstract ingestion layer for WhatsApp, Instagram, email
- **Admin dashboard** — View all conversations, handoff to human, analytics
- **Semantic search over knowledge** — Embeddings + vector similarity instead of dumping all FAQs into prompt
- **Rate limiting** — Per-session + global with sliding window
- **Docker + deploy** — Render/Fly.io with persistent volume

## Scripts

```bash
npm run dev          # Start server + client concurrently
npm run dev:server   # Server only (port 3001)
npm run dev:client   # Client only (port 5173)
npm run setup        # Install deps + seed DB
npm run build        # Build client for production
```

## Author

**Aman Sharma** — [GitHub](https://github.com/aman20021) · [LinkedIn](https://linkedin.com/in/amansharma2020)
