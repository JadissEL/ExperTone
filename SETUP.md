# Expert Intelligence Platform - Database Setup

This guide covers setting up the Neon PostgreSQL database with Prisma and pgvector.

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) account
- npm, pnpm, or yarn

## 1. Install Dependencies

```bash
npm install
```

Or manually:

```bash
npm install prisma @prisma/client
```

## 2. Configure Environment

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```
   (On Windows: `copy .env.example .env`)

2. Get your Neon connection strings from the [Neon Console](https://console.neon.tech):
   - **DATABASE_URL**: Use the **pooled** connection string (for app runtime)
   - **DIRECT_URL**: Use the **direct** connection string (for migrations)

3. Update `.env` with your values.

## 3. Apply Migrations (Recommended: Setup Script)

The project includes two migrations that run in order:

1. **enable_vector** – `CREATE EXTENSION IF NOT EXISTS vector;`
2. **init** – Creates all tables (users, experts, expert_vectors, etc.)

### Option A: Setup script (recommended)

```bash
npm run db:setup
```

Or:

```bash
node scripts/setup-db.js
```

This applies both migrations and generates the Prisma Client.

### Option B: Manual commands

```bash
npx prisma migrate deploy
npx prisma generate
```

### Option C: Development (creates new migrations)

For local development when you change the schema:

```bash
npx prisma migrate dev --name your_migration_name
```

## 4. Verify Schema

```bash
npx prisma studio
```

Opens a visual browser to inspect your tables.

## Schema Summary

| Model | Key Fields |
|-------|------------|
| **User** | `id`, `email`, `role` (CSA/ADMIN), `teamId` |
| **Expert** | `name`, `industry`, `ownerId`, `visibilityStatus` (PRIVATE/GLOBAL_POOL) |
| **ExpertVector** | `expertId`, `embedding` (vector(1536)) |
| **ExpertContact** | `expertId`, `type` (EMAIL/PHONE), `value` |
| **ResearchProject** | `creatorId`, `status` (PENDING/RUNNING/COMPLETED) |
| **ResearchResult** | `projectId`, `expertId`, `matchScore`, `classificationTier` |
| **Ticket** | `requesterId`, `expertId`, `ownerId`, `status` |

## Referential Actions

- Deleting an **Expert** cascades to `ExpertVector`, `ExpertContact`, `ResearchResult`, and `Ticket`
- Deleting a **User** cascades to owned Experts, ResearchProjects, and Tickets
- Deleting a **ResearchProject** cascades to `ResearchResult`

## Indexes

- `experts`: `industry`, `ownerId`, `visibilityStatus`

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run db:setup` | Apply migrations + generate Prisma Client |
| `npm run db:migrate` | Run `prisma migrate dev` (development) |
| `npm run db:deploy` | Run `prisma migrate deploy` (production) |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:studio` | Open Prisma Studio |
