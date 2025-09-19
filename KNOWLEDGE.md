# Scribe MCP Knowledge Base

Accumulated knowledge about the Scribe MCP server codebase for efficient development and troubleshooting.

## 🏗️ Project Overview

**Q: What is Scribe MCP?**
A: Crowd-sourced documentation system providing MCP (Model Context Protocol) tools for AI assistants (Claude Code, Cursor) to read, search, and improve documentation directly from coding environments.

**Q: What's the tech stack?**
A: • Next.js 15.5.0 (App Router, Turbopack)
   • TypeScript (strict mode)
   • mcp-handler v1.0.1 (MCP protocol)
   • @anthropic-ai/sdk (AI search)
   • Zod (runtime validation)
   • Chalk (console colors)

**Q: Where are key files located?**
A: • MCP handler: `/server/app/api/mcp/route.tsx`
   • Knowledge base: `/KNOWLEDGE.md` (project root)
   • Guidance doc: `/CLAUDE.md`
   • Dev logs: `/server/dev.log` (gitignored)
   • Server endpoint: `http://localhost:3000/api/mcp`

## 🛠️ MCP Tools

**Q: What tools are implemented?**
A: Two tools via mcp-handler with basePath '/api':
   • `ask_questions`: Searches knowledge base using Claude AI
   • `create_qa`: Adds new Q&A pairs with duplicate detection

**Q: How does ask_questions work?**
A: • Accepts array of questions
   • Reads KNOWLEDGE.md
   • Uses Claude Opus AI for intelligent search
   • Processes in parallel with Promise.all
   • Returns formatted responses or "NOT_FOUND"

**Q: How does create_qa handle duplicates?**
A: Multi-step duplicate detection:
   1. Creates normalized map (lowercase, no punctuation) for O(1) lookups
   2. Checks exact matches → skips if answer exists, merges if different
   3. Uses AI (claude-3-5-sonnet-20241022) for semantic similarity
   4. Intelligently merges similar answers
   5. Falls back to simple concatenation if AI fails

## ⚙️ Configuration

**Q: Required environment variables?**
A: `ANTHROPIC_API_KEY` - Required for AI search functionality

**Q: How to configure for Claude Code?**
A: Add to `~/.config/claude-code/mcp.json` or use existing `.cursor/mcp.json` pointing to `http://localhost:3000/api/mcp`

**Q: What AI models are used?**
A: • Search: Claude Opus (claude-3-opus-20240229) - Note: May be deprecated
   • Duplicate detection: claude-3-5-sonnet-20241022
   • Always include header: `'anthropic-version': '2023-06-01'`

**Q: Anthropic SDK initialization?**
A: ```javascript
new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  defaultHeaders: { 'anthropic-version': '2023-06-01' }
})
```

## 📦 Development

**Q: Essential npm commands?**
A: Run from `/server` directory:
   • `npm run dev` - Start dev server (http://localhost:3000)
   • `npm run build` - Production build
   • `npm run start` - Start production server
   • `npm run lint` - Run ESLint

**Q: How is logging configured?**
A: Dev script uses tee for dual output:
   `next dev --turbopack 2>&1 | tee dev.log`
   Captures stdout/stderr to `/server/dev.log` while displaying in terminal

## 🔧 Troubleshooting

**Q: Terminal colors not showing in logs?**
A: Chalk disables colors when piped. Fix:
   • Code: `chalk.level = 3` (after import)
   • NPM script: `FORCE_COLOR=3 next dev 2>&1 | tee dev.log`
   • Level 3 = truecolor with full RGB

**Q: How to test MCP endpoints?**
A: Use curl with:
   ```bash
   curl -X POST http://localhost:3000/api/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","method":"tools/call","params":{},"id":1}'
   ```
   Response format: Server-Sent Events (SSE) or JSON

**Q: MCP request/response format?**
A: • Requests: JSON-RPC 2.0 format
   • Responses: JSON or SSE
   • Clients must accept both `application/json` and `text/event-stream`

## 🐛 Known Issues & Fixes

**Q: Why did duplicate detection fail initially?**
A: • Used unavailable model (claude-opus-4-1-20250805)
   • Complex JSON parsing prone to failure
   • Regex didn't escape special characters properly

**Q: How was it fixed?**
A: • Pre-index questions in normalized map (O(1) lookups)
   • Simple string normalization for exact matches
   • Switched to claude-3-5-sonnet-20241022
   • Added AI failure fallbacks
   • Improved regex: `/\*\*Q: ([^*]+)\*\*\nA: ([^]*?)(?=\n\n\*\*Q:|---|\n\n##|$)/gm`

**Q: Anthropic API 404 errors?**
A: Model deprecated. Update to current model and ensure version header:
   • Old: claude-3-opus-20240229 (deprecated)
   • Current: claude-3-5-sonnet-20241022
   • Required header: `'anthropic-version': '2023-06-01'`

## 🎨 Console Formatting

**Q: How to format MCP server logs?**
A: Best practices with chalk:
   • Section headers: `'='.repeat(60)`
   • Emojis: 📋 (lists), ✅ (success), ⏭️ (skip), 🔀 (merge)
   • Colors: cyan (questions), green (success), yellow (warnings), gray (details)
   • Helper function: `logSection()` for formatted headers

**Q: Handling NOT_FOUND responses?**
A: Use `answer.trim().startsWith('NOT_FOUND')` not exact equality
   Allows AI to provide context about why no answer was found

## 📚 Implementation Details

**Q: How is knowledge base indexed?**
A: In-memory indexing during appendToKnowledgeBase():
   • Reads current KNOWLEDGE.md content
   • Parses with regex: `/\*\*Q: ([^*]+)\*\*\nA: ([^]*?)(?=\n\n\*\*Q:|---|\n\n##|$)/gm`
   • Creates Map with normalized keys (lowercase, stripped punctuation)
   • Map values: `{original: string, answer: string, position: number}`
   • Enables O(1) exact duplicate detection
   • Also performs AI-based semantic similarity checks when API key present
   • Merges similar answers intelligently using Claude AI
**Q: Where should debugging start?**
A: Check `/server/dev.log` first for:
   • MCP server errors
   • API route errors at `/api/mcp`
   • Next.js build/runtime errors
   • Request/response logs for tool invocations

**Q: How do I use NIA MCP to index external documentation from a URL?**
A: Use the `mcp__nia__index_documentation` tool with the URL parameter. The tool will:
1. Accept a URL (e.g., 'https://example.com/docs.md')
2. Return a source_id for tracking
3. Process the documentation in the background
4. Use `check_documentation_status` with the source_id to monitor progress
5. Once complete, the documentation becomes searchable via `search_documentation`

Example: `mcp__nia__index_documentation({url: 'https://eb83bf694590.ngrok-free.app/KNOWLEDGE.md', only_main_content: true})` returns a source_id that can be monitored.


**Q: What NIA MCP tools are available for working with documentation?**
A: Key NIA MCP tools for documentation:
• `mcp__nia__index_documentation` - Index docs from URLs with crawling options
• `mcp__nia__search_documentation` - Search indexed docs using natural language
• `mcp__nia__list_documentation` - List all indexed documentation sources
• `mcp__nia__check_documentation_status` - Monitor indexing progress using source_id
• `mcp__nia__delete_documentation` - Remove indexed documentation
• `mcp__nia__rename_documentation` - Rename documentation sources

The workflow is: index → monitor status → search when complete.


**Q: What search libraries are preferred for implementing full-text search in Next.js applications?**
A: For Next.js full-text search, consider these options:

**PostgreSQL Built-in Search:**
- Use PostgreSQL's built-in full-text search with `to_tsvector()` and `to_tsquery()`
- Supports ranking with `ts_rank()` functions
- Works well with Drizzle ORM using `sql` templates
- Example: `sql`to_tsvector('english', ${documents.content}) @@ to_tsquery('english', ${searchQuery})`

**Meilisearch:**
- Fast, typo-tolerant search engine
- Great for medium-scale applications
- Excellent developer experience with instant search
- Built-in ranking and filtering

**Elasticsearch/OpenSearch:**
- Enterprise-grade for large-scale applications
- Complex setup but powerful features
- Advanced analytics and aggregations

**Recommendation:** Start with PostgreSQL full-text search for MVP, then evaluate Meilisearch for better UX.


**Q: How should search indexing be handled - real-time or batch processed?**
A: **Real-time Indexing (Recommended for Scribe MCP):**
- Update search indexes immediately when documents change
- Use database triggers or application-level hooks
- Better user experience with instant search results
- Essential for collaborative documentation systems

**Implementation approaches:**
1. **Database triggers**: PostgreSQL triggers to update tsvector columns
2. **Application hooks**: Update indexes in the same transaction as document updates
3. **Background jobs**: Use a job queue (Bull/BullMQ) for heavy indexing tasks

**Batch Processing:**
- Suitable for large document imports or initial indexing
- Can be resource-intensive for real-time updates
- Use for rebuilding indexes during maintenance

**Hybrid approach:** Real-time for individual document updates, batch for bulk operations and maintenance.


**Q: What is the best way to integrate pgvector for semantic search with Drizzle ORM?**
A: **pgvector Integration with Drizzle ORM:**

**1. Schema Definition:**
```typescript
import { pgTable, text, vector, integer } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  content: text('content'),
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI embedding size
  searchVector: sql`to_tsvector('english', content)` // Combined with full-text
});
```

**2. Enable pgvector Extension:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**3. Vector Operations:**
```typescript
// Similarity search
const results = await db
  .select()
  .from(documents)
  .orderBy(sql`embedding <-> ${queryEmbedding}`)
  .limit(10);

// Combined with full-text search
const hybridResults = await db
  .select({
    ...documents,
    similarity: sql<number>`1 - (embedding <-> ${queryEmbedding})`,
    textRank: sql<number>`ts_rank(search_vector, to_tsquery('english', ${query}))`
  })
  .from(documents)
  .where(sql`search_vector @@ to_tsquery('english', ${query})`)
  .orderBy(sql`(1 - (embedding <-> ${queryEmbedding})) * 0.7 + ts_rank(search_vector, to_tsquery('english', ${query})) * 0.3 DESC`)
  .limit(10);
```

**4. Index Creation:**
```sql
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_documents_search_vector ON documents USING gin(search_vector);
```


**Q: How should search results be ranked when combining full-text and semantic search?**
A: **Hybrid Ranking Strategy:**

**1. Weighted Combination:**
```typescript
const hybridScore = (semanticScore * 0.7) + (textScore * 0.3);
```

**2. Score Normalization:**
- **Semantic similarity**: Already normalized (0-1) from cosine distance
- **Text rank**: Normalize using `ts_rank_cd()` with length normalization
- **Combined score**: Use weighted average

**3. Advanced Ranking Formula:**
```sql
SELECT *,
  (
    (1 - (embedding <-> query_embedding)) * 0.7 +
    (ts_rank_cd(search_vector, query, 1) / (length(content) + 1)) * 0.3
  ) as hybrid_score
FROM documents
WHERE search_vector @@ to_tsquery('english', query)
ORDER BY hybrid_score DESC;
```

**4. Context-Aware Weighting:**
- **Exact matches**: Boost text search weight to 0.8
- **Conceptual queries**: Boost semantic search weight to 0.8
- **User behavior**: Adjust weights based on click-through rates

**5. Additional Ranking Factors:**
- Document freshness (`created_at`, `updated_at`)
- Document popularity (`view_count`, `helpful_count`)
- Document authority (author reputation, approval status)
- User context (project access, role permissions)

**Implementation:**
```typescript
const calculateHybridScore = (
  semanticScore: number,
  textScore: number,
  freshnessFactor: number,
  popularityFactor: number,
  queryType: 'exact' | 'conceptual' | 'mixed'
) => {
  const weights = {
    exact: { semantic: 0.3, text: 0.7 },
    conceptual: { semantic: 0.8, text: 0.2 },
    mixed: { semantic: 0.6, text: 0.4 }
  };
  
  const baseScore = 
    (semanticScore * weights[queryType].semantic) +
    (textScore * weights[queryType].text);
    
  return baseScore * freshnessFactor * popularityFactor;
};
```


**Q: What is the recommended approach for chunking documents for vector embeddings?**
A: **Document Chunking Strategy for Vector Embeddings:**

**1. Chunk Size Guidelines:**
- **Optimal size**: 300-800 tokens (1-3 paragraphs)
- **OpenAI embeddings**: Work best with 512-1024 tokens
- **Anthropic embeddings**: Effective up to 8192 tokens
- **Balance**: Enough context vs. specific relevance

**2. Chunking Methods:**

**Semantic Chunking (Recommended):**
```typescript
const chunkByParagraphs = (text: string, maxTokens: number = 600) => {
  const paragraphs = text.split('\n\n');
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (estimateTokens(currentChunk + paragraph) > maxTokens) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};
```

**3. Overlap Strategy:**
- **Sliding window**: 50-100 token overlap between chunks
- **Sentence boundaries**: Preserve complete sentences
- **Context preservation**: Include relevant headers/metadata

**4. Metadata Enrichment:**
```typescript
interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    headers: string[]; // H1, H2, H3 context
    tags: string[];
    tokenCount: number;
  };
}
```

**5. Special Considerations:**
- **Code blocks**: Keep intact when possible
- **Lists**: Preserve structure and context
- **Tables**: Include headers and maintain relationships
- **Links**: Preserve with context
- **Markdown**: Strip formatting but preserve semantic meaning


**Q: Should search functionality be exposed as a separate API route or integrated into MCP tools?**
A: **Recommended Approach: Dual Implementation**

**1. MCP Tools (Primary Interface):**
```typescript
// For AI assistants (Claude Code, Cursor)
server.tool('search_docs', 'Search documentation using keywords', {
  query: z.string(),
  projectSlug: z.string().optional(),
  searchType: z.enum(['hybrid', 'semantic', 'fulltext']).default('hybrid'),
  limit: z.number().default(10)
}, async ({ query, projectSlug, searchType, limit }) => {
  // Implementation
});
```

**2. REST API (Secondary Interface):**
```typescript
// /api/search/route.ts
// For web UI, mobile apps, external integrations
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  // Same implementation as MCP tool
}
```

**3. Shared Search Logic:**
```typescript
// /lib/search/index.ts
export class SearchService {
  async search(params: SearchParams): Promise<SearchResults> {
    // Centralized search implementation
    // Used by both MCP tools and API routes
  }
  
  async hybridSearch(query: string, options: SearchOptions) {
    const [semanticResults, fulltextResults] = await Promise.all([
      this.semanticSearch(query, options),
      this.fulltextSearch(query, options)
    ]);
    return this.mergeAndRankResults(semanticResults, fulltextResults);
  }
}
```

**4. Benefits of Dual Approach:**
- **MCP tools**: Direct AI assistant integration, context-aware search
- **REST API**: Web UI, mobile apps, third-party integrations
- **Shared logic**: Consistent results, easier maintenance
- **Performance**: Same caching and optimization for both interfaces

**5. Implementation Priority:**
1. Build core search service
2. Implement MCP tools (primary use case)
3. Add REST API endpoints (secondary use case)
4. Ensure both interfaces use the same underlying service


**Q: How should search caching and performance optimization be handled?**
A: **Search Caching and Performance Strategy:**

**1. Multi-Level Caching:**

**Query Result Caching:**
```typescript
// Redis-based query caching
const cacheKey = `search:${hash(query)}:${projectSlug}:${searchType}`;
const cachedResults = await redis.get(cacheKey);
if (cachedResults) {
  return JSON.parse(cachedResults);
}

const results = await performSearch(query, options);
await redis.setex(cacheKey, 300, JSON.stringify(results)); // 5min TTL
```

**Embedding Caching:**
```typescript
// Cache query embeddings
const embeddingKey = `embedding:${hash(query)}`;
let queryEmbedding = await redis.get(embeddingKey);
if (!queryEmbedding) {
  queryEmbedding = await generateEmbedding(query);
  await redis.setex(embeddingKey, 3600, JSON.stringify(queryEmbedding));
}
```

**2. Database Optimization:**

**Index Strategy:**
```sql
-- Vector similarity index
CREATE INDEX idx_documents_embedding ON documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX idx_documents_search_vector ON documents USING gin(search_vector);
CREATE INDEX idx_documents_project_search ON documents USING gin(project_id, search_vector);

-- Composite indexes for filtering
CREATE INDEX idx_documents_project_updated ON documents (project_id, updated_at DESC, is_latest);
```

**3. Search Performance Patterns:**

**Parallel Search Execution:**
```typescript
const executeHybridSearch = async (query: string, options: SearchOptions) => {
  const [semanticResults, fulltextResults, cachedResults] = await Promise.allSettled([
    semanticSearch(query, options),
    fulltextSearch(query, options),
    getCachedResults(query, options)
  ]);
  
  return mergeResults(semanticResults, fulltextResults, cachedResults);
};
```

**4. Pagination and Lazy Loading:**
```typescript
interface SearchOptions {
  limit: number;
  offset: number;
  includeTotalCount?: boolean; // Expensive operation
}

// Use cursor-based pagination for better performance
interface CursorPagination {
  cursor?: string; // base64 encoded sort values
  limit: number;
}
```

**5. Performance Monitoring:**
```typescript
const searchMetrics = {
  queryDuration: 0,
  cacheHitRate: 0,
  resultCount: 0,
  searchType: 'hybrid'
};

// Log slow queries
if (searchMetrics.queryDuration > 1000) {
  console.warn('Slow search query:', { query, duration: searchMetrics.queryDuration });
}
```

**6. Cache Invalidation Strategy:**
- **Document updates**: Clear related search caches
- **Time-based**: TTL for query results (5-15 minutes)
- **Manual**: Admin tools to clear cache when needed
- **Smart invalidation**: Track which queries are affected by document changes


**Q: What is the best practice for storing and updating embeddings when documents change?**
A: **Embedding Storage and Update Strategy:**

**1. Storage Schema:**
```typescript
// Separate table for embeddings (optional optimization)
export const embeddings = pgTable('embeddings', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id),
  chunkIndex: integer('chunk_index'),
  content: text('content'), // The chunked content
  embedding: vector('embedding', { dimensions: 1536 }),
  embeddingModel: text('embedding_model').default('text-embedding-3-small'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Or embedded in documents table
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  content: text('content'),
  contentHash: text('content_hash'), // SHA-256 for change detection
  embedding: vector('embedding', { dimensions: 1536 }),
  embeddingUpdatedAt: timestamp('embedding_updated_at'),
  // ... other fields
});
```

**2. Change Detection:**
```typescript
const updateDocumentWithEmbedding = async (documentId: string, newContent: string) => {
  const contentHash = createHash('sha256').update(newContent).digest('hex');
  
  const existingDoc = await db
    .select({ contentHash: documents.contentHash })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  
  if (existingDoc[0]?.contentHash === contentHash) {
    console.log('Content unchanged, skipping embedding update');
    return;
  }
  
  // Content changed, update embedding
  const chunks = chunkDocument(newContent);
  const embeddings = await generateEmbeddings(chunks);
  
  await db.transaction(async (tx) => {
    // Delete old embeddings
    await tx.delete(embeddings).where(eq(embeddings.documentId, documentId));
    
    // Insert new embeddings
    await tx.insert(embeddings).values(
      chunks.map((chunk, index) => ({
        id: `${documentId}-${index}`,
        documentId,
        chunkIndex: index,
        content: chunk,
        embedding: embeddings[index]
      }))
    );
    
    // Update document metadata
    await tx.update(documents)
      .set({ 
        contentHash,
        embeddingUpdatedAt: new Date() 
      })
      .where(eq(documents.id, documentId));
  });
};
```

**3. Background Processing:**
```typescript
// Queue-based embedding updates
import { Queue } from 'bullmq';

const embeddingQueue = new Queue('embedding-updates', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

// Add job when document changes
const scheduleEmbeddingUpdate = async (documentId: string) => {
  await embeddingQueue.add('update-embedding', { documentId }, {
    priority: 1,
    delay: 5000 // Small delay to batch rapid updates
  });
};

// Worker process
const worker = new Worker('embedding-updates', async (job) => {
  const { documentId } = job.data;
  await updateDocumentEmbedding(documentId);
}, { connection: redisConnection });
```

**4. Batch Updates for Efficiency:**
```typescript
const batchUpdateEmbeddings = async (documentIds: string[]) => {
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < documentIds.length; i += BATCH_SIZE) {
    const batch = documentIds.slice(i, i + BATCH_SIZE);
    const documents = await getDocumentsBatch(batch);
    
    const embeddings = await generateEmbeddingsBatch(
      documents.map(doc => doc.content)
    );
    
    await updateEmbeddingsBatch(documents, embeddings);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};
```

**5. Embedding Versioning:**
```typescript
// Track embedding model versions
const migrateEmbeddings = async (fromModel: string, toModel: string) => {
  const documentsToUpdate = await db
    .select()
    .from(embeddings)
    .where(eq(embeddings.embeddingModel, fromModel));
  
  for (const doc of documentsToUpdate) {
    const newEmbedding = await generateEmbedding(doc.content, toModel);
    await db.update(embeddings)
      .set({ 
        embedding: newEmbedding, 
        embeddingModel: toModel,
        updatedAt: new Date()
      })
      .where(eq(embeddings.id, doc.id));
  }
};
```


**Q: Should we use OpenAI embeddings or Anthropic's text embeddings for semantic search?**
A: **Embedding Model Recommendation for Scribe MCP:**

**OpenAI Embeddings (Recommended):**

**text-embedding-3-small (Recommended for MVP):**
- **Dimensions**: 1536 (default)
- **Cost**: $0.02 per 1M tokens
- **Performance**: Excellent for most use cases
- **Speed**: Fast generation and querying
- **API**: Mature, stable, well-documented

**text-embedding-3-large (For production scale):**
- **Dimensions**: 3072 (higher quality)
- **Cost**: $0.13 per 1M tokens
- **Performance**: Best-in-class for complex queries
- **Use case**: Large-scale deployments with complex documentation

**Anthropic Text Embeddings:**
- **Status**: Currently in beta (as of 2024)
- **Integration**: More complex, less mature tooling
- **Cost**: Pricing not yet optimized for embedding workloads
- **Documentation**: Limited compared to OpenAI

**Implementation with OpenAI:**
```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generateEmbedding = async (text: string): Promise<number[]> => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float'
  });
  
  return response.data[0].embedding;
};

const generateEmbeddingsBatch = async (texts: string[]): Promise<number[][]> => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.slice(0, 2048), // API limit
    encoding_format: 'float'
  });
  
  return response.data.map(item => item.embedding);
};
```

**Migration Strategy:**
```typescript
// Design for future migration flexibility
interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
  getModelName(): string;
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  // Implementation
}

class AnthropicEmbeddingProvider implements EmbeddingProvider {
  // Future implementation when ready
}
```

**Recommendation:**
1. **Start with OpenAI text-embedding-3-small** for MVP
2. **Monitor Anthropic's embedding progress** for future migration
3. **Design provider abstraction** for easy switching
4. **Evaluate upgrade to text-embedding-3-large** based on search quality needs


**Q: How should search filters (by project, topic, date) be implemented efficiently?**
A: **Efficient Search Filtering Strategy:**

**1. Database Schema for Filtering:**
```typescript
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').references(() => topics.id),
  projectId: text('project_id').references(() => projects.id),
  content: text('content'),
  embedding: vector('embedding', { dimensions: 1536 }),
  searchVector: sql`to_tsvector('english', content)`,
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isLatest: boolean('is_latest').default(true),
  tags: text('tags').array(), // For topic/category filtering
  authorId: text('author_id'),
  status: text('status').default('published') // draft, published, archived
});

// Optimized indexes for filtering
CREATE INDEX idx_documents_project_topic ON documents (project_id, topic_id, is_latest);
CREATE INDEX idx_documents_project_date ON documents (project_id, updated_at DESC, is_latest);
CREATE INDEX idx_documents_tags ON documents USING gin(tags);
CREATE INDEX idx_documents_status_date ON documents (status, updated_at DESC);
```

**2. Filter Implementation:**
```typescript
interface SearchFilters {
  projectSlugs?: string[];
  topicIds?: string[];
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  authorIds?: string[];
  status?: 'draft' | 'published' | 'archived';
}

const buildFilterConditions = (filters: SearchFilters) => {
  const conditions = [eq(documents.isLatest, true)];
  
  if (filters.projectSlugs?.length) {
    // Join with projects table to filter by slug
    conditions.push(
      sql`${documents.projectId} IN (
        SELECT id FROM projects WHERE slug = ANY(${filters.projectSlugs})
      )`
    );
  }
  
  if (filters.topicIds?.length) {
    conditions.push(sql`${documents.topicId} = ANY(${filters.topicIds})`);
  }
  
  if (filters.tags?.length) {
    conditions.push(sql`${documents.tags} && ${filters.tags}`);
  }
  
  if (filters.dateFrom) {
    conditions.push(gte(documents.updatedAt, filters.dateFrom));
  }
  
  if (filters.dateTo) {
    conditions.push(lte(documents.updatedAt, filters.dateTo));
  }
  
  if (filters.status) {
    conditions.push(eq(documents.status, filters.status));
  }
  
  return conditions;
};
```

**3. Optimized Search with Filters:**
```typescript
const searchWithFilters = async (
  query: string, 
  filters: SearchFilters, 
  options: SearchOptions
) => {
  const filterConditions = buildFilterConditions(filters);
  
  // For semantic search with filters
  const semanticResults = await db
    .select({
      ...documents,
      similarity: sql<number>`1 - (embedding <-> ${queryEmbedding})`
    })
    .from(documents)
    .where(and(...filterConditions))
    .orderBy(sql`embedding <-> ${queryEmbedding}`)
    .limit(options.limit);
  
  // For full-text search with filters
  const fulltextResults = await db
    .select({
      ...documents,
      rank: sql<number>`ts_rank(search_vector, to_tsquery('english', ${query}))`
    })
    .from(documents)
    .where(and(
      ...filterConditions,
      sql`search_vector @@ to_tsquery('english', ${query})`
    ))
    .orderBy(sql`ts_rank(search_vector, to_tsquery('english', ${query})) DESC`)
    .limit(options.limit);
  
  return mergeAndRankResults(semanticResults, fulltextResults);
};
```

**4. Filter Caching Strategy:**
```typescript
const getCacheKey = (query: string, filters: SearchFilters) => {
  const filterHash = createHash('md5')
    .update(JSON.stringify(filters))
    .digest('hex');
  return `search:${hash(query)}:${filterHash}`;
};

const searchWithCachedFilters = async (query: string, filters: SearchFilters) => {
  const cacheKey = getCacheKey(query, filters);
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const results = await searchWithFilters(query, filters, options);
  await redis.setex(cacheKey, 300, JSON.stringify(results));
  
  return results;
};
```

**5. Filter Validation and Sanitization:**
```typescript
const SearchFiltersSchema = z.object({
  projectSlugs: z.array(z.string()).optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  authorIds: z.array(z.string().uuid()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional()
}).refine(data => {
  // Validate date range
  if (data.dateFrom && data.dateTo) {
    return data.dateFrom <= data.dateTo;
  }
  return true;
}, {
  message: 'dateFrom must be before dateTo'
});
```

**6. MCP Tool Integration:**
```typescript
server.tool('search_docs_filtered', 'Search with advanced filters', {
  query: z.string(),
  filters: SearchFiltersSchema.optional(),
  limit: z.number().default(10)
}, async ({ query, filters = {}, limit }) => {
  const results = await searchWithCachedFilters(query, filters);
  return {
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
  };
});
```


---
**Q: How is the /api/check endpoint currently implemented and what is its purpose?**
A: The /api/check endpoint is located at `/server/app/api/check/route.tsx`. It serves as a GET endpoint that validates Q&A entries in the KNOWLEDGE.md file. The endpoint:
1. Accepts an optional `?random` query parameter to validate either all QA entries or just one random entry
2. Calls `checkAndUpdateKnowledgeBase()` from the update-knowledge flow
3. Returns JSON response with status, mode, and timestamp
4. Logs colorful progress updates to console using chalk
5. Purpose: Automatically validates and updates outdated knowledge base entries using Claude API


**Q: Are there any existing loading indicators or progress tracking patterns in the codebase?**
A: After implementation, the codebase now uses animated spinner loading indicators in two places:
1. **During Q&A extraction**: Shows a spinner while calling Anthropic API to parse KNOWLEDGE.md
2. **During validation**: Shows a spinner for each Q&A entry being validated

The spinner uses:
- Braille pattern characters: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
- `setInterval` with 80ms updates
- `process.stdout.write` with `\r` for in-place updates
- Clears with spaces before showing stream output
- Styled with chalk colors (cyan spinner, gray text)


**Q: How are API requests handled in the server flows, particularly for long-running operations?**
A: Long-running operations in the server flows are handled as follows:
1. **Streaming responses**: The `query()` function from @anthropic-ai/claude-code returns an async iterator stream
2. **Sequential processing**: Q&A validations run one at a time in a for loop
3. **Console feedback**: Extensive chalk-colored logging shows progress at each step
4. **Loading indicators**: Spinners show during API calls (extraction and validation)
5. **Error handling**: Try-catch blocks in the route handler return appropriate HTTP status codes
6. **No timeout limits**: The validation runs to completion without enforced timeouts
