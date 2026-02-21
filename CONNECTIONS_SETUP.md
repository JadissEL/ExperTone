# Vercel ↔ n8n ↔ Neon — Connection Setup

This guide ensures Vercel, n8n, and Neon are correctly wired for the ExperTone platform.

---

## Connection Flow

```
┌─────────────┐     N8N_WEBHOOK_URL      ┌─────────────┐     APP_URL + /api/webhooks/n8n-callback     ┌─────────────┐
│   Vercel    │ ───────────────────────► │    n8n      │ ─────────────────────────────────────────► │   Vercel    │
│  (Next.js)  │     POST /webhook/hunt   │  (Hunter)   │     POST results back                        │  (callback) │
└─────────────┘                          └─────────────┘                                              └─────────────┘
       │                                         │
       │ DATABASE_URL                            │ (optional: GOOGLE_* for scraping)
       ▼                                         │
┌─────────────┐                                  │
│    Neon     │ ◄────────────────────────────────┘
│ (PostgreSQL)│   (n8n can write via callback → Vercel → Prisma → Neon)
└─────────────┘
```

---

## 1. Vercel Environment Variables

**Location:** Vercel Dashboard → Your Project → Settings → Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_WEBHOOK_URL` | ✅ | Full webhook URL for Hunter Trigger. Format: `https://YOUR_N8N_INSTANCE/webhook/hunt` |
| `N8N_BASE_URL` | Alternative | If `N8N_WEBHOOK_URL` is unset, used as base: `{N8N_BASE_URL}/webhook/hunt` |
| `DATABASE_URL` | ✅ | Neon pooled connection (from Neon Console) |
| `DIRECT_URL` | ✅ | Neon direct connection (for migrations) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your Vercel app URL, e.g. `https://exper-tone.vercel.app` |
| `SHARED_SECRET` | ✅ | HMAC secret; must match n8n (for webhook verification) |
| `XAI_API_KEY` | ✅ | For embeddings (Hunter Search) |

### Get n8n Webhook URL

- **n8n Cloud:** `https://YOUR_TENANT.app.n8n.cloud/webhook/hunt`
- **Self-hosted:** `https://your-n8n-domain.com/webhook/hunt`
- **Local dev:** `http://localhost:5678/webhook/hunt` (not reachable from Vercel)

---

## 2. n8n Environment Variables

**Location:** n8n Settings → Variables (or workflow credentials)

| Variable | Value | Purpose |
|----------|-------|---------|
| `APP_URL` | Your Vercel URL (e.g. `https://exper-tone.vercel.app`) | Callback target: n8n POSTs to `{APP_URL}/api/webhooks/n8n-callback` |
| `SHARED_SECRET` | Same as Vercel `SHARED_SECRET` | HMAC signing for callback verification |
| `GOOGLE_API_KEY` | (optional) | For LinkedIn/public source discovery |
| `GOOGLE_CSE_ID` | (optional) | Custom Search Engine ID |

---

## 3. Neon (Database)

- Copy **Pooled** connection → `DATABASE_URL` in Vercel
- Copy **Direct** connection → `DIRECT_URL` in Vercel
- Run migrations: `npx prisma migrate deploy` (Vercel build runs this automatically)

---

## 4. Quick Setup via MCP

If you have Vercel, n8n, and Neon MCP servers connected in Cursor:

1. **Update N8N_WEBHOOK_URL in Vercel** — `N8N_WEBHOOK_URL` has been added with a placeholder. Go to Vercel → Project → Settings → Environment Variables and **replace** it with your actual n8n webhook URL (e.g. `https://your-tenant.app.n8n.cloud/webhook/hunt` for n8n Cloud).
2. **Verify n8n has APP_URL** — In n8n Settings → Variables, set `APP_URL` to your Vercel production URL (e.g. `https://exper-tone.vercel.app`).
3. **Verify Neon** — Ensure `DATABASE_URL` and `DIRECT_URL` in Vercel point to your Neon project (use Neon MCP `get_connection_string` if needed).

---

## 5. Verification Checklist

- [ ] `N8N_WEBHOOK_URL` or `N8N_BASE_URL` in Vercel points to a **public** n8n URL (not localhost)
- [ ] `APP_URL` in n8n = your Vercel production URL
- [ ] `SHARED_SECRET` matches in both Vercel and n8n
- [ ] Expert Hunter workflow is **Active** in n8n
- [ ] `DATABASE_URL` in Vercel is from Neon Console
- [ ] Redeploy Vercel after changing env vars
