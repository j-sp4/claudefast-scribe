# Phase 2: Search & Retrieval Infrastructure

**Duration**: Week 2 (Days 8-14)  
**Goal**: Build robust hybrid search combining keyword and semantic search with intelligent ranking

## Overview

The current prototype only has AI-based Q&A search through the Claude API. Phase 2 will implement proper search infrastructure with PostgreSQL full-text search, pgvector for embeddings, and a hybrid ranking algorithm.

## Key Deliverables

### 1. Full-Text Search Implementation
- [ ] PostgreSQL tsvector setup for all documents
- [ ] BM25-style ranking implementation
- [ ] Search indexes on document content
- [ ] Support for phrase queries and boolean operators
- [ ] Highlighting of matched terms in results

### 2. Semantic Search with Embeddings
- [ ] pgvector extension setup
- [ ] Document chunking strategy (400-800 tokens)
- [ ] Embedding generation pipeline
- [ ] Vector similarity search implementation
- [ ] Embedding cache to reduce API costs

### 3. Document Processing Pipeline
- [ ] Markdown parser for structured content extraction
- [ ] Intelligent chunking by headings and size
- [ ] Anchor ID generation for deep linking
- [ ] Metadata extraction (tags, categories)
- [ ] Background job for re-indexing

### 4. Hybrid Search & Ranking
- [ ] Combine keyword and semantic scores
- [ ] Context-aware ranking factors
- [ ] Relevance scoring algorithm
- [ ] Result deduplication
- [ ] Performance optimization

## Technical Implementation

### Document Chunking Strategy

```typescript
interface DocumentChunk {
  id: string;
  documentId: string;
  topicId: string;
  projectId: string;
  content: string;
  heading: string;
  anchorId: string;
  startOffset: number;
  endOffset: number;
  embedding: number[];
  tsVector: string;
  metadata: {
    level: number; // heading level
    parentHeading?: string;
    tags: string[];
  };
}

// Chunking algorithm
function chunkDocument(markdown: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  
  // Split by headings
  const sections = markdown.split(headingRegex);
  
  for (let i = 0; i < sections.length; i += 3) {
    const level = sections[i].length;
    const heading = sections[i + 1];
    const content = sections[i + 2];
    
    // Further split large sections
    const subChunks = splitByTokenCount(content, {
      minTokens: 400,
      maxTokens: 800,
      overlap: 100
    });
    
    chunks.push(...subChunks.map(chunk => ({
      // ... chunk properties
    })));
  }
  
  return chunks;
}
```

### Search Implementation

```typescript
// Hybrid search query
async function searchDocs(
  projectSlug: string,
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Parallel search
  const [keywordResults, semanticResults] = await Promise.all([
    // Full-text search
    db.$queryRaw`
      SELECT 
        c.*,
        ts_rank(c.ts_vector, plainto_tsquery('english', ${query})) as keyword_score
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      JOIN topics t ON d.topic_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE 
        p.slug = ${projectSlug}
        AND c.ts_vector @@ plainto_tsquery('english', ${query})
      ORDER BY keyword_score DESC
      LIMIT ${options.limit * 2}
    `,
    
    // Semantic search
    db.$queryRaw`
      SELECT 
        c.*,
        1 - (c.embedding <=> ${queryEmbedding}::vector) as semantic_score
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      JOIN topics t ON d.topic_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE p.slug = ${projectSlug}
      ORDER BY c.embedding <=> ${queryEmbedding}::vector
      LIMIT ${options.limit * 2}
    `
  ]);
  
  // 3. Merge and rank
  return rankResults(keywordResults, semanticResults, options);
}
```

### Ranking Algorithm

```typescript
interface RankingFactors {
  semanticRelevance: number;  // 0-1, cosine similarity
  keywordMatch: number;       // 0-1, normalized BM25
  popularity: number;         // 0-1, based on views/usage
  recency: number;           // 0-1, time decay
  quality: number;           // 0-1, based on reviews
  contextMatch: number;      // 0-1, user context alignment
}

function calculateFinalScore(factors: RankingFactors): number {
  const weights = {
    semanticRelevance: 0.3,
    keywordMatch: 0.3,
    popularity: 0.15,
    recency: 0.1,
    quality: 0.1,
    contextMatch: 0.05
  };
  
  return Object.entries(weights).reduce(
    (score, [factor, weight]) => 
      score + (factors[factor as keyof RankingFactors] * weight),
    0
  );
}
```

## Daily Milestones

### Day 8-9: Full-Text Search
- Set up tsvector columns and indexes
- Implement document processing pipeline
- Create search query builders
- Test with sample queries

### Day 10-11: Semantic Search
- Install and configure pgvector
- Build embedding generation service
- Implement vector search queries
- Create embedding update jobs

### Day 12-13: Hybrid System
- Implement result merging logic
- Build ranking algorithm
- Add caching layer
- Performance optimization

### Day 14: Integration & Testing
- Update search_docs MCP tool
- End-to-end testing
- Performance benchmarking
- Documentation

## Acceptance Criteria

1. **Search Quality**
   - Returns relevant results for test queries
   - Handles typos and synonyms
   - Supports phrase and boolean queries

2. **Performance**
   - <300ms response time for searches
   - Efficient embedding generation
   - Proper caching implemented

3. **Scalability**
   - Can handle 100k+ documents
   - Background job processing
   - Incremental index updates

4. **Integration**
   - search_docs tool fully functional
   - Proper result formatting
   - Deep linking with anchors

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Embedding costs | High | Cache embeddings, batch processing |
| Search quality | High | A/B testing, user feedback loop |
| Performance issues | Medium | Proper indexing, query optimization |
| Complex queries | Low | Start simple, iterate based on usage |

## Dependencies

- PostgreSQL with pgvector extension
- OpenAI/Anthropic API for embeddings
- Background job processor (Bull/BullMQ)
- Redis for caching (optional)

## Configuration

Add to environment:
```
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
SEARCH_CACHE_TTL=3600
CHUNK_MIN_TOKENS=400
CHUNK_MAX_TOKENS=800
CHUNK_OVERLAP=100
```

## Success Metrics

- ✅ Full-text search operational
- ✅ Semantic search working
- ✅ <300ms search latency
- ✅ 90%+ relevant results in top 5
- ✅ Background indexing functional

## Output

By end of Phase 2:
- Production-ready hybrid search system
- Efficient document processing pipeline
- Scalable indexing infrastructure
- Ready for review system in Phase 3

## Notes

1. **Embedding Strategy**: Start with OpenAI's text-embedding-3-small for cost efficiency
2. **Chunking**: Preserve context by including parent heading in chunks
3. **Caching**: Implement Redis caching for popular queries
4. **Monitoring**: Add metrics for search quality and performance
5. **Fallbacks**: Always have keyword search as fallback if embeddings fail