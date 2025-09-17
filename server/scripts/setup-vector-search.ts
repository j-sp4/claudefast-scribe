import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

// Use direct connection for DDL operations
const client = postgres(process.env.DIRECT_DATABASE_URL!);
const db = drizzle(client);

async function setupVectorSearch() {
  console.log(chalk.bgBlue.white.bold(' 🚀 Setting up Vector Search '));
  
  try {
    // 1. Enable pgvector extension
    console.log(chalk.cyan('1. Enabling pgvector extension...'));
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log(chalk.green('   ✅ pgvector extension enabled'));

    // 2. Add vector column to documents table
    console.log(chalk.cyan('2. Adding vector columns to documents...'));
    
    // Check if embedding column exists and is vector type
    const embeddingCheck = await db.execute<{
      column_name: string;
      data_type: string;
      udt_name: string;
    }>(sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'embedding'
    `);
    
    if (!embeddingCheck || embeddingCheck.length === 0) {
      // Column doesn't exist, add it
      await db.execute(sql`
        ALTER TABLE documents 
        ADD COLUMN embedding vector(1536)
      `);
      console.log(chalk.green('   ✅ Added embedding column'));
    } else {
      const col = embeddingCheck[0] as any;
      // Check if it's already a vector type (udt_name should be 'vector')
      if (col.udt_name === 'vector') {
        console.log(chalk.gray('   ℹ️  Embedding column already exists with vector type'));
      } else if (col.data_type === 'jsonb' || col.udt_name === 'jsonb') {
        // Column exists but is wrong type (jsonb), need to recreate it
        console.log(chalk.yellow('   ⚠️  Embedding column exists as jsonb, converting to vector...'));
        await db.execute(sql`ALTER TABLE documents DROP COLUMN embedding`);
        await db.execute(sql`ALTER TABLE documents ADD COLUMN embedding vector(1536)`);
        console.log(chalk.green('   ✅ Converted embedding column to vector type'));
      } else {
        console.log(chalk.gray(`   ℹ️  Embedding column has type: ${col.data_type}/${col.udt_name}`));
      }
    }

    // 3. Add search_vector column for FTS
    console.log(chalk.cyan('3. Adding full-text search column...'));
    const searchVectorCheck = await db.execute<{
      column_name: string;
      data_type: string;
      udt_name: string;
    }>(sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'search_vector'
    `);
    
    if (!searchVectorCheck || searchVectorCheck.length === 0) {
      await db.execute(sql`
        ALTER TABLE documents
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english', 
            coalesce(title, '') || ' ' || 
            coalesce(content_md, '') || ' ' || 
            coalesce(summary, '')
          )
        ) STORED
      `);
      console.log(chalk.green('   ✅ Added search_vector column'));
    } else {
      const col = searchVectorCheck[0];
      if (col.udt_name !== 'tsvector') {
        console.log(chalk.yellow('   ⚠️  search_vector exists as text, converting to tsvector...'));
        await db.execute(sql`ALTER TABLE documents DROP COLUMN search_vector`);
        await db.execute(sql`
          ALTER TABLE documents
          ADD COLUMN search_vector tsvector
          GENERATED ALWAYS AS (
            to_tsvector('english', 
              coalesce(title, '') || ' ' || 
              coalesce(content_md, '') || ' ' || 
              coalesce(summary, '')
            )
          ) STORED
        `);
        console.log(chalk.green('   ✅ Converted search_vector to tsvector type'));
      } else {
        console.log(chalk.gray('   ℹ️  search_vector column already exists with correct type'));
      }
    }

    // 4. Create indexes
    console.log(chalk.cyan('4. Creating indexes...'));
    
    // Vector similarity index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS documents_embedding_idx 
      ON documents USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log(chalk.green('   ✅ Created embedding index'));
    
    // Full-text search index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS documents_search_idx 
      ON documents USING GIN (search_vector)
    `);
    console.log(chalk.green('   ✅ Created search index'));

    // 5. Update document_chunks table for vector
    console.log(chalk.cyan('5. Updating document_chunks table...'));
    
    const chunksEmbeddingCheck = await db.execute<{
      column_name: string;
      data_type: string;
      udt_name: string;
    }>(sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'document_chunks' 
      AND column_name = 'embedding'
    `);
    
    if (!chunksEmbeddingCheck || chunksEmbeddingCheck.length === 0) {
      await db.execute(sql`ALTER TABLE document_chunks ADD COLUMN embedding vector(1536)`);
      console.log(chalk.green('   ✅ Added chunks embedding column'));
    } else {
      const col = chunksEmbeddingCheck[0] as any;
      if (col.udt_name === 'vector') {
        console.log(chalk.gray('   ℹ️  Chunks embedding column already exists with vector type'));
      } else if (col.data_type === 'jsonb' || col.udt_name === 'jsonb') {
        console.log(chalk.yellow('   ⚠️  Converting chunks embedding column to vector...'));
        await db.execute(sql`ALTER TABLE document_chunks DROP COLUMN embedding`);
        await db.execute(sql`ALTER TABLE document_chunks ADD COLUMN embedding vector(1536)`);
        console.log(chalk.green('   ✅ Converted chunks embedding to vector type'));
      } else {
        console.log(chalk.gray(`   ℹ️  Chunks embedding column has type: ${col.data_type}/${col.udt_name}`));
      }
    }
    
    // Create chunks embedding index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS chunks_embedding_idx 
      ON document_chunks USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log(chalk.green('   ✅ Created chunks embedding index'));

    // 6. Create search functions
    console.log(chalk.cyan('6. Creating search functions...'));
    
    // Semantic search function
    await db.execute(sql`
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
      $$
    `);
    console.log(chalk.green('   ✅ Created semantic search function'));
    
    // Hybrid search function
    await db.execute(sql`
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
      $$
    `);
    console.log(chalk.green('   ✅ Created hybrid search function'));

    console.log(chalk.bgGreen.black.bold('\n 🎉 Vector search setup complete! '));
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('❌ Setup failed:'), error);
    await client.end();
    process.exit(1);
  }
}

setupVectorSearch();