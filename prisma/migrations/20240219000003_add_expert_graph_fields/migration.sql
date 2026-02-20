-- AlterTable
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "past_employers" JSONB;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "skills" JSONB;
