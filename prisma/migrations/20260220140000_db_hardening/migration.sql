-- DB Hardening: vector index + duplicate prevention
-- HNSW index for pgvector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS "expert_vectors_embedding_hnsw_idx"
  ON "expert_vectors" USING hnsw (embedding vector_cosine_ops);

-- Partial unique indexes: prevent duplicate experts by email_hash / linkedin_url
CREATE UNIQUE INDEX IF NOT EXISTS "experts_email_hash_unique"
  ON "experts" ("email_hash") WHERE "email_hash" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "experts_linkedin_url_unique"
  ON "experts" ("linkedin_url") WHERE "linkedin_url" IS NOT NULL;
