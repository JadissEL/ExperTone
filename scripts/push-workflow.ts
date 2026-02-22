/**
 * Push Expert Hunter workflow to n8n via REST API.
 * Run: npx tsx scripts/push-workflow.ts
 *
 * Prerequisites:
 * - n8n running at N8N_BASE_URL (default http://localhost:5678)
 * - N8N_API_KEY set in .env (create at n8n Settings > API)
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

const WORKFLOW_NAME = 'Expert Hunter';
const WORKFLOW_SOURCE = path.join(__dirname, '../workflows/expert_hunter_cloud_no_env.json');

async function main() {
  if (!N8N_API_KEY || !N8N_API_KEY.trim()) {
    console.error('ERROR: N8N_API_KEY is not set in .env');
    console.error('Go to n8n Settings > API, create a key, and add it to .env');
    process.exit(1);
  }

  const baseUrl = N8N_BASE_URL.replace(/\/$/, '');
  const apiUrl = `${baseUrl}/api/v1`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-N8N-API-KEY': N8N_API_KEY.trim(),
  };

  // 1. Load workflow JSON
  let workflowPayload: Record<string, unknown>;
  try {
    const raw = fs.readFileSync(WORKFLOW_SOURCE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Strip fields n8n API may reject (e.g. meta, id from export)
    const { meta, id, ...rest } = parsed as Record<string, unknown>;
    workflowPayload = rest;
  } catch (err) {
    console.error('ERROR: Could not read workflow file:', WORKFLOW_SOURCE, err);
    process.exit(1);
  }

  // 2. Check if workflow named "Expert Hunter" exists
  const listRes = await fetch(`${apiUrl}/workflows?name=${encodeURIComponent(WORKFLOW_NAME)}`, {
    headers,
  });

  if (!listRes.ok) {
    console.error('ERROR: n8n API list failed:', listRes.status, await listRes.text());
    if (listRes.status === 401) {
      console.error('Check that N8N_API_KEY is correct and the API is enabled in n8n Settings.');
    }
    process.exit(1);
  }

  const listData = (await listRes.json()) as {
    data?: Array<{ id: string; name: string; active?: boolean }>;
    workflows?: Array<{ id: string; name: string; active?: boolean }>;
  };
  const workflows = listData.data || listData.workflows || [];
  const existing = workflows.find((w) => w.name === WORKFLOW_NAME);

  let workflowId: string;

  if (existing) {
    console.log(`Workflow "${WORKFLOW_NAME}" already exists (id: ${existing.id}). Updating...`);
    const { id: _id, ...payloadWithoutId } = workflowPayload as Record<string, unknown>;
    const updateRes = await fetch(`${apiUrl}/workflows/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payloadWithoutId),
    });
    if (!updateRes.ok) {
      console.error('ERROR: Update failed:', updateRes.status, await updateRes.text());
      process.exit(1);
    }
    workflowId = existing.id;
  } else {
    console.log(`Creating workflow "${WORKFLOW_NAME}"...`);
    const createRes = await fetch(`${apiUrl}/workflows`, {
      method: 'POST',
      headers,
      body: JSON.stringify(workflowPayload),
    });
    if (!createRes.ok) {
      console.error('ERROR: Create failed:', createRes.status, await createRes.text());
      process.exit(1);
    }
    const created = (await createRes.json()) as { id: string };
    workflowId = created.id;
  }

  // 3. Activate the workflow
  const activateRes = await fetch(`${apiUrl}/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  if (!activateRes.ok) {
    console.warn('WARNING: Could not activate workflow:', activateRes.status, await activateRes.text());
  } else {
    console.log('Workflow activated successfully.');
  }

  console.log('');
  console.log('✓ Workflow "Expert Hunter" is ready in n8n.');
  console.log(`  Webhook URL: ${baseUrl}/webhook/hunt`);
  console.log('  Modes:');
  console.log('    - Rank: POST { projectId } → ML rank experts');
  console.log('    - Collect: POST { projectId, expertName, company?, title?, location?, industry? } → scrape & enrich');
  console.log(`  Dashboard: ${baseUrl}`);
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
