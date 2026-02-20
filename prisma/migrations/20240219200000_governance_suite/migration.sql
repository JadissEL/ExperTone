-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'TEAM_LEAD';
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';

-- AlterTable
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "private_expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "expert_contacts" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "expert_contacts" ADD COLUMN IF NOT EXISTS "verified_by" TEXT;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('OWNERSHIP_CHANGE', 'TICKET_OPENED', 'TICKET_RESOLVED', 'DATA_EXPORT', 'PROFILE_EDIT', 'FORCE_EXPIRE', 'BULK_RECLAIM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "target_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX IF NOT EXISTS "audit_logs_target_id_idx" ON "audit_logs"("target_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);
