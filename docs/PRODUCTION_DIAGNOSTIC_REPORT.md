# Production Diagnostic Report — Expert Intelligence Platform

**Date:** 2025-02-22  
**Role:** Principal Software Architect & Production Incident Investigator  
**Status:** Full System Audit + Remediation

---

## Phase 1 — Systematic Functionality Audit

### Frontend (Next.js / UI Layer)

| Issue | Location | Severity |
|-------|----------|----------|
| Empty catch blocks swallowing errors | WarRoomClient (projects fetch), CommandCenterClient (poll), DashboardClient | High |
| Fetch without AbortController | InspectorPanel, DataEngine, KnowledgeGraphClient, LiveProgressBento | Medium |
| No loading state for projects | WarRoomClient, DashboardClient | Medium |
| Polling continues after unmount risk | CommandCenterClient (poll can run after clearInterval) | Medium |
| localStorage without SSR guard on write | InspectorPanel saveNotes | Low |

### API / Middleware Layer

| Issue | Location | Severity |
|-------|----------|----------|
| Silent error swallowing | n8n-callback (upsert catch, ML fetch, reputation) | High |
| Inconsistent error response format | experts/resolve, compliance/scan | Medium |
| Unvalidated contact value in query | n8n-callback findExistingExpert | Medium |
| Fire-and-forget without timeout | ML service, n8n webhook calls | High |

### Backend / Service Layer

| Issue | Location | Severity |
|-------|----------|----------|
| External fetch without timeout | ML service (suggested-rate, rank, predict-rate, graph) | High |
| Fire-and-forget async (void) | add-to-project, coordinator create-expert | Medium |
| Empty catch blocks | n8n-callback, search (contact attempt) | High |

### Database Layer

| Issue | Location | Severity |
|-------|----------|----------|
| N+1 query pattern | admin/users (converted count per user) | High |
| N+1 query pattern | admin/liquidity (supply count per project) | High |
| N+1 in findExistingExpert | n8n-callback (contact loop) | High |
| N+1 contact creation | n8n-callback (create per contact) | High |
| N+1 in expire-ownership | cron (audit + notification per candidate) | Medium |

---

## Phase 2 — Root Cause Framework

### Malfunction 1: Projects dropdown empty / Add button does nothing

| Field | Value |
|-------|-------|
| **Symptom** | Projects fetch fails silently; Add disabled |
| **Expected** | Projects load; Add enabled when project selected |
| **Actual** | Empty catch swallows error; no loading/error state |
| **Root cause** | `fetch('/api/projects').catch(() => {})` |
| **Evidence** | WarRoomClient.tsx:167 |
| **Fix** | Add error state, log errors, show fallback |
| **Regression risk** | Low |

### Malfunction 2: n8n callback creates experts but ML/reputation fail silently

| Field | Value |
|-------|-------|
| **Symptom** | Experts created but predictedRateRange/reputation not updated |
| **Expected** | ML suggested rate + reputation computed |
| **Actual** | Fire-and-forget fetch/call with empty catch |
| **Root cause** | `.catch(() => {})` on ML fetch; `computeReputationScore(...).catch(() => {})` |
| **Evidence** | n8n-callback route.ts:175-176 |
| **Fix** | Add timeout, log errors, optional retry |
| **Regression risk** | Low |

### Malfunction 3: Admin users/liquidity slow under load

| Field | Value |
|-------|-------|
| **Symptom** | Admin pages slow with many users/projects |
| **Expected** | Single or batched queries |
| **Actual** | N+1: one count query per user |
| **Root cause** | `Promise.all(users.map(async u => prisma.expert.count(...)))` |
| **Evidence** | admin/users route.ts:31-53 |
| **Fix** | Use single grouped query or include _count |
| **Regression risk** | Low |

### Malfunction 4: n8n callback N+1 on contact lookup/creation

| Field | Value |
|-------|-------|
| **Symptom** | Callback slow with many contacts |
| **Expected** | Batch lookup and create |
| **Actual** | One findFirst per contact; one create per contact |
| **Root cause** | Sequential loop over contacts |
| **Evidence** | n8n-callback route.ts:32-42, 134-143 |
| **Fix** | Batch find; createMany for contacts |
| **Regression risk** | Medium (encryption per contact) |

### Malfunction 5: Command Center polling errors ignored

| Field | Value |
|-------|-------|
| **Symptom** | Poll fails; UI shows stale data |
| **Expected** | Error surfaced or retried |
| **Actual** | `catch { /* ignore */ }` |
| **Root cause** | Empty catch in poll() |
| **Evidence** | CommandCenterClient.tsx:75-77 |
| **Fix** | Log error; optional error state |
| **Regression risk** | Low |

---

## Phase 3 — Performance & Stability Audit

| Metric | Finding |
|--------|---------|
| API response time | No centralized timing; add middleware |
| Query execution | N+1 in admin, n8n-callback; add indexes where needed |
| Caching | No Redis; consider for resolve, projects |
| Error rate | Silent failures inflate success rate |
| Logging | Gaps: empty catches, fire-and-forget |

**Systemic weaknesses:**
- No request timeout middleware
- No structured error logging (e.g. Pino)
- Fire-and-forget pattern overused
- No circuit breaker for external APIs

---

## Phase 4 — Remediation Plan

### Immediate Critical Fixes (Production Blocking)

1. **n8n-callback**: Add error logging to catch blocks; add timeout to ML fetch
2. **admin/users**: Eliminate N+1 with single query
3. **WarRoomClient**: Add projects error state; don't swallow errors
4. **External fetches**: Add AbortSignal.timeout(10_000) to ML/n8n calls

### Structural Refactors (Short-Term)

5. **n8n-callback**: Batch contact creation (createMany)
6. **n8n-callback**: Optimize findExistingExpert (single query for contacts)
7. **CommandCenterClient**: Add AbortController; log poll errors
8. **Standardize error format**: `{ error, code?, details? }`

### Architectural Improvements (Mid-Term)

9. **Fetch utility**: Central `fetchWithTimeout(url, opts, ms)`
10. **Logging**: Structured logger with request ID
11. **Circuit breaker**: For ML service, n8n

### Monitoring & Observability

12. **Health check**: Include ML, DB, n8n connectivity
13. **Error tracking**: Sentry or similar
14. **Slow query log**: Prisma middleware

---

## Execution Checklist

- [x] Fix n8n-callback error handling + timeout
- [x] Fix admin/users N+1
- [x] Fix admin/liquidity error handling
- [x] Fix WarRoomClient projects fetch
- [x] Fix CommandCenterClient poll
- [x] Add fetchWithTimeout utility
- [x] Apply timeout to ML fetches (rank, suggested-rate, predict-rate, graph)
- [x] Batch n8n contact creation (createMany)
- [x] Add validation for contact values in findExistingExpert

### Phase 5 — Continued Stabilization (Completed)

- [x] AbortController on InspectorPanel, DataEngine, LiveProgressBento, KnowledgeGraphClient, SearchFilterNexus
- [x] Standardized apiError helper in lib/errors.ts
- [x] Request timing utility (lib/api-instrument.ts) for slow-request logging

### Phase 6 — Further Stabilization (Completed)

- [x] Expire-ownership N+1: batch auditLog + notification createMany
- [x] apiError + api-instrument on experts/resolve, n8n-callback
- [ ] Prisma slow-query (Prisma 6 removed $use; use $extends query component if needed)
