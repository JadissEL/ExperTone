# ExperTone — Project Status

**Last updated:** 2026-02-21

---

## ✅ Completed

### Infrastructure & MCP
- **Vercel** — Deployed, ML_SERVICE_URL added
- **Render** — ML service live at https://expertone.onrender.com
- **Neon** — Schema migrated, pgvector enabled
- **MCP** — Clerk, GitHub, mcp-cron, n8n, Neon, Render, Vercel connected

### Code Quality
- **Jest** — 8 suites, 53 tests passing
- **ML pytest** — 16 tests passing
- **Test fixes** — expert-access (Clerk mock), api-schemas (common schemas extraction)

### Features
- **Hunter Search** — Uses XAI embeddings + pgvector; returns results when expert_vectors has data
- **ML Graph** — ML_SERVICE_URL points to Render; graph visualize should work after redeploy
- **Error handling** — Clear messages for missing env, localhost, placeholder URLs

---

## 🔧 One-Time Setup

### 1. Populate Hunter Search (experts + embeddings)
```bash
npm run db:seed-embeddings
```
Requires: Valid `XAI_API_KEY` (from [console.x.ai](https://console.x.ai)) or `OPENAI_API_KEY`, `DATABASE_URL` in `.env`.  
If you get "Incorrect API key", regenerate the key at console.x.ai and update `.env`.

### 2. n8n Hunter Trigger (optional)
- Set `N8N_WEBHOOK_URL` in Vercel to your n8n webhook (e.g. `https://your-tenant.app.n8n.cloud/webhook/hunt`)
- Set `APP_URL` in n8n to your Vercel URL

### 3. Redeploy Vercel
After adding `ML_SERVICE_URL`, redeploy so the graph and ML endpoints use the Render service.

---

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Jest (53 tests) |
| `npm run ml:test` | ML pytest (16 tests) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |

---

## Service URLs

| Service | URL |
|---------|-----|
| App (Vercel) | https://exper-tone.vercel.app |
| ML (Render) | https://expertone.onrender.com |
| Neon DB | DocPlot project (rough-water-18565688) |
