-- n8n Expert Hunter workflow schema alignment
-- Adds tables and columns expected by n8n Postgres nodes (workflow is immutable)

-- 1. search_cache: add n8n columns (query_hash, query_text, cached_at, ttl_hours)
ALTER TABLE "search_cache" ADD COLUMN IF NOT EXISTS "query_hash" TEXT;
ALTER TABLE "search_cache" ADD COLUMN IF NOT EXISTS "query_text" TEXT;
ALTER TABLE "search_cache" ADD COLUMN IF NOT EXISTS "cached_at" TIMESTAMP(3);
ALTER TABLE "search_cache" ADD COLUMN IF NOT EXISTS "ttl_hours" INTEGER DEFAULT 24;

-- Backfill: map existing columns to n8n format
UPDATE "search_cache" SET
  "query_hash" = COALESCE("query_hash", "query_key"),
  "query_text" = COALESCE("query_text", "query"),
  "cached_at" = COALESCE("cached_at", "created_at"),
  "ttl_hours" = COALESCE("ttl_hours", 24)
WHERE "query_hash" IS NULL OR "cached_at" IS NULL;

CREATE INDEX IF NOT EXISTS "search_cache_query_hash_idx" ON "search_cache"("query_hash");
CREATE INDEX IF NOT EXISTS "search_cache_cached_at_idx" ON "search_cache"("cached_at");

-- 2. activity_log: n8n Log Activity node
CREATE TABLE IF NOT EXISTS "activity_log" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "event_type" TEXT,
    "project_id" TEXT,
    "expert_name" TEXT,
    "status" TEXT,
    "timestamp" TIMESTAMP(3),
    "execution_id" TEXT,
    "workflow_id" TEXT,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activity_log_project_id_idx" ON "activity_log"("project_id");
CREATE INDEX IF NOT EXISTS "activity_log_timestamp_idx" ON "activity_log"("timestamp");

-- 3. error_log: n8n Store Error Log node (singular table name)
CREATE TABLE IF NOT EXISTS "error_log" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "error_type" TEXT,
    "error_message" TEXT,
    "project_id" TEXT,
    "expert_name" TEXT,
    "timestamp" TIMESTAMP(3),
    "execution_id" TEXT,

    CONSTRAINT "error_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "error_log_project_id_idx" ON "error_log"("project_id");
CREATE INDEX IF NOT EXISTS "error_log_timestamp_idx" ON "error_log"("timestamp");

-- 4. metrics: n8n Track Metrics node (separate from metrics_tracking)
CREATE TABLE IF NOT EXISTS "metrics" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "metric_type" TEXT,
    "project_id" TEXT,
    "expert_name" TEXT,
    "identity_confidence" DOUBLE PRECISION,
    "sources_found" INTEGER,
    "linkedin_found" INTEGER,
    "timestamp" TIMESTAMP(3),
    "execution_id" TEXT,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "metrics_project_id_idx" ON "metrics"("project_id");
CREATE INDEX IF NOT EXISTS "metrics_timestamp_idx" ON "metrics"("timestamp");

-- 5. performance_metrics: add n8n columns
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "project_id" TEXT;
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "expert_name" TEXT;
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "processing_duration_ms" INTEGER;
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "sources_scraped" INTEGER;
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "identity_confidence" DOUBLE PRECISION;
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "linkedin_found" INTEGER;
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "cache_hit" INTEGER;
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3);
ALTER TABLE "performance_metrics" ADD COLUMN IF NOT EXISTS "execution_id" TEXT;

CREATE INDEX IF NOT EXISTS "performance_metrics_project_id_idx" ON "performance_metrics"("project_id");
