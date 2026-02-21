# Environment Variables — Platform Matrix

Complete reference for all env vars across n8n, Vercel, Render, Neon, Cron, GitHub, Prisma, and Clerk.

---

## Quick Status

| Platform | Source | Status |
|----------|--------|--------|
| **Vercel** | Project Settings → Environment Variables | ✅ Set via MCP |
| **Render** (ExperTone ML) | Dashboard → Environment | ⚠️ Add manually |
| **Neon** | Connection strings → Vercel/Render | ✅ In .env |
| **n8n** | Settings → Variables | ⚠️ Add manually |
| **Cron** | Uses Vercel `CRON_SECRET` | ✅ In Vercel |
| **GitHub** | Repo → Settings → Secrets | Optional (CI/CD) |
| **Prisma** | Uses `DATABASE_URL` from env | ✅ Via Vercel |
| **Clerk** | Uses keys from Vercel | ✅ In Vercel |

---

## 1. Vercel (Next.js App)

**Location:** Vercel Dashboard → Your Project → Settings → Environment Variables

| Variable | Production | Preview | Purpose |
|----------|------------|---------|---------|
| `DATABASE_URL` | ✅ | ✅ | Neon pooled connection (Prisma runtime) |
| `DIRECT_URL` | ✅ | ✅ | Neon direct connection (migrations) |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | App URL (e.g. `https://your-app.vercel.app`) |
| `EMBEDDING_PROVIDER` | ✅ openrouter | ✅ | `openrouter` \| `openai` \| `xai` |
| `OPENROUTER_API_KEY` | ✅ | ✅ | From [openrouter.ai](https://openrouter.ai) |
| `ML_SERVICE_URL` | ✅ | ✅ | `https://expertone.onrender.com` |
| `N8N_BASE_URL` | ✅ | ✅ | n8n instance URL (e.g. `https://xxx.app.n8n.cloud`) |
| `N8N_WEBHOOK_URL` | ⚠️ | ⚠️ | Full webhook: `{N8N_BASE_URL}/webhook/hunt` |
| `N8N_API_KEY` | ✅ | ✅ | n8n API key (Settings → API) |
| `SHARED_SECRET` | ✅ | ✅ | HMAC secret (must match n8n) |
| `CLERK_SECRET_KEY` | ✅ | ✅ | Clerk secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | ✅ | Clerk publishable key |
| `CRON_SECRET` | ✅ | ✅ | Bearer token for cron routes |
| `XAI_API_KEY` | (optional) | | When `EMBEDDING_PROVIDER=xai` |
| `PII_ENCRYPTION_KEY` | ⚠️ | | 32+ chars for PII encryption |
| `DRY_RUN` | (optional) | | `true` = cron only logs, no updates |

---

## 2. Render (ExperTone ML Service)

**Location:** [Render Dashboard](https://dashboard.render.com) → ExperTone → Environment

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Neon pooled | Same as Vercel (read-only for ML) |
| `EMBEDDING_PROVIDER` | `openrouter` | Embedding provider |
| `OPENROUTER_API_KEY` | Your key | From openrouter.ai |

**Action:** Add `EMBEDDING_PROVIDER` and `OPENROUTER_API_KEY` if not present. Redeploy after changes.

---

## 3. Neon (Database)

**Location:** [Neon Console](https://console.neon.tech)

- **Pooled** → `DATABASE_URL` (Vercel, Render)
- **Direct** → `DIRECT_URL` (Vercel migrations only)

Neon MCP can provide connection strings. No separate env vars; values flow into Vercel and Render.

---

## 4. n8n

**Location:** n8n Settings → Variables (or workflow credentials)

| Variable | Value | Purpose |
|----------|-------|---------|
| `APP_URL` | Your Vercel URL | Callback: `{APP_URL}/api/webhooks/n8n-callback` |
| `SHARED_SECRET` | Same as Vercel | HMAC for `X-Webhook-Signature` |
| `GOOGLE_API_KEY` | (optional) | For LinkedIn/public source discovery |
| `GOOGLE_CSE_ID` | (optional) | Custom Search Engine ID |

**Action:** Ensure `APP_URL` and `SHARED_SECRET` match Vercel. Expert Hunter workflow POSTs to `{APP_URL}/api/webhooks/n8n-callback`.

---

## 5. Cron (Vercel Cron)

**Location:** Uses Vercel env vars. Cron jobs defined in `vercel.json`:

- `/api/cron/expire-ownership` — daily 02:00
- `/api/cron/optimize-iq` — weekly Sunday 03:00
- `/api/cron/no-spam-auditor` — weekly Sunday 04:00

**Required:** `CRON_SECRET` in Vercel. Vercel sends `Authorization: Bearer {CRON_SECRET}`.

---

## 6. GitHub

**Location:** Repo → Settings → Secrets and variables → Actions

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | (optional) For CI migrations |
| `VERCEL_TOKEN` | (optional) For Vercel CLI in CI |
| `N8N_API_KEY` | (optional) For workflow push scripts |

Only needed if you run migrations or deploys from GitHub Actions.

---

## 7. Prisma

**Location:** Reads from environment (Vercel provides `DATABASE_URL`, `DIRECT_URL`)

- Runtime: `DATABASE_URL` (pooled)
- Migrations: `DIRECT_URL` (direct)

No separate config. Ensure Vercel has both URLs from Neon.

---

## 8. Clerk

**Location:** Keys from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel | Public (client-side) |
| `CLERK_SECRET_KEY` | Vercel | Secret (server-side) |

Use **Production** keys for Vercel production; **Development** for preview/local.

---

## API Key Security

If your OpenRouter or other API keys were ever committed to git, **rotate them** in the provider dashboard (openrouter.ai, x.ai, etc.). Ensure `.env` is in `.gitignore`.

---

## Verification Checklist

- [ ] **Vercel:** All vars set for Production + Preview (OPENROUTER_API_KEY, ML_SERVICE_URL added via MCP)
- [ ] **Render:** Add `DATABASE_URL`, `EMBEDDING_PROVIDER`, `OPENROUTER_API_KEY` in Dashboard → ExperTone → Environment
- [ ] **n8n:** In Settings → Variables, set `APP_URL` (Vercel URL) and `SHARED_SECRET` (same as Vercel). For **production Hunter**, add `N8N_WEBHOOK_URL` in Vercel = your public n8n URL + `/webhook/hunt` (e.g. `https://your-tenant.app.n8n.cloud/webhook/hunt`). Localhost won't work from Vercel.
- [ ] **Neon:** Connection strings already in .env; ensure Vercel has same DATABASE_URL, DIRECT_URL
- [ ] **Cron:** `CRON_SECRET` in Vercel (used by vercel.json cron routes)
- [ ] **Clerk:** Keys in Vercel; use Production keys for prod, Development for preview
- [ ] **GitHub:** Optional — add secrets only if using Actions for migrations/deploys
- [ ] **Prisma:** No separate config; uses DATABASE_URL from Vercel
- [ ] Redeploy Vercel and Render after env changes
