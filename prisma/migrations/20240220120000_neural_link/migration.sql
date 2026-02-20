-- Neural Link 10.4: Re-acquisition priority flag for Enforcer-moved experts
ALTER TABLE "experts" ADD COLUMN IF NOT EXISTS "reacquisition_priority" BOOLEAN NOT NULL DEFAULT false;

-- Optional: encrypted actual_cost for Engagements (PII extension)
ALTER TABLE "engagements" ADD COLUMN IF NOT EXISTS "actual_cost_encrypted" TEXT;
