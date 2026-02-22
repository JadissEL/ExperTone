# DevOps Audit & Cross-Platform Environment Sync

**Role:** Principal DevOps Architect  
**Scope:** Next.js (Vercel) ↔ n8n Cloud ↔ Neon (pgvector) ↔ AI Provider  
**Date:** 2026-02-21

---

## Executive Summary

| Area | Status | Action |
|------|--------|--------|
| **Local .env** | ⚠️ Gaps | Add NEXT_PUBLIC_APP_URL, N8N_WEBHOOK_URL, SHARED_SECRET, ML_SERVICE_URL |
| **Vercel** | ⚠️ Partial | Add N8N_WEBHOOK_URL, OPENROUTER_API_KEY, ML_SERVICE_URL |
| **n8n Cloud** | ⚠️ Restricted | Use `expert_hunter_cloud_no_env.json` (no Environments) |
| **Neon** | ✅ OK | DATABASE_URL pgvector-compatible |
| **Secrets** | ⚠️ Risk | Rotate keys if ever committed; .env in .gitignore |

**Key constraint:** n8n Cloud free/starter tiers do not support Environments (Enterprise). Use workflow variant with webhook-injected config or hardcoded production URLs.

---

## Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Secrets in .env committed | High | Ensure .env in .gitignore; rotate if leaked |
| N8N_BASE_URL localhost in prod | High | Vercel must use https://ecosbuilder.app.n8n.cloud |
| HMAC mismatch n8n ↔ Next.js | High | SHARED_SECRET must match exactly |
| $env unavailable in n8n Cloud | Medium | Use cloud_no_env workflow or webhook params |
| DATABASE_URL format | Low | Neon pooled = serverless; direct = migrations |

---

## Phase 1 — Environment Audit & Validation

### 1.1 Environment Audit Table

| Key | Local .env | Vercel | Classification | Status |
|-----|------------|--------|----------------|--------|
| **NEXT_PUBLIC_APP_URL** | Missing | ✅ | Public (client) | ⚠️ Add locally; must = Vercel domain |
| **N8N_API_KEY** | ✅ | ✅ | Secret | OK |
| **N8N_WEBHOOK_URL** | Missing | Partial | Secret (URL) | ⚠️ Add: `https://ecosbuilder.app.n8n.cloud/webhook/hunt` |
| **N8N_BASE_URL** | localhost | ✅ | Config | ⚠️ Local dev only; prod = ecosbuilder |
| **DATABASE_URL** | ✅ | ✅ | Secret | Neon pooled; pgvector OK |
| **DIRECT_URL** | ✅ | ✅ | Secret | Neon direct; migrations |
| **NEON_DATABASE_URL** | N/A | N/A | Alias | Use DATABASE_URL (same) |
| **GROK_API_KEY** | N/A | N/A | Secret | Map to XAI_API_KEY (Grok = xAI) |
| **XAI_API_KEY** | Missing | ✅ | Secret | Optional when EMBEDDING_PROVIDER=xai |
| **OPENROUTER_API_KEY** | ✅ | Partial | Secret | ⚠️ Ensure in Vercel |
| **EMBEDDING_PROVIDER** | ✅ openrouter | ✅ | Config | OK |
| **HMAC_SECRET** | Missing | N/A | Secret | Use SHARED_SECRET (alias) |
| **SHARED_SECRET** | Missing | ✅ | Secret | ⚠️ Add locally; must match n8n |
| **ML_SERVICE_URL** | Missing | Partial | Config | ⚠️ Add: `https://expertone.onrender.com` |
| **CRON_SECRET** | Missing | ✅ | Secret | OK (Vercel-only) |
| **CLERK_*** | ✅ | ✅ | Mixed | OK |
| **PII_ENCRYPTION_KEY** | Missing | Missing | Secret | Optional; add for prod |

### 1.2 URL & Format Validation

| Variable | Expected Format | Local | Vercel |
|----------|-----------------|-------|--------|
| NEXT_PUBLIC_APP_URL | `https://<domain>` | Missing | Encrypted |
| N8N_WEBHOOK_URL | `https://ecosbuilder.app.n8n.cloud/webhook/hunt` | N/A | Add |
| DATABASE_URL | `postgresql://...?sslmode=require` | ✅ | ✅ |
| ML_SERVICE_URL | `https://expertone.onrender.com` | Missing | Add |

### 1.3 Required Corrections

1. **Add to .env (local parity):**
   ```
   NEXT_PUBLIC_APP_URL="https://exper-tone.vercel.app"
   N8N_WEBHOOK_URL="https://ecosbuilder.app.n8n.cloud/webhook/hunt"
   N8N_BASE_URL="https://ecosbuilder.app.n8n.cloud"
   SHARED_SECRET="<same-as-vercel>"
   ML_SERVICE_URL="https://expertone.onrender.com"
   ```

2. **Secrets must NOT use NEXT_PUBLIC_ prefix** — ✅ Compliant (only NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_CLERK_* are public).

3. **HTTPS enforced** — All production URLs must use `https://`.

---

## Phase 2 — N8N Workflow Hardening

### 2.1 Workflow Files Located

| File | Purpose |
|------|---------|
| `workflows/expert_hunter_v1.json` | Canonical; uses $env (Environments) |
| `workflows/expert_hunter_cloud_no_env.json` | Cloud-safe; no $env |

### 2.2 $env Usage in expert_hunter_v1.json

| Node | Variable | Fallback |
|------|----------|----------|
| Sign Payload | `$env.SHARED_SECRET`, `$env.N8N_WEBHOOK_SECRET` | — |
| POST Callback | `$env.APP_URL` | `http://host.docker.internal:3000` |
| Google Search (×2) | `$env.GOOGLE_API_KEY`, `$env.GOOGLE_CSE_ID` | — |
| ML Rank Experts | — | Hardcoded `http://host.docker.internal:8000/rank` |

### 2.3 Refactor Summary (expert_hunter_cloud_no_env.json)

| Change | Before | After |
|--------|--------|-------|
| POST Callback URL | `{{ $env.APP_URL \|\| 'http://host.docker.internal:3000' }}/api/webhooks/n8n-callback` | `https://exper-tone.vercel.app/api/webhooks/n8n-callback` |
| Sign Payload secret | `$env.SHARED_SECRET\|\|$env.N8N_WEBHOOK_SECRET` | `'PASTE_YOUR_SHARED_SECRET'` (user edits in n8n) |
| ML Rank URL | `http://host.docker.internal:8000/rank` | `https://expertone.onrender.com/rank` |

**Fallback strategy (n8n Cloud without Environments):**
- Use `expert_hunter_cloud_no_env.json` with production URLs hardcoded.
- User replaces `PASTE_YOUR_SHARED_SECRET` in Sign Payload node manually.
- Alternative: Next.js could pass `callbackUrl` and `signature` in webhook body; n8n uses those. (Not implemented; requires workflow + API changes.)

### 2.4 Clean Cloud-Compatible Version

**File:** `workflows/expert_hunter_cloud_no_env.json`  
**Status:** Ready for import.  
**Manual step:** Edit Sign Payload node → replace `PASTE_YOUR_SHARED_SECRET` with Vercel `SHARED_SECRET`.

---

## Phase 3 — Vercel + Neon Synchronization

### 3.1 CLI Commands (Production)

```bash
# From project root
cd "c:\Users\Jadiss\OneDrive\Bureau\Dialectica\N8N Workflow"

# Core (ensure set)
vercel env add N8N_WEBHOOK_URL production
# Value: https://ecosbuilder.app.n8n.cloud/webhook/hunt

vercel env add N8N_BASE_URL production
# Value: https://ecosbuilder.app.n8n.cloud

vercel env add OPENROUTER_API_KEY production
# Value: <your-openrouter-key>

vercel env add ML_SERVICE_URL production
# Value: https://expertone.onrender.com

vercel env add NEXT_PUBLIC_APP_URL production
# Value: https://exper-tone.vercel.app

# Already present (verify)
# DATABASE_URL, DIRECT_URL, SHARED_SECRET, CRON_SECRET, CLERK_*, N8N_API_KEY, EMBEDDING_PROVIDER
```

### 3.2 Repeat for Preview

```bash
vercel env add N8N_WEBHOOK_URL preview
vercel env add N8N_BASE_URL preview
vercel env add OPENROUTER_API_KEY preview
vercel env add ML_SERVICE_URL preview
vercel env add NEXT_PUBLIC_APP_URL preview
```

### 3.3 Validation Checklist

- [ ] `DATABASE_URL` = Neon pooled connection (from Neon Console)
- [ ] `DIRECT_URL` = Neon direct connection
- [ ] `NEXT_PUBLIC_APP_URL` = Vercel production domain (https)
- [ ] `N8N_WEBHOOK_URL` = `https://ecosbuilder.app.n8n.cloud/webhook/hunt`
- [ ] `SHARED_SECRET` matches n8n Sign Payload (or HMAC verification fails)
- [ ] `ML_SERVICE_URL` = `https://expertone.onrender.com`

### 3.4 Misconfiguration Risks

| Risk | Impact |
|------|--------|
| SHARED_SECRET mismatch | n8n callback rejected (401) |
| N8N_WEBHOOK_URL localhost | Hunter Trigger 503 in production |
| Wrong DATABASE_URL | Prisma/Neon connection failures |

---

## Phase 4 — Clean Deployment Package for n8n Cloud

### 4.1 Manifest (manifest.json)

```json
{
  "version": "1.0.0",
  "timestamp": "2026-02-21T00:00:00Z",
  "workflows": [
    "expert_hunter_cloud_no_env.json"
  ],
  "webhookBaseUrl": "https://ecosbuilder.app.n8n.cloud",
  "callbackBaseUrl": "https://exper-tone.vercel.app",
  "notes": [
    "Import expert_hunter_cloud_no_env.json",
    "Edit Sign Payload node: replace PASTE_YOUR_SHARED_SECRET with Vercel SHARED_SECRET",
    "Activate workflow"
  ]
}
```

### 4.2 Deployment Zip Structure

```
n8n-deploy-20260221/
├── manifest.json
├── workflows/
│   └── expert_hunter_cloud_no_env.json
└── README.txt
```

### 4.3 README.txt (in zip)

```
n8n Cloud Deployment — Expert Hunter
====================================
1. Import workflows/expert_hunter_cloud_no_env.json
2. Open Sign Payload node → replace PASTE_YOUR_SHARED_SECRET with your Vercel SHARED_SECRET
3. Verify POST Callback URL = https://exper-tone.vercel.app/api/webhooks/n8n-callback
4. Activate workflow
5. Webhook: https://ecosbuilder.app.n8n.cloud/webhook/hunt
```

---

## Phase 5 — Execution Plan

### Step 1: Scan & Reconcile Environment Variables

```powershell
# Add to .env (local)
# NEXT_PUBLIC_APP_URL="https://exper-tone.vercel.app"
# N8N_WEBHOOK_URL="https://ecosbuilder.app.n8n.cloud/webhook/hunt"
# N8N_BASE_URL="https://ecosbuilder.app.n8n.cloud"
# SHARED_SECRET="<copy-from-vercel>"
# ML_SERVICE_URL="https://expertone.onrender.com"
```

### Step 2: Env Schema (Optional — for HUNTER_API_KEY, CLOSER_API_KEY)

These keys are not used in the current codebase. Add to `.env.example` if planned:

```
# HUNTER_API_KEY="..."   # Future: dedicated Hunter API auth
# CLOSER_API_KEY="..."   # Future: Closer/outreach API
```

### Step 3: Verify Next.js Runtime Configuration

- `next.config.*` — no env overrides required.
- `process.env` usage — server-only except `NEXT_PUBLIC_*`.

### Step 4: Run Vercel Sync Commands

Execute Phase 3.1 and 3.2 CLI blocks.

### Step 5: Validate Webhook Handshake (HMAC)

```bash
# Test HMAC verification
# 1. Get SHARED_SECRET from Vercel
# 2. Compute: echo -n '{"projectId":"test"}' | openssl dgst -sha256 -hmac "$SECRET" -hex
# 3. POST to /api/webhooks/n8n-callback with X-Webhook-Signature: <hex>
```

### Step 6: Confirm Neon DB Connectivity

```bash
npx prisma db execute --stdin <<< "SELECT 1"
# Or: npx prisma migrate status
```

### Step 7: End-to-End Trigger Test

1. Next.js: POST `/api/hunter/trigger` with `{ projectId, query }`
2. n8n: Receives at `/webhook/hunt`, runs Rank or Collect
3. n8n: POSTs to `/api/webhooks/n8n-callback`
4. Next.js: Verifies HMAC, writes to Neon

---

## Validation & Testing Procedure

| Test | Command / Action | Expected |
|------|------------------|----------|
| Local env load | `node -e "require('dotenv').config(); console.log(process.env.N8N_WEBHOOK_URL)"` | URL or undefined |
| Vercel env | `vercel env ls production` | All keys listed |
| Neon connect | `npx prisma migrate status` | Up to date |
| Hunter Search | POST /api/hunter/search `{ query: "test" }` | 200 + results or empty |
| Hunter Trigger | POST /api/hunter/trigger `{ projectId, query }` | 200 or 503 if n8n misconfigured |
| n8n callback | Manual POST with valid HMAC | 200 |

---

## Appendix: Variable Mapping

| Spec Name | Project Name | Notes |
|-----------|--------------|-------|
| NEON_DATABASE_URL | DATABASE_URL | Same (Neon pooled) |
| GROK_API_KEY | XAI_API_KEY | Grok = xAI |
| HMAC_SECRET | SHARED_SECRET | Alias; both supported |
