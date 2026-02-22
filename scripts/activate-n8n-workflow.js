#!/usr/bin/env node
/**
 * Check n8n API availability and workflow status.
 * n8n Cloud free trial may not expose the REST API.
 */
require('dotenv').config({ path: '.env' });

const WORKFLOW_ID = '5vjc03qNjqD6KkUm';
const BASE = process.env.N8N_BASE_URL?.replace(/\/$/, '') || 'https://ecosbuilder.app.n8n.cloud';
const API_KEY = process.env.N8N_API_KEY;

async function main() {
  if (!API_KEY) {
    console.error('N8N_API_KEY not set in .env');
    process.exit(1);
  }

  const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

  // Try GET workflows list first
  const listRes = await fetch(`${BASE}/api/v1/workflows`, { headers });
  console.log('GET /api/v1/workflows:', listRes.status);

  if (listRes.ok) {
    const data = await listRes.json();
    const wf = data.data?.find((w) => w.id === WORKFLOW_ID) || data.find((w) => w.id === WORKFLOW_ID);
    if (wf) {
      console.log('Workflow found:', wf.name, '| active:', wf.active);
      if (!wf.active) {
        const patchRes = await fetch(`${BASE}/api/v1/workflows/${WORKFLOW_ID}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ active: true }),
        });
        console.log('PATCH activate:', patchRes.status, patchRes.statusText);
        if (patchRes.ok) console.log('Workflow activated.');
      }
    }
  } else {
    const text = await listRes.text();
    console.log('API not available. n8n Cloud free trial may not expose REST API.');
    console.log('Response:', text.slice(0, 200));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
