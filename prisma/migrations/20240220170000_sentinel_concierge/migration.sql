-- AlterTable Expert: compliance, trust, no-spam
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "current_employer" TEXT;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "compliance_score" INTEGER;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "mnpi_risk_level" TEXT;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "verified_badge_provider" TEXT;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "citation_count" INTEGER;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "patent_count" INTEGER;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "professional_authority_index" DOUBLE PRECISION;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "contact_cloaked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable ResearchProject: client blacklist / restricted industries
ALTER TABLE "research_projects" ADD COLUMN IF NOT EXISTS "client_blacklist" JSONB;
ALTER TABLE "research_projects" ADD COLUMN IF NOT EXISTS "restricted_industries" JSONB;

-- CreateTable ContactAttempt (no-spam)
CREATE TABLE IF NOT EXISTS "contact_attempts" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_attempts_expert_id_idx" ON "contact_attempts"("expert_id");
CREATE INDEX IF NOT EXISTS "contact_attempts_created_at_idx" ON "contact_attempts"("created_at");

ALTER TABLE "contact_attempts" DROP CONSTRAINT IF EXISTS "contact_attempts_expert_id_fkey";
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
