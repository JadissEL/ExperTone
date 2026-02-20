# n8n Headless Setup – Cursor to n8n

## 1. API Configuration

1. Open n8n at http://localhost:5678
2. Go to **Settings** (gear icon) → **n8n API**
3. Click **Create an API key**
4. Copy the key and add to `.env`:
   ```
   N8N_API_KEY="n8n_api_xxxxxxxxxxxx"
   ```

## 2. Push the Expert Hunter Workflow

```bash
npm run n8n:push
```

This script:
- Checks if "Expert Hunter" exists in n8n
- Creates or updates it from `workflows/expert_hunter_v1.json`
- Activates the workflow

## 3. Webhook URL

Once pushed, the Expert Hunter webhook is available at:

**http://localhost:5678/webhook/hunt**

The app uses this via `app/lib/n8n-bridge.ts`:

```ts
import { triggerExpertHunt, EXPERT_HUNTER_WEBHOOK_URL } from '@/app/lib/n8n-bridge';

// Trigger from research projects
await triggerExpertHunt({
  projectId: '...',
  projectTitle: '...',
  filterCriteria: { industry: 'Fintech', ... },
});
```

## 4. Verify

After `npm run n8n:push`, the "Expert Hunter" workflow should appear in your n8n dashboard at http://localhost:5678 with status **Active**.
