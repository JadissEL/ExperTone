-- Bi-Directional Neural Loop: heartbeat, check-exists, interventions, idempotency

ALTER TABLE "research_projects" ADD COLUMN IF NOT EXISTS "progress" INTEGER;
ALTER TABLE "research_projects" ADD COLUMN IF NOT EXISTS "current_action" TEXT;
ALTER TABLE "research_projects" ADD COLUMN IF NOT EXISTS "last_heartbeat_at" TIMESTAMP(3);

ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "email_hash" TEXT;
CREATE INDEX IF NOT EXISTS "experts_linkedin_url_idx" ON "experts"("linkedin_url");
CREATE INDEX IF NOT EXISTS "experts_email_hash_idx" ON "experts"("email_hash");

CREATE TABLE IF NOT EXISTS "processed_requests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processed_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pending_interventions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "expert_payload" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "n8n_resume_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "pending_interventions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "pending_interventions_request_id_key" ON "pending_interventions"("request_id");
CREATE INDEX IF NOT EXISTS "pending_interventions_project_id_idx" ON "pending_interventions"("project_id");
CREATE INDEX IF NOT EXISTS "pending_interventions_status_idx" ON "pending_interventions"("status");
