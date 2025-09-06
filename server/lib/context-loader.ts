import { db, schema, config } from './db';
import { eq, desc, and, sql } from 'drizzle-orm';

export interface LoadedDocument {
  id: string;
  title: string;
  contentMd: string;
  tokenCount: number;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  version: number;
}

export interface LoadResult {
  strategy: 'full_context' | 'selective_loading' | 'not_found';
  totalTokens: number;
  loadedTokens: number;
  documents: LoadedDocument[];
  projectId?: string;
  projectName?: string;
  message?: string;
}

export class ContextLoader {
  private cache: Map<string, { result: LoadResult; timestamp: number }> = new Map();
  
  constructor(private maxTokens: number = config.context.maxTokens) {}

  async loadProject(projectSlug: string, userContext?: string): Promise<LoadResult> {
    // Check cache
    if (config.context.cacheEnabled) {
      const cached = this.cache.get(projectSlug);
      if (cached && Date.now() - cached.timestamp < config.context.cacheTTL * 1000) {
        return cached.result;
      }
    }

    if (!db) {
      return {
        strategy: 'not_found',
        totalTokens: 0,
        loadedTokens: 0,
        documents: [],
        message: 'Database not configured'
      };
    }

    // Get project with all documents
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.slug, projectSlug),
      with: {
        topics: {
          with: {
            documents: {
              orderBy: [desc(schema.documents.version)]
            }
          }
        }
      }
    });

    if (!project) {
      return {
        strategy: 'not_found',
        totalTokens: 0,
        loadedTokens: 0,
        documents: [],
        message: `Project '${projectSlug}' not found`
      };
    }

    // Calculate total tokens and prepare documents
    const allDocs: LoadedDocument[] = [];
    let totalTokens = 0;

    for (const topic of project.topics) {
      // Get latest version of each topic's document
      const latestDoc = topic.documents[0];
      if (latestDoc) {
        totalTokens += latestDoc.tokenCount;
        allDocs.push({
          id: latestDoc.id,
          title: latestDoc.title,
          contentMd: latestDoc.contentMd,
          tokenCount: latestDoc.tokenCount,
          topicId: topic.id,
          topicTitle: topic.title,
          topicSlug: topic.slug,
          version: latestDoc.version
        });
      }
    }

    // Update access counts
    if (allDocs.length > 0) {
      await db.update(schema.documents)
        .set({ 
          accessCount: sql`${schema.documents.accessCount} + 1`,
          lastAccessedAt: new Date()
        })
        .where(
          sql`id IN (${sql.raw(allDocs.map(d => `'${d.id}'`).join(','))})`
        );
    }

    let result: LoadResult;

    if (totalTokens <= this.maxTokens) {
      // Load everything
      result = {
        strategy: 'full_context',
        totalTokens,
        loadedTokens: totalTokens,
        documents: allDocs,
        projectId: project.id,
        projectName: project.name
      };
    } else {
      // Smart selection based on access patterns and context
      const selectedDocs = await this.selectDocuments(allDocs, userContext);
      const loadedTokens = selectedDocs.reduce((sum, doc) => sum + doc.tokenCount, 0);

      result = {
        strategy: 'selective_loading',
        totalTokens,
        loadedTokens,
        documents: selectedDocs,
        projectId: project.id,
        projectName: project.name,
        message: `Project exceeds context budget. Loaded ${selectedDocs.length} of ${allDocs.length} documents (${loadedTokens} of ${totalTokens} tokens).`
      };
    }

    // Cache result
    if (config.context.cacheEnabled) {
      this.cache.set(projectSlug, { result, timestamp: Date.now() });
    }

    return result;
  }

  private async selectDocuments(
    allDocs: LoadedDocument[], 
    userContext?: string
  ): Promise<LoadedDocument[]> {
    // Sort documents by priority
    const scoredDocs = allDocs.map(doc => ({
      doc,
      score: this.calculatePriority(doc, userContext)
    }));

    scoredDocs.sort((a, b) => b.score - a.score);

    // Load documents until budget exhausted
    const selected: LoadedDocument[] = [];
    let currentTokens = 0;

    for (const { doc } of scoredDocs) {
      if (currentTokens + doc.tokenCount <= this.maxTokens) {
        selected.push(doc);
        currentTokens += doc.tokenCount;
      }
    }

    return selected;
  }

  private calculatePriority(doc: LoadedDocument, userContext?: string): number {
    let score = 0;

    // Context relevance (if user context provided)
    if (userContext) {
      const contextLower = userContext.toLowerCase();
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.contentMd.toLowerCase();

      if (titleLower.includes(contextLower)) score += 10;
      if (contentLower.includes(contextLower)) score += 5;
    }

    // Prefer smaller documents (more likely to fit)
    score += (1 / (doc.tokenCount / 1000));

    // Prefer core documentation (based on common patterns)
    const corePatterns = ['readme', 'api', 'getting started', 'overview', 'index'];
    for (const pattern of corePatterns) {
      if (doc.title.toLowerCase().includes(pattern)) {
        score += 3;
      }
    }

    return score;
  }

  async searchInContext(
    documents: LoadedDocument[],
    query: string,
    limit: number = 5
  ): Promise<Array<{
    document: LoadedDocument;
    matches: Array<{
      text: string;
      context: string;
      relevance: number;
    }>;
    score: number;
  }>> {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const doc of documents) {
      const matches = this.findMatches(doc.contentMd, queryLower);
      
      if (matches.length > 0) {
        const score = matches.reduce((sum, m) => sum + m.relevance, 0);
        results.push({
          document: doc,
          matches: matches.slice(0, 3), // Top 3 matches per document
          score
        });
      }
    }

    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private findMatches(content: string, query: string): Array<{
    text: string;
    context: string;
    relevance: number;
  }> {
    const matches = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      if (lineLower.includes(query)) {
        // Get context (surrounding lines)
        const contextStart = Math.max(0, i - 1);
        const contextEnd = Math.min(lines.length - 1, i + 1);
        const context = lines.slice(contextStart, contextEnd + 1).join('\n');
        
        // Calculate relevance
        let relevance = 1;
        if (line.startsWith('#')) relevance = 2; // Headers are more relevant
        if (lineLower.startsWith(query)) relevance += 0.5; // Starts with query
        
        matches.push({
          text: line.trim(),
          context,
          relevance
        });
      }
    }
    
    return matches;
  }

  clearCache() {
    this.cache.clear();
  }
}