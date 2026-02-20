# Expert Hunter Workflow (includes Expert Data Collector)

The **Expert Hunter** workflow (`expert_hunter_v1.json`) supports two modes via the same webhook.

## Overview

**Rank mode** (existing): Ranks project experts via ML service.

**Collect mode** (expert data collection): Identifies and aggregates public information about a specific expert:

- **Never scraping LinkedIn** – Uses Google Search API to discover LinkedIn URL only; stores as reference
- **Respecting robots.txt** – Checks each domain before scraping; skips disallowed paths
- **Disambiguating identity** – Validates collected data refers to the correct person
- **Quality control** – Scores confidence, flags ambiguous data, discards low-confidence records

## Webhook

**Path:** `POST /webhook/hunt`

**Enhancements (current workflow):**
- **Batch experts** – Send `body.experts: [{ name, company?, title?, ... }]` to collect multiple experts in one run; one callback with all.
- **Multiple search queries** – Three public-source queries (main, interview, conference speaker); results merged and deduped (max 20 URLs).
- **Richer extraction** – JSON-LD Person (jobTitle, worksFor), sentences with award/speaker/keynote/panel for `notableAchievements`.
- **Confidence breakdown** – `confidenceReasons`: `company_match`, `title_match`, `name_mentioned`, `multiple_sources`; passed in expert `_meta`.
- **Publication deduplication** – Publications deduped by normalized title before aggregation.
- **Minimal callback when no sources** – If no scrapable pages, still POST one expert (from input) so the app can store name + project link.

**Collect mode body** (include `expertName` or `experts`):
```json
{
  "projectId": "clxxx...",
  "expertName": "John Smith",
  "company": "Acme Corp",
  "title": "CEO",
  "location": "United States",
  "industry": "Technology"
}
```

Or with `filterCriteria` (from research project):
```json
{
  "projectId": "clxxx...",
  "query": "John Smith CEO Acme",
  "filterCriteria": {
    "industry": "Technology",
    "countries": ["United States"]
  }
}
```

## Environment Variables (n8n)

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google Cloud API key with Custom Search API enabled |
| `GOOGLE_CSE_ID` | Programmable Search Engine ID ([create one](https://programmablesearchengine.google.com/)) |
| `SHARED_SECRET` or `N8N_WEBHOOK_SECRET` | HMAC secret for callback signature verification |
| `APP_URL` | Next.js app URL for callback (default: `http://host.docker.internal:3000` when n8n runs in Docker) |

## Flow

1. **Extract Input** – Normalize body to one item per expert (supports `body.experts[]` batch or single `body.expertName`)
2. **Collect Mode?** – If `expertName` present → collect; else → ML rank
3. **Build Search Queries** – LinkedIn query + main public query
4. **Parse LinkedIn URL** – Store LinkedIn URL (reference only)
5. **Build Public Queries** – Three variants: main, "interview", "conference speaker"
6. **Google Search - Public Sources** – Runs 3× (one per query)
7. **Merge Google Results** – Dedupe URLs, filter blocked domains, max 20 URLs
8. **Fetch robots.txt** – Per-domain compliance check
9. **Check robots.txt** – Parse rules; allow only permitted paths
10. **Scrape Page** – Fetch allowed pages only
11. **Extract Data** – Parse HTML, JSON-LD (Person), meta, achievements (award/speaker/keynote)
12. **Disambiguate & Aggregate** – Confidence reasons, dedupe publications, notable achievements
13. **Has Sources?** – No sources → **Minimal Callback** (expert from input); else Quality Control
14. **Quality Control** – Discard if confidence &lt; 0.4; pass confidenceReasons in _meta
15. **Format Callback** – Aggregate all experts (batch) into one payload
16. **POST Callback** – Send to `/api/webhooks/n8n-callback` with HMAC signature

## Output Schema

Experts sent to the callback match the app’s `InboundExpert` type:

```json
{
  "name": "John Smith",
  "industry": "Technology",
  "sub_industry": "SaaS",
  "country": "United States",
  "region": "NA",
  "seniority_score": 50,
  "years_experience": 5,
  "predicted_rate": 150,
  "contacts": [{ "type": "email", "value": "john@example.com" }]
}
```

## Push to n8n

```bash
npm run n8n:push
```

Requires `N8N_API_KEY` in `.env`. The script pushes `workflows/expert_hunter_v1.json` and activates it.

## Integration with App

To trigger **collect mode** from the app:

```ts
const res = await fetch(`${N8N_BASE_URL}/webhook/hunt`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: project.id,
    expertName: 'John Smith',
    company: 'Acme Corp',
    industry: 'Technology',
  }),
});
```

The workflow will POST results to `/api/webhooks/n8n-callback` when complete.
