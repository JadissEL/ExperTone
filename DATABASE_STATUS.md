# Database Migration & Neon Status

**Last checked:** Via Neon MCP against project `rough-water-18565688` (DocPlot). Ensure Vercel `DATABASE_URL` points to this Neon project.

---

## ✅ Schema & Migrations

| Check | Status |
|-------|--------|
| **pgvector extension** | ✅ Enabled |
| **Prisma migrations** | ✅ All 19 applied |
| **Tables** | ✅ All present: `users`, `experts`, `expert_vectors`, `expert_contacts`, `research_projects`, `research_results`, `engagements`, `tickets`, `agent_task_state`, `audit_logs`, `contact_attempts`, `notifications`, `pending_interventions`, `processed_requests`, `system_config` |
| **expert_vectors** | ✅ Has `embedding vector(1536)` column |
| **Enums** | ✅ UserRole (CSA, ADMIN, TEAM_LEAD, SUPER_ADMIN), etc. |

---

## ⚠️ Findings

### 1. HNSW index removed

Migration `20260220133812_nova` drops `expert_vectors_embedding_hnsw_idx`. Similarity search still works but may be slower on large datasets. To restore:

```sql
CREATE INDEX IF NOT EXISTS "expert_vectors_embedding_hnsw_idx"
  ON "expert_vectors" USING hnsw (embedding vector_cosine_ops);
```

### 2. Empty expert_vectors

- `experts`: 0 rows  
- `expert_vectors`: 0 rows  

**Hunter Search** uses `expert_vectors` for semantic search. With no rows, search returns no results. Embeddings are created when:

- Creating experts via `/api/coordinator/tasks/[id]/create-expert`
- Creating experts via `app/actions/experts.ts` (e.g. from UI)
- n8n callback writing experts (if it triggers embedding creation)

**To populate:** Add experts (UI or API) or run `npm run db:seed` then a script to generate embeddings for existing experts.

### 3. Vercel build

`vercel.json` has been updated to run `prisma migrate deploy` during build so new migrations are applied on deploy.

---

## Quick commands

```bash
# Check migration status
npx prisma migrate status

# Apply migrations (prod)
npx prisma migrate deploy

# Seed test data
npm run db:seed

# Open Prisma Studio
npx prisma studio
```
