-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to documents table for embeddings
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add search_vector column for full-text search
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', 
    coalesce(title, '') || ' ' || 
    coalesce(content_md, '') || ' ' || 
    coalesce(summary, '')
  )
) STORED;

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS documents_search_idx 
ON documents USING GIN (search_vector);

-- Add chunk storage table for managing document chunks
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  token_count integer,
  created_at timestamp DEFAULT now() NOT NULL,
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS chunks_document_idx ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to search documents by similarity
CREATE OR REPLACE FUNCTION search_documents_by_similarity(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  content_md text,
  summary text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.content_md,
    d.summary,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM documents d
  WHERE d.embedding IS NOT NULL
    AND d.is_latest = true
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for hybrid search
CREATE OR REPLACE FUNCTION hybrid_search(
  search_query text,
  query_embedding vector(1536) DEFAULT NULL,
  fts_weight float DEFAULT 0.4,
  semantic_weight float DEFAULT 0.6,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  content_md text,
  summary text,
  fts_rank float,
  semantic_similarity float,
  combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH fts_results AS (
    SELECT 
      d.id,
      d.title,
      d.content_md,
      d.summary,
      ts_rank(d.search_vector, plainto_tsquery('english', search_query)) as rank
    FROM documents d
    WHERE d.search_vector @@ plainto_tsquery('english', search_query)
      AND d.is_latest = true
    ORDER BY rank DESC
    LIMIT match_count * 2
  ),
  semantic_results AS (
    SELECT 
      d.id,
      d.title,
      d.content_md,
      d.summary,
      CASE 
        WHEN query_embedding IS NOT NULL THEN 1 - (d.embedding <=> query_embedding)
        ELSE 0
      END as similarity
    FROM documents d
    WHERE d.embedding IS NOT NULL
      AND d.is_latest = true
      AND (query_embedding IS NULL OR 1 - (d.embedding <=> query_embedding) > 0.5)
    ORDER BY 
      CASE WHEN query_embedding IS NOT NULL 
        THEN d.embedding <=> query_embedding 
        ELSE 1 
      END
    LIMIT match_count * 2
  )
  SELECT 
    COALESCE(f.id, s.id) as id,
    COALESCE(f.title, s.title) as title,
    COALESCE(f.content_md, s.content_md) as content_md,
    COALESCE(f.summary, s.summary) as summary,
    COALESCE(f.rank, 0) as fts_rank,
    COALESCE(s.similarity, 0) as semantic_similarity,
    (COALESCE(f.rank, 0) * fts_weight + COALESCE(s.similarity, 0) * semantic_weight) as combined_score
  FROM fts_results f
  FULL OUTER JOIN semantic_results s ON f.id = s.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;