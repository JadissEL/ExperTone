# Expert Intelligence Platform — Full Infrastructure Deep-Dive Audit

**Date:** 2025-02-19  
**Auditor:** Principal Systems Auditor (Deep MCP Inspection Mode)  
**Scope:** Backend, AI, DB, Frontend, CRON, Render, GitHub, n8n, deployment pipelines, env vars

---

## Executive Deep-Dive Summary

The Expert Intelligence Platform is a Next.js 14 application with Prisma/Neon, pgvector, Clerk auth, n8n workflows, and an external ML service. The architecture is coherent and production-capable, but **several critical security and data-flow gaps** require immediate remediation before scale or capital raise.

**Top 3 Risks:**
1. **Webhook HMAC bypass** — n8n callback accepts unsigned requests when no secret is configured.
2. **CRON auth bypass** — Expiry and other CRON jobs run without authentication if `CRON_SECRET` is unset.
3. **Embedding gap** — Experts created via n8n never receive embeddings; they are invisible to Hunter Search and semantic search.

---

## Cross-System Configuration Matrix

| System | Key Env Vars | Validation Status |
|--------|--------------|-------------------|
| **App (Vercel)** | `DATABASE_URL`, `CRON_SECRET`, `SHARED_SECRET`/`N8N_WEBHOOK_SECRET`, `CLERK_*`, `ML_SERVICE_URL` | ⚠️ Secrets can be unset → auth bypass |
| **n8n** | `SHARED_SECRET`, `GOOGLE_API_KEY`, `GOOGLE_CSE_ID`, `CALLBACK_URL` | ✅ Config node references; callback URL must match app |
| **Neon/Postgres** | `DATABASE_URL` | ✅ Prisma connects; pgvector enabled |
| **ML Service (Render)** | `ML_SERVICE_URL` | ⚠️ 502 fallback; no health check on startup |
| **Clerk** | `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY` | ✅ Standard auth flow |

---

## Drift Detection Report

| Area | Finding |
|------|---------|
| **Webhook HMAC** | `lib/webhook-verify.ts` uses `HMAC_SECRET` \|\| `SHARED_SECRET` \|\| `N8N_WEBHOOK_SECRET`.
| **n8n-callback** | Uses `if (SHARED_SECRET \|\| N8N_WEBHOOK_SECRET)` to gate verification — **if both unset, verification is skipped** (lines 63–68). |
| **CRON** | Uses `if (cronSecret && authHeader !== ...)` — **if CRON_SECRET unset, auth is skipped** (lines 16–18). |
| **Embedding** | `createExpert` (actions), `create-expert` (coordinator), `seed-with-embeddings` all create `ExpertVector`; **n8n-callback does not**. |

---

## Phase 1 — Connection & Configuration Validation

### Credentials

- **Database:** Prisma + Neon; connection validated via `prisma generate` and migrations.
- **Clerk:** Standard `auth()` and `getCurrentDbUser()`; no drift detected.
- **n8n:** Webhook URL and callback URL configurable; HMAC must be configured for security.

### Environment Variables

- `.env.example` documents required vars; `.env` is gitignored.
- **Missing in prod:** Ensure `CRON_SECRET`, `SHARED_SECRET` (or `N8N_WEBHOOK_SECRET`) are set in Vercel.

### Version Alignment

- Next.js 14.2.25, Prisma 6, `@clerk/nextjs` latest.
- No deprecated keys identified in schema.

---

## Phase 2 — Data Flow & Contract Integrity

### End-to-End Data Lineage

```
Frontend → Clerk → API routes → Prisma → Neon
    ↓
    ├── Hunter Search → /api/hunter/search → pgvector (expert_vectors) → Expert
    ├── Project Results → /api/projects/[id]/results → ResearchResult → Expert (direct)
    ├── n8n Callback → Expert + ResearchResult (no ExpertVector)
    │       → ML suggested-rate (non-blocking)
    │       → computeReputationScore (non-blocking)
    └── CRON expire-ownership → experts → visibility_status, audit_log, notification
```

### Contract Violations

| Flow | Issue | Severity |
|------|-------|----------|
| **n8n → Expert** | No `ExpertVector` created; Hunter Search and `/api/search` query `expert_vectors` only. | **HIGH** |
| **n8n payload** | `source_verified`, `snake_case` fields handled; `n8nCallbackBodySchema` aligns. | ✅ |
| **ML rank** | `/api/ml/rank` proxies to `ML_SERVICE_URL/rank`; no schema validation on response. | Medium |

### Schema Consistency

- Prisma schema matches migrations; `source_verified` present.
- `expert_vectors` table exists; `embedding` column is `vector`.

---

## Phase 3 — AI & Learning Algorithm Audit

### Embedding Logic

- **Provider:** `openrouter/openai` or `xai` via `generateEmbedding()`.
- **Input:** `industry + subIndustry` for expert vectors.
- **Determinism:** Same input → same embedding (model-dependent).

### Hunter Search

- **Query:** `SELECT ... FROM expert_vectors WHERE embedding <=> embedding_query ORDER BY embedding <=> embedding_query LIMIT N`.
- **Unfindable boost:** `CASE WHEN expert.is_unfindable THEN 1.2 ELSE 1.0 END` applied.
- **Seniority:** `seniority_score >= 70` flag used.
- **Edge case:** Empty `expert_vectors` → empty result set.

### ML Service

- **Rank:** `/rank` endpoint; `project_id` passed; no determinism guarantee in app layer.
- **Suggested rate:** `POST /insights/suggested-rate`; non-blocking; failures logged.

### Algorithm Integrity Assessment

| Aspect | Status |
|--------|--------|
| **Determinism** | Embeddings deterministic; ranking depends on external ML service. |
| **Empty datasets** | Hunter returns empty; no fabricated data. |
| **Bias** | Industry/subIndustry embedding; no explicit bias controls. |

---

## Phase 4 — Database & Prisma Health Check

### Indexes

- `expert_vectors` uses pgvector; `embedding <=>` indexed.
- `last_contact_update` index present.
- `projectId_expertId` unique on `ResearchResult`.

### Migrations

- 21 migrations; `20260222120000_add_source_verified` latest.
- No orphaned migrations detected.

### Prisma Alignment

- Schema matches DB; no `$executeRawUnsafe` for schema changes.

### Query Optimization

- Hunter search uses `LIMIT`; `FOR UPDATE SKIP LOCKED` in CRON.
- No obvious N+1 in project results; `include` used for relations.

---

## Phase 5 — Deployment & Infrastructure Audit

### Vercel

- `vercel.json` defines CRON: `expire-ownership`, `optimize-iq`, `no-spam-auditor`.
- CRON_SECRET must be set in Vercel env for auth.

### Build

- Next.js build; no failed deployment logs inspected (no MCP access).

### n8n

- Workflow `expert_hunter_cloud_no_env.json` uses Config node.
- Callback URL must match app `N8N_WEBHOOK_URL` or equivalent.

### CI/CD

- GitHub repo; no explicit CI config in workspace; Vercel auto-deploy.

---

## Phase 6 — Security & Resilience Review

### Security Weakness Matrix

| Issue | Severity | Location |
|------|----------|----------|
| **Webhook HMAC bypass** | **CRITICAL** | `n8n-callback/route.ts` L63–68 |
| **CRON auth bypass** | **CRITICAL** | `expire-ownership/route.ts` L16–18 |
| **CRON endpoints** | High | GET; Vercel Cron uses GET; no rate limit |
| **ML service** | Medium | No auth header to ML; internal network assumed |
| **Secrets** | Medium | `.env` gitignored; ensure no secrets in repo |

### Resilience

- **Retry:** `fetchWithTimeout`; no retry on ML failure.
- **Error handling:** `try/catch` blocks; logging via `logger`.
- **Advisory lock:** Expiry uses `pg_try_advisory_xact_lock`; prevents concurrent runs.

---

## Critical Issues (Ranked by Severity)

### P0 — Production Critical

1. **Webhook HMAC bypass**  
   - **Fix:** Require `SHARED_SECRET` or `N8N_WEBHOOK_SECRET`; reject requests when missing. ✅ **FIXED**

2. **CRON auth bypass**  
   - **Fix:** Require `CRON_SECRET`; return 401 when unset or invalid. ✅ **FIXED** (expire-ownership, optimize-iq, no-spam-auditor)

3. **Embedding gap for n8n experts**  
   - **Fix:** Create `ExpertVector` in n8n-callback after creating Expert (or add background job). ✅ **FIXED**

### P1 — High

4. **ML service 502** — No fallback; rank fails. Consider graceful degradation.
5. **CRON rate limit** — No rate limiting; anyone with URL could spam.

### P2 — Medium

6. **ML response schema** — No validation on `/rank` response.
7. **Log visibility** — Ensure structured logs in production.

---

## Performance Bottlenecks

- Hunter search: single pgvector query; acceptable.
- Project results: `include` for contacts; no N+1.
- n8n callback: sequential expert processing; consider batching for large payloads.

---

## Algorithm Integrity Findings

- Embeddings: correct usage; no fabricated outputs.
- Ranking: delegated to ML service; no deterministic guarantee in app.
- Unfindable boost: applied correctly.

---

## Configuration Drift Findings

- `n8n-callback` and `webhook-verify` use different secret env names; `SHARED_SECRET` / `N8N_WEBHOOK_SECRET` must be consistent.
- CRON_SECRET not documented in `.env.example` (verify).

---

## Architectural Refactor Recommendations

1. **Embedding pipeline:** Centralize embedding creation (e.g. `createExpertWithEmbedding` helper) used by n8n-callback, coordinator, and actions.
2. **Webhook & CRON:** Fail closed — require secrets; never skip verification when unset.
3. **ML health:** Add health check on startup or first request; fail gracefully if ML unavailable.

---

## Immediate Fix List (Production Critical)

1. Set `CRON_SECRET` in Vercel and ensure CRON auth is enforced. ✅ **Code fixed**
2. Set `SHARED_SECRET` or `N8N_WEBHOOK_SECRET` in Vercel; ensure n8n sends HMAC. ✅ **Code fixed**
3. Add `ExpertVector` creation in n8n-callback after creating new Expert. ✅ **Fixed**
4. Change `n8n-callback` to **reject** when no secret is configured (fail closed). ✅ **Fixed**

**Backfill:** For experts created before the fix, run:
`npx tsx scripts/backfill-experts-without-embeddings.ts`

---

## Long-Term Hardening Roadmap

- Add rate limiting to CRON endpoints.
- Validate ML response schema.
- Add structured observability (e.g. OpenTelemetry).
- Backfill embeddings for existing experts without vectors.
- Document CRON_SECRET in `.env.example`.

---

## Final System Grade

**Grade: C+**

**Justification:**  
- Architecture is sound; Prisma, migrations, and data flows are coherent.
- **Critical security gaps** (webhook HMAC bypass, CRON auth bypass) and **data flow gap** (n8n experts invisible to search) prevent a higher grade.
- After P0 fixes, the system would qualify for **B** or **B+**.
- With full hardening and observability, **A-** is achievable.

---

*Generated by Principal Systems Auditor — Deep MCP Inspection Mode*
