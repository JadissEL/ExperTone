-- Identity Resolution: expert_candidates and expert_sources for disambiguation
CREATE TABLE "expert_candidates" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT,
    "photo_url" TEXT,
    "headline" TEXT,
    "company" TEXT,
    "location" TEXT,
    "industry" TEXT,
    "education" TEXT,
    "summary" TEXT,
    "match_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retrieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expert_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expert_sources" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT,
    "retrieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_payload" JSONB,

    CONSTRAINT "expert_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expert_candidates_expert_id_source_type_key" ON "expert_candidates"("expert_id", "source_type");
CREATE INDEX "expert_candidates_normalized_name_idx" ON "expert_candidates"("normalized_name");
CREATE INDEX "expert_sources_expert_id_idx" ON "expert_sources"("expert_id");

ALTER TABLE "expert_candidates" ADD CONSTRAINT "expert_candidates_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expert_sources" ADD CONSTRAINT "expert_sources_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
