# Expert Hunter — Self-Contained Workflow Architecture

**Constraint:** No access to n8n Cloud environment variables (paid feature).  
**Solution:** All configuration embedded in workflow. Works immediately upon upload.

---

## 1. Chosen Embedding Strategy: Option A — Initial Config Node

### Reasoning

| Criterion | Option A (Config Node) | Option B (Code Injection) | Option C (Webhook Injection) |
|-----------|------------------------|---------------------------|------------------------------|
| Centralization | ✅ Single source of truth | ❌ Scattered across nodes | ❌ Caller must send secrets |
| Maintainability | ✅ Edit one node | ❌ Edit multiple nodes | ❌ Requires backend changes |
| Security | ⚠️ One place to protect | ⚠️ Multiple places | ❌ Secrets in every request |
| Portability | ✅ Upload and run | ✅ Upload and run | ❌ Depends on caller |
| No paid features | ✅ Works on free tier | ✅ Works on free tier | ✅ Works on free tier |

**Decision:** Config node at workflow entry. All secrets live in one Code node; downstream nodes reference via `$('Config').first().json.KEY`.

---

## 2. Refactor Summary

### Changes Applied

1. **Config node** — Inserted between Webhook and Extract Input.
   - Receives webhook payload.
   - Outputs `{ GOOGLE_API_KEY, GOOGLE_CSE_ID, SHARED_SECRET, CALLBACK_URL, body }`.
   - Passes `body` through for Extract Input.

2. **Connection updates**
   - `Webhook → Config → Extract Input` (was `Webhook → Extract Input`).

3. **Node reference updates**
   - Google Search (LinkedIn): `key` = `$('Config').first().json.GOOGLE_API_KEY`, `cx` = `$('Config').first().json.GOOGLE_CSE_ID`
   - Google Search (Public): same
   - Sign Payload: `secret` = `$('Config').first().json.SHARED_SECRET`
   - POST Callback: `url` = `$('Config').first().json.CALLBACK_URL`

---

## 3. How to Reference Embedded Variables

### In Expression Fields (HTTP Request, Set, etc.)

```
{{ $('Config').first().json.GOOGLE_API_KEY }}
{{ $('Config').first().json.GOOGLE_CSE_ID }}
{{ $('Config').first().json.SHARED_SECRET }}
{{ $('Config').first().json.CALLBACK_URL }}
```

### In Code Nodes

```javascript
const cfg = $('Config').first().json;
const apiKey = cfg.GOOGLE_API_KEY;
const secret = cfg.SHARED_SECRET;
```

### Config Node Structure

```javascript
const C = {
  GOOGLE_API_KEY: 'REPLACE_WITH_GOOGLE_API_KEY',
  GOOGLE_CSE_ID: '8234580f1acf84e38',
  SHARED_SECRET: 'a7f3c9e2b1d4f6a8c0e5b9d2f7a1c4e8',
  CALLBACK_URL: 'https://exper-tone.vercel.app/api/webhooks/n8n-callback'
};
```

---

## 4. Security Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| **Secrets in workflow JSON** | 🔴 High | Workflow file contains secrets. Exclude from public repos; use `.gitignore` for deploy packages. |
| **Config visible in n8n UI** | 🟡 Medium | Anyone with workflow edit access sees Config. Use n8n permissions; restrict who can edit. |
| **Execution logs** | 🟡 Medium | n8n may log node outputs. Config output includes secrets. Avoid "Include Input/Output" in error workflows. |
| **Response leakage** | 🟢 Low | Config is never returned in webhook response. Format Collect/Rank Response do not include it. |
| **Key rotation** | 🟡 Medium | Rotating secrets requires editing Config node. Document the process. |

### Security Constraints Applied

- ✅ No secrets in node descriptions or notes (only generic references).
- ✅ Config not logged or returned in responses.
- ✅ Sensitive constants marked with `/* CONFIG */` comment.
- ⚠️ **Unavoidable:** Secrets exist in workflow JSON. Mitigate with repo access control and `.gitignore`.

---

## 5. Upload-Ready Confirmation Checklist

Before uploading to n8n:

- [ ] **Replace `REPLACE_WITH_GOOGLE_API_KEY`** in Config node with your Google Custom Search API key.
- [ ] **Verify `GOOGLE_CSE_ID`** — `8234580f1acf84e38` or your Custom Search Engine ID.
- [ ] **Verify `SHARED_SECRET`** — Must match Vercel `SHARED_SECRET` exactly (HMAC verification).
- [ ] **Verify `CALLBACK_URL`** — `https://exper-tone.vercel.app/api/webhooks/n8n-callback` or your app URL.
- [ ] **Test Rank mode** — POST `{ "projectId": "test-123" }` to webhook; expect ML rank response.
- [ ] **Test Collect mode** — POST `{ "projectId": "test-123", "expertName": "John Doe" }`; expect callback flow.

### Post-Upload

- [ ] Confirm webhook URL in n8n matches `N8N_WEBHOOK_URL` in your Next.js env.
- [ ] Test end-to-end from War Room or Hunter Search.

---

## 6. Variable Reference Table

| Variable | Source | Used By |
|----------|--------|---------|
| `GOOGLE_API_KEY` | Config node | Google Search (LinkedIn), Google Search (Public) |
| `GOOGLE_CSE_ID` | Config node | Google Search (LinkedIn), Google Search (Public) |
| `SHARED_SECRET` | Config node | Sign Payload |
| `CALLBACK_URL` | Config node | POST Callback |

---

## 7. Migration from Env-Based Workflow

If migrating from a workflow that used `$env` or `$vars`:

1. Remove all `$env.*` and `$vars.*` references.
2. Replace with `$('Config').first().json.*`.
3. Ensure Config node runs first (Webhook → Config → …).
4. No n8n Variables or environment configuration needed.
