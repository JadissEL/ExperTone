# Expert Intelligence Platform

Enterprise platform for expert research, ownership governance, and ML-powered insights. Built with Next.js, FastAPI (ML microservice), Neon (PostgreSQL + pgvector), n8n, and Clerk.

---

## 10-Step Architecture Overview

| Step | Layer | Description |
|------|--------|-------------|
| 1 | Data & Auth | Neon DB, Clerk, Prisma, expert/contact models |
| 2 | n8n Orchestration | Workflow automation, webhook callbacks, scrape → DB |
| 3 | Search & Embeddings | Semantic search (pgvector), xAI Grok / OpenAI embeddings |
| 4 | ML Ranking | FastAPI ranking microservice, XGBoost, confidence scores |
| 5 | Dashboard & Ownership | Command Center, project-based results, expert slide-over |
| 6 | Governance Suite | Admin panel, ownership, decay, audit, settings |
| 7 | Expiry Engine | 30-day private → global pool, cron, advisory lock |
| 8 | Agent & Live Feed | SSE live feed, project status, rerank |
| 9 | Intelligence Layer | Relationship graph (NetworkX), rate estimator (XGBoost), reputation score, Network tab |
| 10 | Elite Finalization | PII encryption, RBAC, rate limiting, vector indexes, Platform Health, deployment |
| 11 | Multi-Agent System | Coordinator–Worker MAS, Blackboard (AgentTaskState), Hunter → Scholar → Valuer → Auditor, Elite Profile, Add to pool |
| 12 | Apex Hunter | Multi-source scent trails (A–D), pgvector + Unfindable 25% boost, seniority verification, War Room table, Hunter Trigger (n8n) |
| 13 | Sentinel & Concierge | Compliance Sentinel, Crypto-ID provenance, Concierge Brief Builder, No-Spam + Privacy Cloak |

---

## Sentinel & Concierge (Step 13)

Turns the platform from a sourcing tool into a secure advisory system:

- **Compliance Sentinel**: Background agent that checks experts against client blacklist/restricted industries, detects MNPI risk, and produces a compliance score (1–100). Runs automatically when adding experts via Hunter or Coordinator. Manual scan: `POST /api/compliance/scan` (body: `expertId`, `projectId`).
- **Crypto-ID Provenance**: Verified badge (Persona/CLEAR) and Professional Authority Index (citations + patents). Admin-only: `PATCH /api/experts/[id]/verify-id`, `PATCH /api/experts/[id]/scholar-authority`. Compliance score and MNPI visible only to admins and project creators.
- **Concierge Brief Builder**: Chat-style UI on `/projects` replacing the New Project form. Guides clients through 15+ criteria with auto-expansion (e.g. "Energy Expert" → Grid Infrastructure, Battery Storage, Regulatory Policy). Posts to `/api/research/trigger`.
- **No-Spam Rule**: Experts with >3 contact attempts/week and no bookings get visibility lowered to PRIVATE. Cron: `GET /api/cron/no-spam-auditor` (weekly, Sunday 4am UTC).
- **Privacy Mode**: Experts can cloak contact until vetted engagement. Toggle on Add Expert form; contact reveal logic in expert detail, project results, export, and search APIs.

---

## Apex Hunter (Step 12)

- **Scent trails**: Expert footprint stores which sources the expert was found in — **Trail A** (Public Social: LinkedIn, X, forums), **Trail B** (IP: Patents, Scholar, white papers), **Trail C** (Market: conferences, awards, press), **Trail D** (Internal: feedback loop, cost, mastery).
- **Elite filtering**: `POST /api/hunter/search` — pgvector similarity (client brief vs expert footprint), **Unfindable multiplier** (25% rank boost for experts in B or C but not A), **Seniority verification** (`seniorityFlag`: DISCREPANCY when years differ across sources). **Fuzzy name** filter and server-side pagination (up to 5,000 experts, 50 per page).
- **War Room** (`/hunt`): High-density table (Bloomberg style): Match score (prominent), Market rate, Last engagement, **Scent** sparkline (A/B/C/D), Name, Industry, Seniority flag, **Add to Project** (one-click). **Hunter Trigger** button sends search params to n8n (LinkedIn, Patent, Conference, Internal DB agents → unified entity).
- **APIs**: `POST /api/hunter/search`, `POST /api/hunter/add-to-project`, `POST /api/hunter/trigger`.

---

## Multi-Agent System (Step 11)

- **Coordinator**: Decomposes a client brief and runs the pipeline (Hunter → Scholar → Valuer → Auditor). All agents read/write the **Blackboard** (`AgentTaskState`); no direct agent-to-agent calls.
- **Agents**: **The Hunter** (raw data; optional `COORDINATOR_HUNTER_URL`), **The Scholar** (extract seniority, domain, years), **The Valuer** (60-min rate range), **The Auditor** (verify contact; if confidence &lt; 85% → `PENDING_AUDIT` + notify).
- **APIs**: `POST /api/coordinator/run` (body: `projectId`, `brief`), `GET /api/coordinator/tasks?projectId=`, `POST /api/coordinator/tasks/[id]/create-expert` (create Expert + ResearchResult + embedding from Elite Profile).
- **Dashboard**: Agent Squad bento shows per-agent status, Elite profile summary, **Add to pool** (creates expert and refreshes grid/graph), and a **Pending audit** count when the Auditor flagged profiles.

---

## Ownership Logic

- **Private experts**: Created by n8n or CSAs, owned by a user; visible only to that user and admins.
- **Global pool**: Experts that (1) were explicitly moved to global pool by a CSA, or (2) expired from private after the configured expiry window (default 30 days).
- **Expiry Engine**: Cron job (`/api/cron/expire-ownership`) runs daily; it moves private experts whose `private_expires_at` has passed into the global pool and notifies the previous owner.
- **Admin**: Can reassign ownership, force-expire, bulk reclaim, and manage users/roles (CSA, TEAM_LEAD, ADMIN, SUPER_ADMIN).

---

## Security & Auth

- **Clerk**: All dashboard and API routes (except webhooks and cron) require a signed-in user. Use `auth()` from `@clerk/nextjs/server` and check `userId`.
- **RBAC**: Admin-only routes use `requireAdminApi()` from `@/lib/requireAdminApi` (returns 403 for non-ADMIN/SUPER_ADMIN). Pages use `requireAdmin()` from `@/lib/requireAdmin` (redirects to `/` if not admin).
- **PII**: Expert contact values (email/phone) are encrypted at rest using `PII_ENCRYPTION_KEY` (or `ENCRYPTION_KEY`). Set a min 16-character secret in production; see **Rotating API Keys** below.
- **Webhooks**: n8n callback is verified via HMAC using `SHARED_SECRET` or `N8N_WEBHOOK_SECRET`. Cron is secured with `CRON_SECRET` (Bearer token).
- **Rate limiting**: Search trigger (`POST /api/search`) is rate-limited per user (20 requests per minute) to prevent abuse and control Grok/n8n costs.

---

## Rotating API Keys

1. **PII encryption**: Generate a new 32+ character secret. Set `PII_ENCRYPTION_KEY` to the new value. Existing encrypted contact values will not decrypt with the new key; re-encrypt in a migration or backfill (decrypt with old key, encrypt with new key) if you rotate.
2. **Clerk**: Rotate in Clerk Dashboard; update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel (or your host) and redeploy.
3. **Neon**: Create a new DB user or reset password; update `DATABASE_URL` and `DIRECT_URL` and redeploy. Run `prisma migrate deploy` if needed.
4. **n8n**: Regenerate API key and webhook secret; update `N8N_API_KEY`, `SHARED_SECRET` / `N8N_WEBHOOK_SECRET` everywhere (Next.js env and n8n workflow).
5. **Cron**: Set a new `CRON_SECRET` in Vercel and in the cron job configuration (Bearer token).
6. **Embeddings**: Rotate xAI/OpenAI keys in provider dashboards; update `XAI_API_KEY` / `OPENAI_API_KEY`.

---

## System Genesis (10.3) — Unified Foundation

- **Single Source of Truth**: `prisma/schema.prisma` — Core (Experts + ExpertVector + ExpertContacts), Intelligence (Engagements), Governance (AuditLog). Experts include `industry_tags`, `languages`, `last_contact_update` (30-day expiry clock), `total_engagements`, `average_actual_rate`, `reputation_score`.
- **lib/db.ts**: Neon connection utility; `semanticExpertSearch(embedding, limit)` runs pgvector `<->` for expertise similarity to a client brief.
- **lib/hooks/ownershipEnforcer.ts**: Ownership Enforcer — checks `last_contact_update` and verified contact; if past expiry days, triggers Global Pool transition. Used by Step 7 cron.
- **lib/ml-proxy.ts**: ML-Proxy wrapper for the FastAPI microservice (suggested rate, graph data, ranking).
- **Seed**: `npm run db:seed` creates 5 experts with *expired* ownership (past 35 days) so the expiry cron can move them to Global Pool immediately for testing.

## Database

- **Neon** (PostgreSQL + pgvector). Connection pooling via `DATABASE_URL`; migrations use `DIRECT_URL`.
- **Migrations**: `npx prisma migrate deploy` (prod) or `npx prisma migrate dev` (dev).
- **Indexes**: Experts are indexed on `industry`, `owner_id`, `visibility_status`, `country`, `region`, `seniority_score`. Vector column uses HNSW index for approximate nearest-neighbor search.
- **Materialized view**: `mv_global_pool_analytics` for fast global pool stats. Refresh with `REFRESH MATERIALIZED VIEW mv_global_pool_analytics;` when needed (e.g. scheduled job).

---

## Deployment

- **Next.js (Vercel)**: Set env vars from `.env.production.example`. Build command: `prisma generate && next build`. Crons in `vercel.json`: `expire-ownership` (daily 2am UTC), `optimize-iq` (weekly Sunday 3am UTC), `no-spam-auditor` (weekly Sunday 4am UTC). All require `CRON_SECRET` (Bearer token).
- **ML microservice**: See `ml-service/Dockerfile`. Deploy to AWS App Runner, ECS, or any container host. Set `ML_SERVICE_URL` in Next.js to the service URL.
- **n8n**: Host separately; configure webhook URL and HMAC secret to match Next.js.

---

## Local Development

```bash
# Install
npm install
cp .env.example .env   # fill DATABASE_URL, DIRECT_URL, Clerk, etc.

# DB
npx prisma generate
npx prisma migrate dev

# PII (optional for dev): set PII_ENCRYPTION_KEY or ENCRYPTION_KEY for contact encryption

# Next.js
npm run dev

# ML service (separate terminal)
npm run ml:start
```

---

## Admin: Platform Health

Under **Admin → Platform Health** you can view:

- **Conversion metrics**: New experts (last 30 days) vs. verified (moved to global pool).
- **System ROI**: Predicted rate vs. ML suggested rate accuracy (for model retraining).
- **Search latency**: ML service and embedding API response times.

---

## Error Boundaries

- **Results table** and **Relationship graph** (dashboard and /graph page) are wrapped in error boundaries so a single service or load failure does not crash the whole UI. Users see a fallback message and can continue using the rest of the app.
