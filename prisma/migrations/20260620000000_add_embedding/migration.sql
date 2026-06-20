-- pgvector extension + embedding column on components + HNSW index.
-- Reference: docs/RAG_VISUALIZATION.md §4.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_stale boolean NOT NULL DEFAULT true;

-- HNSW index for cosine-distance search (pgvector 0.5+).
-- m=16, ef_construction=64 are sensible defaults for a catalog of ~100-1000 items.
CREATE INDEX IF NOT EXISTS components_embedding_hnsw
  ON components USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
