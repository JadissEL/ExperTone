# Expert Hunter n8n Workflow — Pre-Deployment Optimization Audit

**Role:** Principal Automation Architect & Systems Optimization Strategist  
**Date:** 2025-02-19  
**Workflow:** `expert_hunter_cloud_no_env.json`  
**Status:** REFACTOR APPLIED — Security fixes implemented; ready for env configuration

---

## Executive Optimization Summary

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| **Security** | 🟢 Fixed | Secrets externalized | ✅ Now uses `$env.GOOGLE_API_KEY`, `$env.GOOGLE_CSE_ID`, `$env.SHARED_SECRET` |
| **Structure** | 🟡 Adequate | Elite | Context propagation fragility, redundant logic |
| **Performance** | 🟡 Adequate | Optimal | Sequential Google calls, no parallelization |
| **Resilience** | 🟢 Improved | Hardened | ✅ Retry on Google Search + POST Callback (2 tries, 1–2s wait) |
| **Observability** | 🟠 Weak | Traceable | No execution metadata, sparse logging |
| **Scalability** | 🟡 Moderate | 10x-ready | Rate limits, no batching strategy |

**Final Recommendation:** **GO** — Critical security and resilience fixes applied. Configure n8n env vars before deploy.

---

## Phase 1 — Structural Intelligence Audit

### 1.1 Node Organization & Flow Readability

**Strengths:**
- Clear branching: Collect vs Rank mode
- Fallback paths (Invalid Collect, No Sources, Discarded, No Project)
- Semantic node names (Parse LinkedIn URL, Disambiguate & Aggregate)

**Weaknesses:**

| Issue | Location | Impact |
|-------|----------|--------|
| **Context propagation fragility** | Extract Data, Disambiguate & Aggregate | `$('Parse LinkedIn URL').first().json` and `$('Check robots.txt').first().json` assume single-item or first-item context. With multiple URLs, context can mismatch. |
| **Deep node references** | Format Collect Response | `$('Format Callback').first().json ?? $('Minimal Callback').first().json` — brittle; fails if execution path differs. |
| **Merge nodes without clear semantics** | Merge Robots, Merge Context, Merge Scraped | "Merge" is generic; "Combine robots + URL" would be clearer. |

### 1.2 Naming Conventions

| Current | Suggested |
|---------|-----------|
| Merge Google Results | Aggregate Public Search URLs |
| Merge Robots | Combine Robots + URL Context |
| Merge Context | Combine Scraped HTML + URL Metadata |
| No Scrape Fallback | Robots Blocked Fallback |

### 1.3 Redundant / Centralized Logic

- **BLOCKED domains** — Hardcoded in Merge Google Results. Move to top-level constant or config.
- **Default expert values** — `seniority_score: 50`, `years_experience: 5`, `predicted_rate: 150` repeated in Quality Control and Minimal Callback. Centralize.
- **robots.txt parser** — Inline in Check robots.txt. Consider extracting to a reusable snippet.

### 1.4 Suggested Refactor Model

```
Webhook → Extract Input → [Collect? | Rank?]
  Collect: Valid? → Build Queries → [LinkedIn Search] → Parse URL
    → Build Public Queries (×3) → [Public Search] → Aggregate URLs
    → Fetch robots (parallel) → Check → [Allowed?] → Scrape → Extract
    → Disambiguate → Has Sources? → [QC | Minimal Callback]
    → Format → Sign → POST → Respond
  Rank: Has Project? → ML Rank → Format → Respond
```

**Logical grouping:**
1. **Ingest** — Webhook, Extract Input
2. **Route** — Collect Mode?, Valid Collect?, Has Project?
3. **Search** — Build Queries, Google (LinkedIn + Public)
4. **Scrape** — Merge URLs, robots, Scrape, Extract
5. **Resolve** — Disambiguate, Has Sources?, QC, Minimal Callback
6. **Deliver** — Format, Sign, POST, Respond

---

## Phase 2 — Performance & Efficiency Review

### 2.1 Unnecessary / Duplicate API Calls

| Call | Count | Optimization |
|------|-------|--------------|
| Google Custom Search (LinkedIn) | 1 per expert | ✅ Necessary |
| Google Custom Search (Public) | 3 per expert (main, interview, conference) | ⚠️ Could reduce to 1–2; "conference speaker" often low yield |
| robots.txt | 1 per URL (up to 20) | ⚠️ Cache per domain; same domain = same robots |
| Scrape Page | 1 per allowed URL | ✅ Necessary |

### 2.2 Parallelization Opportunities

| Current | Opportunity |
|---------|-------------|
| LinkedIn Search → Parse → Build Public → Public Search | Public Search ×3 runs sequentially (one per query). **Parallelize** 3 public queries. |
| Fetch robots.txt | 20 URLs → 20 sequential fetches. **Batch by domain**; fetch each domain's robots once. |
| Scrape Page | After robots check, scrapes are sequential. **Limit concurrency** (e.g. 3–5 parallel) to avoid rate limits. |

### 2.3 Payload Bloat

- **Extract Data** passes full `_context` (entire ctx) to each scraped item. Acceptable.
- **Format Callback** strips `_meta` — good. Payload is minimal.
- **Merge nodes** — Multiplex mode passes all items; no filtering. Consider early filtering of empty items.

### 2.4 Early-Exit Logic

- **Valid Collect Input?** — Early exit to Invalid Collect Fallback. ✅
- **Has Sources?** — Early exit to Minimal Callback. ✅
- **Keep Result?** — Early exit to Discarded Fallback. ✅
- **Missing:** If LinkedIn URL not found, could short-circuit public search (optional optimization).

---

## Phase 3 — Resilience & Error Handling Hardening

### 3.1 Failure Mode Map

| Node | Failure Mode | Current Behavior | Risk |
|------|--------------|------------------|------|
| Google Search (LinkedIn) | 429, 500, timeout | No retry; fails workflow | 🔴 High |
| Google Search (Public) | 429, 500, timeout | No retry; fails workflow | 🔴 High |
| Fetch robots.txt | 404, timeout | `allowed()` treats empty as allow | 🟡 Medium |
| Scrape Page | 403, timeout | Item fails; Merge continues | 🟡 Medium |
| POST Callback | 5xx, timeout | No retry; Vercel never receives | 🔴 High |
| ML Rank Experts | Render cold start | 30s timeout; may fail | 🟡 Medium |

### 3.2 Hardening Plan

| Fix | Priority | Implementation |
|-----|----------|----------------|
| **Retry on HTTP 5xx** | P0 | Enable "Retry On Fail" on Google Search, POST Callback (max 2 retries, 5s backoff) |
| **Timeout handling** | P0 | Ensure all HTTP nodes have explicit timeout (already 5–15s) |
| **Continue On Fail** | P1 | For Scrape Page: Continue On Fail = true; filter out failed items in Extract Data |
| **Fallback on Google fail** | P1 | If LinkedIn search fails → route to Minimal Callback with `status: 'search_failed'` |
| **Structured error in response** | P2 | On any failure, respond with `{ status: 'error', error: string, code: string }` |

### 3.3 Silent Failure Risks

- **Extract Data** — If `$('Check robots.txt').first().json` is undefined (e.g. no items), `ctx` is undefined → potential crash.
- **Disambiguate & Aggregate** — If `$('Parse LinkedIn URL').first()` fails (e.g. no output), `ctx` is undefined.
- **Format Collect Response** — `$('Format Callback').first()` and `$('Minimal Callback').first()` — if neither ran (e.g. Discarded path), expression may fail.

---

## Phase 4 — Observability & Debugability

### 4.1 Current State

- **No execution ID** — Cannot correlate logs across nodes.
- **No timestamps** — Format Collect Response adds `timestamp`; Minimal Callback does not.
- **Sparse logging** — Code nodes have no `console.log` or equivalent.
- **Output schema** — Varies by path (success vs discarded vs no_sources).

### 4.2 Proposed Improvements

| Improvement | Implementation |
|-------------|----------------|
| **Execution trace ID** | In Extract Input: `const traceId = $execution.id || Date.now().toString(36);` — pass through all nodes. |
| **Structured metadata** | Add `_trace: { traceId, path: 'collect'|'rank', phase: string }` to payload. |
| **Log at decision points** | In Code nodes: `console.log(JSON.stringify({ node: 'X', decision: 'Y', value }))` — n8n captures this. |
| **Deterministic response schema** | All paths return `{ status, message?, projectId, experts?, error?, traceId? }`. |

### 4.3 Testability

- **Mock payload** — Document minimal `{ projectId, expertName }` for Collect; `{ projectId }` for Rank.
- **Mock webhook** — Use n8n's "Test workflow" with static JSON.
- **Edge cases** — Empty experts array, missing projectId, invalid JSON — all have fallbacks. ✅

---

## Phase 5 — Scalability & Future-Proofing

### 5.1 10x Traffic Assumptions

| Assumption | Risk |
|------------|------|
| Google Custom Search: 100 queries/day free tier | At 10x: 1000/day → paid tier required. |
| Single expert per webhook | Batch mode exists (body.experts[]) but not exercised; each expert = full pipeline. |
| Render ML cold start ~30s | At 10x, more concurrent requests → more cold starts. |
| No rate limiting in workflow | External APIs (Google, scraped sites) may throttle. |

### 5.2 Modular Sub-Workflows

| Component | Extract as Sub-Workflow |
|-----------|--------------------------|
| robots.txt check + scrape | "Scrape URL with robots check" — reusable. |
| Disambiguate & Aggregate | "Resolve expert identity" — reusable for other sources. |
| Format + Sign + POST | "Callback to Vercel" — reusable. |

### 5.3 Configuration Abstraction

| Hardcoded | Abstract To |
|-----------|-------------|
| Google API key, cx | `$env.GOOGLE_API_KEY`, `$env.GOOGLE_CSE_ID` |
| HMAC secret | `$env.SHARED_SECRET` or n8n Credential |
| Callback URL | `$env.CALLBACK_URL` or `$env.NEXT_PUBLIC_APP_URL` + path |
| ML Rank URL | `$env.ML_SERVICE_URL` + `/rank` |
| BLOCKED domains | `$env.BLOCKED_DOMAINS` (JSON array) or constant in one place |

---

## Phase 6 — Zero-Regret Deployment Check

### 6.1 CRITICAL — Block Deployment

| Check | Status | Action |
|-------|--------|--------|
| **Hardcoded Google API key** | 🔴 FAIL | Key `AIzaSyBKBnR0ElJN7wO7-oQI7dommPWp3Crhgd0` exposed. **Rotate immediately.** Use n8n Variables or Credentials. |
| **Hardcoded HMAC secret** | 🔴 FAIL | Secret in Sign Payload. Use `$env.SHARED_SECRET` or n8n secret. |
| **Hardcoded Google cx** | 🟡 WARN | `8234580f1acf84e38` — move to env. |

### 6.2 Verify Before Deploy

| Check | Status |
|-------|--------|
| No temporary debug nodes | ✅ |
| Webhook URL correct | ✅ `https://exper-tone.vercel.app/api/webhooks/n8n-callback` |
| ML Rank URL | ✅ `https://expertone.onrender.com/rank` |
| Deterministic outputs | ⚠️ Format Collect Response references two possible nodes |
| Ambiguous conditionals | ✅ Conditions are clear |

### 6.3 Environment Variable Usage

n8n Cloud supports **Workflow Variables** (Settings → Variables). Configure:

```
GOOGLE_API_KEY = <from Google Cloud Console>
GOOGLE_CSE_ID = 8234580f1acf84e38
SHARED_SECRET = <match Vercel SHARED_SECRET>
CALLBACK_URL = https://exper-tone.vercel.app/api/webhooks/n8n-callback
ML_SERVICE_URL = https://expertone.onrender.com
```

---

## Enhancement Opportunities (Ranked by Impact)

| # | Enhancement | Impact | Effort |
|---|-------------|--------|--------|
| 1 | Externalize Google API key + HMAC secret | 🔴 Critical | Low |
| 2 | Add retry on POST Callback (2 retries) | 🔴 High | Low |
| 3 | Add retry on Google Search nodes | 🔴 High | Low |
| 4 | Fix context propagation (Extract Data uses item-specific ctx) | 🟡 Medium | Medium |
| 5 | Parallelize 3 public Google queries | 🟡 Medium | Medium |
| 6 | Cache robots.txt per domain | 🟡 Medium | Medium |
| 7 | Add execution traceId to all paths | 🟢 Observability | Low |
| 8 | Centralize default expert values | 🟢 Maintainability | Low |
| 9 | Fallback on Google/LinkedIn search failure → Minimal Callback | 🟢 Resilience | Medium |

---

## Performance Gains Identified

| Optimization | Est. Gain |
|--------------|-----------|
| Parallelize 3 public queries | ~2x faster collect path |
| Cache robots per domain | Up to 20x fewer robots fetches (if 20 URLs from 2 domains) |
| Early exit when no LinkedIn URL | Skip public search (optional) |
| Limit scrape concurrency | Avoid rate limits; more predictable latency |

---

## Resilience Improvements

| Improvement | Effect |
|-------------|--------|
| Retry POST Callback 2× | Reduces transient Vercel 5xx impact |
| Retry Google Search 2× | Handles 429/500 transient failures |
| Continue On Fail for Scrape | One failed scrape doesn't kill pipeline |
| Fallback on search failure | Graceful degradation to Minimal Callback |

---

## Architectural Refactor Suggestions

1. **Create `expert_hunter_cloud_env.json`** — Use `$env.*` for all secrets and URLs. Document required n8n Variables.
2. **Extract "Scrape with robots"** as reusable sub-workflow or shared code.
3. **Add Error Handler** workflow (n8n feature) — On any error, log to external service or respond with structured error.
4. **Version workflow** — Add `version: "2.0"` in workflow settings for traceability.

---

## Final Recommendation

| Verdict | **GO** |
|---------|-------|
| **Block deployment** until: | n8n env vars configured (GOOGLE_API_KEY, GOOGLE_CSE_ID, SHARED_SECRET). |
| **Recommended before deploy** | Rotate exposed Google API key. |
| **Post-deploy roadmap** | Parallelize queries; cache robots; extract sub-workflows. |

---

## Implementation Status (Applied 2025-02-19)

| Fix | Status |
|-----|--------|
| Replace hardcoded Google API key with `$vars`/`$env` | ✅ Done |
| Replace hardcoded Google cx with `$vars`/`$env` | ✅ Done |
| Replace hardcoded HMAC secret with `$vars`/`$env` | ✅ Done |
| Retry On Fail on all HTTP nodes (Google, robots, scrape, callback, ML rank) | ✅ Done |
| Execution traceId for observability | ✅ Done |
| traceId in all response paths (success + fallbacks) | ✅ Done |
| robots.txt cache per domain (Unique Domains + Combine Robots) | ✅ Done |

## Pre-Deploy Checklist

1. **Configure n8n Variables** — The workflow reads from `$vars` (n8n Variables) or `$env` (system env). Set:
   - `GOOGLE_API_KEY` — Your Google Custom Search API key
   - `GOOGLE_CSE_ID` — Your Custom Search Engine ID (cx)
   - `SHARED_SECRET` — Same value as Vercel `SHARED_SECRET` (for HMAC signing)
   
   **n8n Cloud:** Settings → Variables. **Self-hosted:** Environment variables.

2. **Rotate Google API key** — The previously hardcoded key was exposed; revoke it in Google Cloud Console and create a new one. Use the new key for `GOOGLE_API_KEY`.

3. **Verify callback URL** — Ensure `https://exper-tone.vercel.app/api/webhooks/n8n-callback` (or your app URL) is correct in the POST Callback node.
