-- Step 10: Elite Finalization - Performance indexes and materialized views
-- Run with: prisma migrate deploy (or prisma migrate dev)

-- 1) Indexes for high-density filtering (Industry already indexed)
CREATE INDEX IF NOT EXISTS "experts_country_idx" ON "experts"("country");
CREATE INDEX IF NOT EXISTS "experts_region_idx" ON "experts"("region");
CREATE INDEX IF NOT EXISTS "experts_seniority_score_idx" ON "experts"("seniority_score");

-- 2) Vector index for sub-second semantic search (100k+ experts)
-- HNSW is preferred for high recall and build time; use cosine_ops if embeddings are normalized
-- HNSW index for approximate nearest-neighbor search (pgvector)
CREATE INDEX IF NOT EXISTS "expert_vectors_embedding_hnsw_idx"
  ON "expert_vectors" USING hnsw (embedding vector_cosine_ops);

-- 3) Materialized view for Global Pool analytics (Admin Panel loads without heavy table scans)
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_global_pool_analytics" AS
SELECT
  COUNT(*)::int AS total_global_pool,
  COUNT(*) FILTER (WHERE e."country" IS NOT NULL AND e."country" != '')::int AS with_country,
  COUNT(*) FILTER (WHERE e."industry" IS NOT NULL AND e."industry" != '')::int AS with_industry,
  COUNT(DISTINCT e."industry")::int AS industry_count,
  COUNT(DISTINCT e."country")::int AS country_count
FROM "experts" e
WHERE e."visibility_status" = 'GLOBAL_POOL';

CREATE UNIQUE INDEX IF NOT EXISTS "mv_global_pool_analytics_singleton"
  ON "mv_global_pool_analytics" ((1));
