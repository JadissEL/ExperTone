# Step 4 - Frontend Integration & 3D Knowledge Graph

## Overview

Step 4 adds the **3D Knowledge Graph** visualization to the ExperTone frontend, powered by the graph data from the ML service (Step 3 Supplement).

## Prerequisites

1. **ML service running** – `npm run ml:start` (or `cd ml-service; python -m uvicorn main:app --reload`)
2. **Database** – Experts with `past_employers` and `skills` (run `add_expert_graph_fields` migration)
3. **Signed in** – Clerk authentication required for the graph API

## Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, then go to **View 3D Knowledge Graph** or navigate to [http://localhost:3000/graph](http://localhost:3000/graph).

## What's Included

| Item | Description |
|------|-------------|
| `POST /api/ml/graph/visualize` | Next.js API route that proxies to ML service `POST /graph/visualize` |
| `/graph` page | 3D force-directed graph of Experts, Companies, and Skills |
| `react-force-graph-3d` | Renders the graph with WebGL; drag to rotate, scroll to zoom |

## Graph Node Types

- **Expert** (blue) – People in the expert pool
- **Company** (green) – Past employers
- **Skill** (amber) – Skills or industry domains

Links: **ALUMNI** (Expert → Company), **HAS_SKILL** (Expert → Skill).

## Environment

Ensure `ML_SERVICE_URL` is set in `.env` if the ML service runs elsewhere:

```
ML_SERVICE_URL=http://localhost:8000
```

## Troubleshooting

- **"Failed to reach ML service"** – Start the ML service: `npm run ml:start`
- **Empty graph** – Add experts with `past_employers` and `skills` via Prisma Studio or `createExpert`
- **401 Unauthorized** – Sign in with Clerk first
