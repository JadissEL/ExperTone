-- AlterTable
ALTER TABLE "experts" ADD COLUMN "expert_footprint" JSONB;
ALTER TABLE "experts" ADD COLUMN "years_by_source" JSONB;
ALTER TABLE "experts" ADD COLUMN "seniority_flag" TEXT;
