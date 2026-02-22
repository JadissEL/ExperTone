-- CreateTable
CREATE TABLE "search_cache" (
    "id" TEXT NOT NULL,
    "query_key" TEXT NOT NULL,
    "query" TEXT,
    "results" JSONB NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "robots_cache" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "robots_txt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "robots_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_quota" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics_tracking" (
    "id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "value" JSONB,
    "dimensions" JSONB,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "metadata" JSONB,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "source" TEXT,
    "severity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_cache_query_key_key" ON "search_cache"("query_key");

-- CreateIndex
CREATE INDEX "search_cache_query_key_idx" ON "search_cache"("query_key");

-- CreateIndex
CREATE INDEX "search_cache_expires_at_idx" ON "search_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "robots_cache_domain_key" ON "robots_cache"("domain");

-- CreateIndex
CREATE INDEX "robots_cache_domain_idx" ON "robots_cache"("domain");

-- CreateIndex
CREATE INDEX "robots_cache_expires_at_idx" ON "robots_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_quota_service_period_key" ON "api_quota"("service", "period");

-- CreateIndex
CREATE INDEX "api_quota_service_idx" ON "api_quota"("service");

-- CreateIndex
CREATE INDEX "metrics_tracking_metric_name_idx" ON "metrics_tracking"("metric_name");

-- CreateIndex
CREATE INDEX "metrics_tracking_created_at_idx" ON "metrics_tracking"("created_at");

-- CreateIndex
CREATE INDEX "performance_metrics_operation_idx" ON "performance_metrics"("operation");

-- CreateIndex
CREATE INDEX "performance_metrics_created_at_idx" ON "performance_metrics"("created_at");

-- CreateIndex
CREATE INDEX "error_logs_source_idx" ON "error_logs"("source");

-- CreateIndex
CREATE INDEX "error_logs_created_at_idx" ON "error_logs"("created_at");

-- CreateIndex
CREATE INDEX "error_logs_severity_idx" ON "error_logs"("severity");
