-- Internal Engagement Tracking (10.2)
-- Engagements table + Expert engagement fields

CREATE TABLE "engagements" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "subject_matter" TEXT NOT NULL,
    "actual_cost" DOUBLE PRECISION NOT NULL,
    "client_feedback_score" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,

    CONSTRAINT "engagements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "total_engagements" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "average_actual_rate" DOUBLE PRECISION;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "subject_frequency_map" JSONB;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "reliability_index" DOUBLE PRECISION;

CREATE INDEX "engagements_expert_id_idx" ON "engagements"("expert_id");
CREATE INDEX "engagements_project_id_idx" ON "engagements"("project_id");
CREATE INDEX "engagements_subject_matter_idx" ON "engagements"("subject_matter");

-- GIN index for subject_frequency_map (Proven Experience search)
CREATE INDEX IF NOT EXISTS "experts_subject_frequency_map_gin_idx" ON "experts" USING GIN ("subject_frequency_map" jsonb_path_ops);

ALTER TABLE "engagements" ADD CONSTRAINT "engagements_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
