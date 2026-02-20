# Step 2 - Testing Guide

## Prerequisites

1. **Clerk**: Create a project at [clerk.com](https://clerk.com), add keys to `.env`
2. **Embeddings**: Add `XAI_API_KEY` (Grok free credits at [console.x.ai](https://console.x.ai)) — or set `EMBEDDING_PROVIDER=openai` and use `OPENAI_API_KEY`
3. **Database**: Run `npm run db:deploy` to apply the `clerk_user_id` migration

## Run the App

```bash
npm install
npm run db:deploy
npm run db:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Clerk.

---

## Testing Semantic Search (Postman / cURL)

The `/api/search` route requires authentication. Use one of these methods:

### Option A: Browser Console (easiest)

1. Sign in at http://localhost:3000
2. Open DevTools (F12) → Console
3. Run:

```javascript
fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'Looking for a fintech expert in MENA' }),
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log);
```

### Option B: Postman

1. Create a POST request to `http://localhost:3000/api/search`
2. Body → raw → JSON: `{"query": "Looking for a fintech expert in MENA"}`
3. **Auth**: Use "Send with cookies" or copy the `__session` cookie from your browser after signing in
4. Send

### Option C: cURL (with session cookie)

1. Sign in in the browser, copy the `__session` cookie from DevTools → Application → Cookies
2. Run:

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Looking for a fintech expert in MENA"}' \
  -b "__session=YOUR_SESSION_COOKIE"
```

---

## Testing createExpert (Server Action)

Create an expert first so search has data. From a React component or a test script:

```tsx
import { createExpert } from '@/app/actions/experts';

// In a form submit handler or button click:
await createExpert({
  name: 'Jane Doe',
  industry: 'Fintech',
  subIndustry: 'Payments',
  country: 'UAE',
  region: 'MENA',
  seniorityScore: 85,
  yearsExperience: 12,
  predictedRate: 250,
  visibilityStatus: 'GLOBAL_POOL',
  contacts: [{ type: 'EMAIL', value: 'jane@example.com' }],
});
```

Or use Prisma Studio to insert an Expert + ExpertVector manually for quick testing.

---

## Expected Search Response

```json
{
  "results": [
    {
      "expert": {
        "id": "...",
        "name": "Jane Doe",
        "industry": "Fintech",
        "subIndustry": "Payments",
        ...
      },
      "similarity": 0.92
    }
  ]
}
```
