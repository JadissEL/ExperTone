# Expert Hunter — n8n Cloud Free Tier (Self-Contained, No Environments)

Use this workflow when **Environments** is locked (Enterprise plan) on n8n Cloud.  
**Fully portable:** All config embedded in workflow. No $env or n8n Variables needed.

## Import

1. In n8n Cloud: **Workflows** → **Add workflow** → **Import from file**
2. Select `n8n-deploy/workflows/expert_hunter_cloud_no_env.json`
3. Save

## Edit 1 node (Config)

Open the **Config** node (first node after Webhook). Edit these values:

| Variable | Action |
|----------|--------|
| `GOOGLE_API_KEY` | Replace `REPLACE_WITH_GOOGLE_API_KEY` with your Google Custom Search API key |
| `GOOGLE_CSE_ID` | Verify `8234580f1acf84e38` or use your Custom Search Engine ID |
| `SHARED_SECRET` | Must match Vercel `SHARED_SECRET` exactly (HMAC verification) |
| `CALLBACK_URL` | Verify `https://exper-tone.vercel.app/api/webhooks/n8n-callback` or your app URL |

## Activate

Turn the workflow **Active** (toggle top right).

## Notes

- **Rank mode** (no expertName): Uses ML service — no Google keys needed
- **Collect mode** (with expertName): Requires valid `GOOGLE_API_KEY` in Config
- See `docs/N8N_SELF_CONTAINED_WORKFLOW.md` for architecture and security
