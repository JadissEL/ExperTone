#!/usr/bin/env node
/**
 * Vercel MCP Server - Wraps Vercel CLI for deployments, logs, and env management.
 * Requires: npm install -g vercel && vercel login
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { execSync } from 'node:child_process';
import * as z from 'zod';
const VERCEL_CMD = process.platform === 'win32' ? 'vercel.cmd' : 'vercel';
function runVercel(args, cwd) {
    const cmd = [VERCEL_CMD, ...args].join(' ');
    try {
        return execSync(cmd, {
            encoding: 'utf-8',
            cwd: cwd || process.cwd(),
            maxBuffer: 10 * 1024 * 1024,
        });
    }
    catch (err) {
        const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr) : '';
        const stdout = err && typeof err === 'object' && 'stdout' in err ? String(err.stdout) : '';
        throw new Error(stderr || stdout || String(err));
    }
}
const server = new McpServer({
    name: 'vercel-mcp',
    version: '1.0.0',
});
// Deploy to production
server.registerTool('vercel_deploy', {
    description: 'Deploy the project to Vercel production. Run from project root. Requires vercel login.',
    inputSchema: {
        cwd: z.string().optional().describe('Project directory (default: current)'),
        yes: z.boolean().optional().describe('Skip confirmation prompts'),
    },
}, async (args) => {
    const cwd = args.cwd || process.cwd();
    const cmdArgs = ['--prod'];
    if (args.yes)
        cmdArgs.push('--yes');
    const output = runVercel(cmdArgs, cwd);
    return {
        content: [{ type: 'text', text: output || 'Deployment completed.' }],
    };
});
// Deploy preview
server.registerTool('vercel_deploy_preview', {
    description: 'Deploy a preview (non-production) build to Vercel.',
    inputSchema: {
        cwd: z.string().optional().describe('Project directory'),
        yes: z.boolean().optional().describe('Skip confirmation prompts'),
    },
}, async (args) => {
    const cwd = args.cwd || process.cwd();
    const cmdArgs = [];
    if (args.yes !== false)
        cmdArgs.push('--yes');
    const output = runVercel(cmdArgs, cwd);
    return {
        content: [{ type: 'text', text: output || 'Preview deployment completed.' }],
    };
});
// Fetch build logs
server.registerTool('vercel_logs', {
    description: 'Fetch recent Vercel deployment/runtime logs.',
    inputSchema: {
        cwd: z.string().optional().describe('Project directory (must be vercel-linked)'),
        limit: z.number().optional().describe('Max log entries (default 100)'),
        since: z.string().optional().describe('Time filter (e.g. 1h, 30m)'),
        output: z.enum(['short', 'json']).optional().describe('Output format'),
    },
}, async (args) => {
    const cwd = args.cwd || process.cwd();
    const cmdArgs = ['logs'];
    if (args.limit)
        cmdArgs.push('--limit', String(args.limit));
    if (args.since)
        cmdArgs.push('--since', args.since);
    if (args.output === 'json')
        cmdArgs.push('--output', 'json');
    const output = runVercel(cmdArgs, cwd);
    return {
        content: [{ type: 'text', text: output || 'No logs.' }],
    };
});
// List environment variables
server.registerTool('vercel_env_list', {
    description: 'List environment variables for the linked Vercel project.',
    inputSchema: {
        cwd: z.string().optional().describe('Project directory (must be vercel-linked)'),
        environment: z.enum(['production', 'preview', 'development']).optional().describe('Filter by environment'),
    },
}, async (args) => {
    const cwd = args.cwd || process.cwd();
    const cmdArgs = ['env', 'ls'];
    if (args.environment)
        cmdArgs.push(args.environment);
    const output = runVercel(cmdArgs, cwd);
    return {
        content: [{ type: 'text', text: output || 'No env vars.' }],
    };
});
// Add environment variable (sensitive - value provided by user)
server.registerTool('vercel_env_add', {
    description: 'Add an environment variable to the Vercel project. Provide value for non-interactive add.',
    inputSchema: {
        cwd: z.string().optional().describe('Project directory (must be vercel-linked)'),
        name: z.string().describe('Variable name (e.g. DATABASE_URL)'),
        environment: z.enum(['production', 'preview', 'development']).optional().describe('Target environment (omit = all)'),
        value: z.string().optional().describe('Value to set (omit to be prompted by CLI)'),
    },
}, async (args) => {
    const cwd = args.cwd || process.cwd();
    const cmdArgs = ['env', 'add', args.name, '--force'];
    if (args.environment)
        cmdArgs.push(args.environment);
    if (args.value != null && args.value !== '') {
        const { spawnSync } = await import('node:child_process');
        const result = spawnSync(VERCEL_CMD, cmdArgs, {
            input: args.value + '\n',
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd,
        });
        const out = (result.stdout || result.stderr || 'Done.').trim();
        return { content: [{ type: 'text', text: out }] };
    }
    const output = runVercel(cmdArgs, cwd);
    return {
        content: [{ type: 'text', text: output || 'Env var added. Use value param or Vercel Dashboard to set.' }],
    };
});
// Inspect deployment
server.registerTool('vercel_inspect', {
    description: 'Inspect a deployment (build logs, status).',
    inputSchema: {
        cwd: z.string().optional().describe('Project directory (must be vercel-linked)'),
        deployment: z.string().optional().describe('Deployment URL or ID (default: latest)'),
    },
}, async (args) => {
    const cwd = args.cwd || process.cwd();
    const cmdArgs = ['inspect'];
    if (args.deployment)
        cmdArgs.push(args.deployment);
    const output = runVercel(cmdArgs, cwd);
    return {
        content: [{ type: 'text', text: output || 'No deployment info.' }],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Vercel MCP server running on stdio');
}
main().catch((err) => {
    console.error('Vercel MCP error:', err);
    process.exit(1);
});
