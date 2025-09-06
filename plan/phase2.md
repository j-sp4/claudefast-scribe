# Phase 2: Smart Context Management & Search

**Duration**: Week 2 (Days 8-14)  
**Goal**: Build intelligent context loading and in-context search capabilities

## Overview

With our context-first architecture, Phase 2 focuses on smart document loading strategies and efficient in-context search, eliminating the need for traditional RAG infrastructure.

## Key Deliverables

### 1. Smart Context Loading System
- [ ] Project size analyzer
- [ ] Context budget manager (track token usage)
- [ ] Intelligent section selection for large projects
- [ ] Related document prefetching
- [ ] Context caching strategy

### 2. In-Context Search (No Embeddings)
- [ ] Efficient string search within loaded context
- [ ] Section-aware search (search within headings)
- [ ] Cross-reference detection
- [ ] Result highlighting without database queries
- [ ] Smart result ranking based on structure

### 3. Document Organization Pipeline
- [ ] Markdown parser for structure extraction
- [ ] Document relationship mapping
- [ ] Anchor ID generation for deep linking
- [ ] Metadata extraction (tags, categories)
- [ ] Token counting for all documents

### 4. Context-First Search Strategy
- [ ] Load-time optimization
- [ ] Priority-based document loading
- [ ] Frequently accessed document caching
- [ ] Cross-project relationship mapping
- [ ] Usage-based loading optimization

## Technical Implementation

### Smart Loading Strategy

```typescript
interface ContextManager {
  projectId: string;
  maxTokens: number;
  loadedDocs: Map<string, Document>;
  tokenBudget: number;
  accessPatterns: Map<string, number>;
}

class SmartContextLoader {
  async loadProject(projectSlug: string, userContext?: string): Promise<LoadResult> {
    const project = await db.project.findUnique({
      where: { slug: projectSlug },
      include: {
        topics: {
          include: {
            documents: {
              select: {
                id: true,
                title: true,
                token_count: true,
                access_count: true,
                updated_at: true
              }
            }
          }
        }
      }
    });
    
    const totalTokens = project.topics.reduce(
      (sum, topic) => sum + topic.documents.reduce(
        (topicSum, doc) => topicSum + doc.token_count, 0
      ), 0
    );
    
    if (totalTokens <= this.contextBudget) {
      // Load everything
      return this.loadFullProject(project);
    } else {
      // Smart selection based on:
      // 1. User's current context
      // 2. Document access patterns
      // 3. Document relationships
      // 4. Recency
      return this.loadSelectively(project, userContext);
    }
  }
  
  private async loadSelectively(project: Project, context?: string): Promise<LoadResult> {
    // Priority scoring for documents
    const scores = await this.calculateDocumentPriorities(project, context);
    
    // Load documents until budget exhausted
    const toLoad = [];
    let currentTokens = 0;
    
    for (const doc of scores) {
      if (currentTokens + doc.token_count <= this.contextBudget) {
        toLoad.push(doc);
        currentTokens += doc.token_count;
      }
    }
    
    return this.loadDocuments(toLoad);
  }
}
```

### In-Context Search Implementation

```typescript
// Search within loaded context - no database queries needed
class ContextSearcher {
  private loadedContext: Map<string, Document>;
  
  async searchInContext(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // Search happens entirely in memory on loaded documents
    const results: SearchResult[] = [];
    
    for (const [docId, doc] of this.loadedContext) {
      const matches = this.findMatches(doc.content, query);
      
      if (matches.length > 0) {
        results.push({
          documentId: docId,
          title: doc.title,
          matches: matches.map(m => ({
            text: m.text,
            context: m.context,
            score: m.relevance,
            anchorId: m.anchorId
          })),
          score: this.calculateRelevance(matches, doc)
        });
      }
    }
    
    // Sort by relevance
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit);
  }
  
  private findMatches(content: string, query: string): Match[] {
    // Smart matching that understands markdown structure
    const sections = this.parseMarkdownSections(content);
    const matches: Match[] = [];
    
    for (const section of sections) {
      // Check heading match (higher weight)
      if (section.heading.toLowerCase().includes(query.toLowerCase())) {
        matches.push({
          type: 'heading',
          text: section.heading,
          context: section.content.substring(0, 200),
          relevance: 1.0,
          anchorId: section.anchorId
        });
      }
      
      // Check content match
      const contentMatches = this.searchInText(section.content, query);
      matches.push(...contentMatches);
    }
    
    return matches;
  }
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

- PostgreSQL (no pgvector needed)
- No embedding APIs required
- Simple caching (in-memory or Redis)
- Token counter library

## Configuration

Add to environment:
```
CONTEXT_BUDGET=100000
CACHE_TTL=3600
MAX_PROJECT_SIZE=150000
PREFETCH_RELATED=true
USE_ACCESS_PATTERNS=true
```

## Success Metrics

- ✅ Full project loading for projects <100k tokens
- ✅ Smart selection for larger projects
- ✅ <100ms in-context search
- ✅ 95%+ relevant results (no retrieval failures)
- ✅ Efficient context caching

## Output

By end of Phase 2:
- Context-first architecture fully operational
- Smart loading strategies implemented
- Fast in-context search
- Ready for review system in Phase 3

## Notes

1. **Context Strategy**: Most projects will fit entirely in context
2. **Loading Priority**: Use access patterns and recency for smart loading
3. **Caching**: Cache frequently accessed projects in memory
4. **Monitoring**: Track context usage and loading patterns
5. **Fallbacks**: For huge projects, load core docs + on-demand loading