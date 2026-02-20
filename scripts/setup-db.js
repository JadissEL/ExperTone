#!/usr/bin/env node
/**
 * Database Setup Script - Expert Intelligence Platform
 * Applies Prisma migrations to Neon (pgvector extension + schema)
 *
 * Migration order:
 * 1. enable_vector - CREATE EXTENSION IF NOT EXISTS vector
 * 2. init - Creates all tables (users, experts, expert_vectors, etc.)
 *
 * Prerequisites:
 * 1. Copy .env.example to .env and fill in your Neon DATABASE_URL and DIRECT_URL
 * 2. Run: npm install prisma @prisma/client
 * 3. Run: node scripts/setup-db.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit' });
}

function main() {
  console.log('=== Expert Intelligence Platform - Database Setup ===\n');

  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env file not found.');
    console.error('Copy .env.example to .env and add your Neon connection strings.');
    process.exit(1);
  }

  console.log('Step 1: Applying migrations (pgvector extension + schema)...');
  console.log('  - Migration 1: enable_vector (CREATE EXTENSION vector)');
  console.log('  - Migration 2: init (users, experts, expert_vectors, etc.)');
  run('npx prisma migrate deploy');

  console.log('Step 2: Generating Prisma Client...');
  run('npx prisma generate');

  console.log('\n=== Setup complete! ===');
  console.log('Run `npx prisma studio` to explore your database.');
}

main();
