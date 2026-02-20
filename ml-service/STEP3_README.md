# Step 3 - ML Microservice

## Run locally

```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

> **Windows:** Use `python -m uvicorn` if `uvicorn` is not found (Scripts folder may not be on PATH).

Service runs at http://localhost:8000

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/rank` | Rank experts for a project |
| POST | `/predict-rate` | Predict 60-min rate from CV/LinkedIn text |
| GET | `/health` | Health check |

## Trigger from Next.js

### 1. Rank experts for a project

```typescript
// In a Server Action or API route
const res = await fetch('http://localhost:8000/rank', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project_id: 'your-project-id' }),
});
const { ranked_experts } = await res.json();
```

### 2. Predict rate from CV text

```typescript
const res = await fetch('http://localhost:8000/predict-rate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Senior Director with 12 years in Fintech...',
  }),
});
const { predicted_rate, confidence, reasoning } = await res.json();
```

### 3. Add API route in Next.js (optional)

Create `app/api/ml/rank/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  const { project_id } = await req.json();
  const res = await fetch(`${ML_SERVICE_URL}/rank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id }),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
```

Then call `/api/ml/rank` from your frontend instead of the ML service directly.

## Docker

```bash
docker build -t expertone-ml .
docker run -p 8000:8000 --env-file .env expertone-ml
```
