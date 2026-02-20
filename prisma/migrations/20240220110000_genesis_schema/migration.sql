-- System Genesis 10.3: industry_tags, languages (last_contact_update already in DB)
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "industry_tags" JSONB;
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "languages" JSONB;

-- Audit: DISPUTE_RESOLVED
DO $$ BEGIN
    ALTER TYPE "AuditAction" ADD VALUE 'DISPUTE_RESOLVED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
