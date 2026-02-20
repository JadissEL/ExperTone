-- Enable pgvector extension for AI embeddings (OpenAI ada-002 = 1536 dimensions)
-- Must run before schema that creates expert_vectors table
CREATE EXTENSION IF NOT EXISTS vector;
