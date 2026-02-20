/*
  Warnings:

  - Made the column `embedding` on table `expert_vectors` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "expert_vectors_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "experts_country_idx";

-- DropIndex
DROP INDEX "experts_region_idx";

-- DropIndex
DROP INDEX "experts_seniority_score_idx";

-- DropIndex
DROP INDEX "experts_subject_frequency_map_gin_idx";

-- AlterTable
ALTER TABLE "expert_vectors" ALTER COLUMN "embedding" SET NOT NULL;

-- AlterTable
ALTER TABLE "experts" ADD COLUMN     "predicted_rate_range" JSONB,
ADD COLUMN     "reputation_score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "system_config" ALTER COLUMN "updated_at" DROP DEFAULT;
