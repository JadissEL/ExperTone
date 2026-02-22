# Expert Hunter Workflow — Architectural Alignment Analysis

**Document Type:** Architectural Analysis & Externalization Strategy  
**Constraint:** n8n workflows are immutable. All evolution happens in the main project.  
**Source Workflow:** `workflows/Expert Hunter.json` (production standard)

---

## Phase 1 — Workflow Analysis

### 1.1 Trigger Logic

| Element | Value |
|---------|-------|
| **Trigger** | Webhook |
| **Method** | POST |
| **Path** | `/hunt` |
| **Response Mode** | responseNode (waits for Respond to Webhook) |

**Entry Point:** All requests enter via Webhook, then flow through security and validation before processing.

---

### 1.2 Pre-Processing Pipeline (Security & Validation)

```
Webhook → Verify Webhook Signature → Signature Valid? 
  → Check Timestamp (max 300s age)
  → Check IP Whitelist ($env.IP_WHITELIST)
  → Validate Input
  → Input Valid? → Has Brief? → [Brief Branch | Extract Input]
```

| Node | Purpose |
|------|---------|
| **Verify Webhook Signature** | HMAC-SHA256 of body using `$env.WEBHOOK_SECRET`; compares to `X-Webhook-Signature` header |
| **Check Timestamp** | Rejects if `body.timestamp` is missing or older than 300 seconds |
| **Check IP Whitelist** | Optional; allows if `$env.IP_WHITELIST` includes client IP or `*` |
| **Validate Input** | Requires `projectId`; determines mode: `collect` (expertName/experts/brief) vs `rank` |
| **Has Brief?** | If `body.brief` present → Parse Brief for Experts (AI); else → Extract Input |

---

### 1.3 Mode Routing

| Mode | Condition | Flow |
|------|-----------|------|
| **Brief Mode** | `body.brief` present | Parse Brief for Experts (OpenRouter) → Format Parsed Experts → Extract Input |
| **Collect Mode** | `expertName` or `experts[]` present | Build Search Queries → Google Search → Scrape → Disambiguate → Callback |
| **Rank Mode** | No expertName/experts/brief | Has Project ID? → ML Rank Experts → Format Rank Response |

---

### 1.4 Inputs (Expected Webhook Body)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `projectId` | string | Yes | Always required |
| `query` | string | No | Passed through |
| `filterCriteria` | object | No | Industry, region, etc. |
| `projectTitle` | string | No | Display |
| `expertName` | string | No* | For Collect mode |
| `experts` | array | No* | Batch: `[{ name, title, company, location, industry }]` |
| `brief` | string | No* | For Brief mode; triggers AI parsing |
| `timestamp` | string | No | ISO; used for replay protection |

*At least one of expertName, experts, or brief required for Collect mode.

---

### 1.5 Processing Logic (Collect Mode)

1. **Extract Input** — Normalizes `experts[]` or `expertName` into items with `expertName`, `company`, `title`, `location`, `industry`
2. **Build Search Queries** — LinkedIn query: `"Name" site:linkedin.com/in`; public queries: main, interview, conference, keynote, board director
3. **Rate Limit Check** — 60 requests/minute for Google; waits if exceeded
4. **Search Cache** — Postgres: `SELECT * FROM search_cache WHERE query_hash = $1 AND cached_at > NOW() - INTERVAL '24 hours'`
5. **Cache Hit?** — If cached → Parse LinkedIn URL; else → Google Search
6. **Google Search** — LinkedIn URL search (8 results), Public Sources (10 results); retry on error
7. **Merge Google Results** — Dedupe URLs, filter blocked domains, prioritize (forbes, bloomberg, etc.), max 20
8. **Fetch robots.txt** — Per domain
9. **Check robots.txt** — Parse Disallow/Allow; set `_scrapeAllowed`
10. **Scraping Allowed?** — If yes → Scrape Page; else → No Scrape Fallback
11. **Extract Data** — Parse HTML: title, description, emails, role, company, JSON-LD Person, achievements
12. **Disambiguate & Aggregate** — Confidence scoring, career history, publications, skills
13. **Enhanced Disambiguation AI** — Refines confidence (company/title match, LinkedIn name match, publications)
14. **Has Sources?** — If yes → Quality Control; else → Minimal Callback
15. **Quality Control** — Discard if confidence < 0.4; infer seniority/years from career text
16. **Keep Result?** — If not discarded → Format Callback; else → Discarded Fallback
17. **Format Callback** — Build `{ projectId, experts, status, complete }`
18. **Sign Payload** — HMAC with `PASTE_YOUR_SHARED_SECRET` (placeholder)
19. **POST Callback** — `https://exper-tone.vercel.app/api/webhooks/n8n-callback`

---

### 1.6 Data Transformations

| Stage | Input | Output |
|-------|-------|--------|
| Parse Brief | `body.brief` | `{ experts: [{ name, title, company, location, industry }] }` |
| Extract Input | body | `{ projectId, query, expertName, company, title, location, industry }` |
| Build Search Queries | expertName, company, etc. | `linkedInQuery`, `publicQuery` (5 variants) |
| Parse LinkedIn URL | Google items | `linkedInUrl`, `_linkedInFound` |
| Disambiguate & Aggregate | Scraped records | `fullName`, `careerHistory`, `identityConfidence`, `confidenceReasons`, `skills`, `contactInfo` |
| Quality Control | Aggregated | `expert` object with `_meta` (linkedInUrl, careerHistory, skills, sourceUrls) |
| Format Callback | expert | `{ projectId, experts: [{ name, industry, ..., linkedin_url, career_history, skills }] }` |

---

### 1.7 External Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| **GOOGLE_API_KEY** | `$env` | Google Custom Search API |
| **GOOGLE_CSE_ID** | `$env` | Programmable Search Engine ID |
| **WEBHOOK_SECRET** | `$env` | HMAC verification |
| **IP_WHITELIST** | `$env` | Optional IP allowlist |
| **OpenRouter** | Credential | meta-llama/llama-3.1-8b-instruct:free for brief parsing |
| **Postgres** | Credential | search_cache, experts, metrics, performance_metrics, error_log, activity_log |
| **ML Service** | `https://expertone.onrender.com/rank` | Rank mode |
| **App Callback** | `https://exper-tone.vercel.app/api/webhooks/n8n-callback` | Expert persistence |

---

### 1.8 Postgres Tables Used by n8n

| n8n Node | Table | Columns (n8n expects) |
|---------|-------|------------------------|
| Search Cache | `search_cache` | query_hash, query_text, results, cached_at, ttl_hours |
| Store Search Cache | `search_cache` | (insert) |
| Check Existing Expert | `experts` | `SELECT * WHERE name ILIKE $1 AND project_id = $2` |
| Store Expert Permanently | `experts` | name, industry, sub_industry, country, region, seniority_score, years_experience, predicted_rate, linkedin_url, career_history, skills, source_urls, identity_confidence, project_id, created_at, updated_at |
| Track Metrics | `metrics` | metric_type, project_id, expert_name, identity_confidence, sources_found, linkedin_found, timestamp, execution_id |
| Store Performance Metrics | `performance_metrics` | project_id, expert_name, processing_duration_ms, sources_scraped, identity_confidence, linkedin_found, cache_hit, timestamp, execution_id |
| Store Error Log | `error_log` | error_type, error_message, project_id, expert_name, timestamp, execution_id |
| Log Activity | `activity_log` | event_type, project_id, expert_name, status, timestamp, execution_id, workflow_id |

---

## Phase 2 — Architectural Gaps

### 2.1 Schema Mismatches (n8n vs Main Project)

| n8n Expectation | Main Project Schema | Gap |
|-----------------|---------------------|-----|
| **experts.project_id** | No `project_id` on experts | Experts linked via `research_results`; n8n Store Expert Permanently will fail |
| **experts.identity_confidence** | No such column | Not in Prisma schema |
| **experts.career_history** | `pastEmployers` (JSON) | Different name/format |
| **experts.source_urls** | Via `expert_sources` table | No direct column |
| **search_cache.query_hash** | `query_key` | Different column name |
| **search_cache.cached_at, ttl_hours** | `created_at`, `expires_at` | Different semantics |
| **metrics** | `metrics_tracking` | Different table/columns |
| **error_log** | `error_logs` | Singular vs plural; different columns |
| **activity_log** | `audit_logs` | Different table; different schema |

### 2.2 Dual Write Paths

- **Path A:** n8n Postgres nodes write directly to DB (search_cache, experts, metrics, etc.)
- **Path B:** n8n POST Callback → app `/api/webhooks/n8n-callback` → Prisma creates experts, research_results

If both run, Path A may fail (schema mismatch) and Path B succeeds. The callback is the canonical path for expert creation in the main project.

### 2.3 Callback URL & Secret

- **Callback URL:** Hardcoded `https://exper-tone.vercel.app/api/webhooks/n8n-callback`
- **Sign Payload:** Uses literal `'PASTE_YOUR_SHARED_SECRET'` — must be replaced with real secret in n8n (user config)
- **Main project** expects `SHARED_SECRET` env var; verifies `X-Webhook-Signature`

### 2.4 Brief Mode Input

- Workflow expects `body.brief` for AI parsing
- Main project sends `query` and `filterCriteria.brief` — **must ensure `brief` is sent** when invoking Brief mode
- `/api/brief/ingest` and Hunter Trigger send `query`; n8n Has Brief? checks `body.brief` — **mismatch**

### 2.5 Timestamp Replay Protection

- Workflow rejects requests with `body.timestamp` older than 300 seconds
- Main project does **not** send `timestamp` in webhook payloads — requests may be rejected if n8n enforces this strictly (depends on whether Check Timestamp runs before or after Extract Input)

---

## Phase 3 — Refactor Recommendations (Main Project)

### 3.1 Payload Alignment Layer

**Add middleware/wrapper** that normalizes outgoing webhook payloads to match n8n expectations:

| Main Project Sends | n8n Expects | Action |
|--------------------|-------------|--------|
| `query` | `brief` (for Brief mode) | When `detectInputType(query) === 'brief'`, send `brief: query` in addition to or instead of `query` |
| (none) | `timestamp` | Add `timestamp: new Date().toISOString()` to all webhook payloads |

**Location:** `app/lib/n8n-bridge.ts` or new `lib/n8n-payload-adapter.ts`

### 3.2 Database Alignment (External Views / Sync)

**Option A — Compatibility Views (Recommended)**  
Create Postgres views that match n8n’s expected schema. n8n writes to views; triggers or materialized logic sync to main tables.

**Option B — Adapter Tables**  
Add tables that mirror n8n’s expected schema exactly. A sync job or trigger copies data into main schema.

**Option C — Rely on Callback Only**  
Disable or bypass n8n Postgres writes for experts. Rely solely on POST Callback → app creates experts. n8n Postgres nodes may error; use `onError: continueErrorOutput` (already present on some nodes) so workflow continues.

**Recommendation:** Option C for experts (callback is source of truth). For search_cache, metrics, error_log, activity_log — add adapter tables or views if n8n writes are required.

### 3.3 Table Mapping (If Adapter Tables Used)

| n8n Table | Adapter Table | Main Table |
|-----------|---------------|------------|
| search_cache (n8n cols) | `search_cache` (align columns) | Use existing; add `query_hash` as alias for `query_key` if needed |
| metrics | `metrics_tracking` | Map columns |
| performance_metrics | `performance_metrics` | Align columns |
| error_log | `error_logs` | Map columns |
| activity_log | `audit_logs` or new `activity_log` | Map or create |

### 3.4 Experts Table — No project_id

n8n "Store Expert Permanently" expects `project_id` on experts. Our schema has no such column. **Do not add project_id to experts** — project linkage is via `research_results`.

**External solution:**  
- n8n Postgres "Store Expert Permanently" will fail on our schema.  
- Rely on **POST Callback** as the only path for expert creation.  
- Ensure n8n workflow continues on Postgres errors (already has error handling).  
- Optional: Create a view `experts_n8n` with `project_id` as a computed/virtual column that n8n can write to, with a trigger that inserts into real `experts` + `research_results` — complex; prefer callback-only.

---

## Phase 4 — Externalization Strategy

### 4.1 Separation of Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **n8n** | Execute workflow: receive input, run steps, return output. No logic changes. |
| **Main Project** | Intelligence, orchestration, persistence, API, UI |

### 4.2 Wrapper Services (Build Outside n8n)

| Service | Purpose |
|---------|---------|
| **Payload Adapter** | Normalize `query` → `brief` when appropriate; add `timestamp` |
| **Webhook Proxy** | Optional: single endpoint that routes to n8n with transformed payload |
| **Callback Enricher** | After n8n callback creates expert, run additional logic (embeddings, reputation, etc.) |
| **Sync Job** | If n8n writes to adapter tables, sync to main schema periodically |

### 4.3 Integration Design

```
[War Room / Brief Ingest] 
    → Payload Adapter (add brief, timestamp)
    → POST N8N_WEBHOOK_URL
    → n8n (unchanged)
    → POST Callback (our app)
    → n8n-callback route (Prisma: experts, research_results, embeddings)
```

### 4.4 When a Change Seems to Require n8n

| Apparent Need | External Solution |
|---------------|-------------------|
| New input field | Add to payload; n8n Extract Input already passes through `body` |
| Different callback format | n8n Format Callback is fixed; adapt our callback route to accept n8n’s format |
| New validation rule | Validate in Payload Adapter before sending to n8n |
| Different AI model for brief | n8n uses OpenRouter; we cannot change. Use pre-processing: call our own AI, send parsed `experts` so n8n skips Parse Brief |
| Rate limiting | n8n has Rate Limit Check; we can add app-side rate limiting before calling n8n |

---

## Phase 5 — Immediate Actions (Main Project)

### 5.1 Payload Alignment

1. **Send `brief` when appropriate** — Implemented via `adaptHuntPayload()`.
2. **Send `timestamp`** — Implemented via `adaptHuntPayload()`.
3. **Sign outgoing requests** — Implemented: `X-Webhook-Signature` HMAC-SHA256 when `SHARED_SECRET` is set. n8n must have `WEBHOOK_SECRET` (or equivalent) set to the same value.

### 5.2 Callback Compatibility

- Ensure `n8nCallbackBodySchema` accepts the exact structure n8n sends (projectId, experts, status, complete).
- No changes needed if already compatible.

### 5.3 n8n Postgres Node Failures

- n8n "Store Expert Permanently" will fail on our schema (no project_id).
- Workflow uses error handling; callback remains the path for expert creation.
- Optionally add `activity_log` and `error_log` tables that match n8n’s expected schema so those nodes succeed, if desired.

---

## Phase 6 — Permanent Constraint Summary

| Rule | Implementation |
|------|----------------|
| **Do not modify n8n** | No edits to `Expert Hunter.json` or any workflow file |
| **Adapt the system** | Payload adapter, schema alignment, callback handling |
| **n8n = executor** | Receives input, runs steps, returns output |
| **Main project = intelligence** | Parsing, validation, persistence, orchestration |

---

## Appendix A — Node List (Reference)

- Webhook, Verify Webhook Signature, Signature Valid?, Check Timestamp, Check IP Whitelist, IP Allowed?
- Validate Input, Input Valid?, Has Brief?, Parse Brief for Experts, Format Parsed Experts
- Extract Input, Collect Mode?, Valid Collect Input?, Build Search Queries
- Rate Limit Check, Rate Limit Wait, Search Cache, Cache Hit?
- Google Search (LinkedIn, Public), Merge Google Results, Fetch robots.txt, Check robots.txt
- Scraping Allowed?, Scrape Page, Extract Data, Merge Scraped, Disambiguate & Aggregate
- Enhanced Disambiguation AI, Has Sources?, Quality Control, Keep Result?
- Format Callback, Sign Payload, POST Callback, Format Collect Response
- Minimal Callback, No Sources Fallback, Discarded Fallback, Invalid Collect Fallback
- Has Project ID?, ML Rank Experts, No Project Fallback, Merge, Format Rank Response
- Prepare Expert for Storage, Store Expert Permanently, Prepare Metrics, Track Metrics
- Calculate Performance Metrics, Store Performance Metrics
- Prepare Error Log, Store Error Log, Prepare Log Entry, Log Activity
- Respond to Webhook
