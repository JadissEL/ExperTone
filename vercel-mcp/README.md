# Vercel MCP Server

MCP server that wraps the Vercel CLI for deployments, logs, and environment variable management. Cursor can trigger real deployments and manage env vars automatically.

## Prerequisites

1. **Install Vercel CLI globally:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Link your project** (from project root):
   ```bash
   vercel link
   ```

## Tools

| Tool | Description |
|------|-------------|
| `vercel_deploy` | Deploy to production (`vercel --prod`) |
| `vercel_deploy_preview` | Deploy a preview build |
| `vercel_logs` | Fetch deployment/runtime logs |
| `vercel_env_list` | List environment variables |
| `vercel_env_add` | Add environment variable |
| `vercel_inspect` | Inspect deployment status |

## Setup in Cursor

The server is already configured in `~/.cursor/mcp.json`. Restart Cursor to load it.

## Build

```bash
cd vercel-mcp
npm install
npm run build
```

## Usage

Once connected, Cursor can:

- Trigger production deployments
- Deploy preview branches
- Fetch build logs
- Update environment variables
- Inspect failed builds and suggest fixes
