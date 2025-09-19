import OpenAI from 'openai';
import { db, documents, documentChunks } from '../db';
import { eq } from 'drizzle-orm';
import { DocumentChunker, TextChunk } from './chunking';
import chalk from 'chalk';

export class EmbeddingService {
  private openai: OpenAI;
  private chunker: DocumentChunker;
  private model = 'text-embedding-3-small'; // 1536 dimensions, good performance
  
  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.chunker = new DocumentChunker(500, 50); // 500 tokens max, 50 token overlap
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error(chalk.red('Error generating embedding:'), error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    
    try {
      // OpenAI allows up to 2048 inputs per request
      const batchSize = 100;
      const embeddings: number[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
        });
        
        embeddings.push(...response.data.map(d => d.embedding));
      }
      
      return embeddings;
    } catch (error) {
      console.error(chalk.red('Error generating batch embeddings:'), error);
      throw error;
    }
  }

  /**
   * Process and store embeddings for a document
   */
  async embedDocument(documentId: string): Promise<void> {
    console.log(chalk.bgBlue.white(' 📝 EMBEDDING DOCUMENT '), documentId);
    
    try {
      // Fetch the document
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      if (!doc) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      // Generate full document embedding
      const fullText = `${doc.title}\n\n${doc.summary || ''}\n\n${doc.contentMd}`;
      const docEmbedding = await this.generateEmbedding(fullText);
      
      // Update document with embedding
      await db
        .update(documents)
        .set({ 
          embedding: JSON.stringify(docEmbedding) 
        })
        .where(eq(documents.id, documentId));
      
      console.log(chalk.green('✅ Document embedding stored'));
      
      // Chunk the document
      const chunks = this.chunker.chunkMarkdown(doc.contentMd);
      console.log(chalk.cyan(`📄 Created ${chunks.length} chunks`));
      
      if (chunks.length > 0) {
        // Delete existing chunks
        await db
          .delete(documentChunks)
          .where(eq(documentChunks.documentId, documentId));
        
        // Generate embeddings for all chunks
        const chunkTexts = chunks.map(c => c.content);
        const chunkEmbeddings = await this.generateEmbeddings(chunkTexts);
        
        // Store chunks with embeddings
        const chunkRecords = chunks.map((chunk, i) => ({
          documentId,
          chunkIndex: chunk.index,
          content: chunk.content,
          embedding: JSON.stringify(chunkEmbeddings[i]),
          tokenCount: chunk.tokenCount,
        }));
        
        await db.insert(documentChunks).values(chunkRecords);
        console.log(chalk.green(`✅ Stored ${chunks.length} chunks with embeddings`));
      }
      
    } catch (error) {
      console.error(chalk.red('Error embedding document:'), error);
      throw error;
    }
  }

  /**
   * Update embeddings for all documents in a project
   */
  async embedProject(projectId: string): Promise<void> {
    console.log(chalk.bgMagenta.white(' 🚀 EMBEDDING PROJECT '), projectId);
    
    try {
      // Get all latest documents in the project
      const docs = await db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.isLatest, true));
      
      console.log(chalk.cyan(`Found ${docs.length} documents to embed`));
      
      for (const doc of docs) {
        await this.embedDocument(doc.id);
      }
      
      console.log(chalk.green('✅ All documents embedded successfully'));
    } catch (error) {
      console.error(chalk.red('Error embedding project:'), error);
      throw error;
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async semanticSearch(
    query: string,
    limit = 10,
    threshold = 0.7
  ): Promise<Array<{ documentId: string; similarity: number }>> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // For now, we'll use the stored function we'll create
      // The vector operations will be handled in the database
      const results = await db.execute<{
        id: string;
        title: string;
        content_md: string;
        summary: string;
        similarity: number;
      }>(sql`
        SELECT * FROM search_documents_by_similarity(
          ${JSON.stringify(queryEmbedding)}::vector,
          ${threshold},
          ${limit}
        )
      `);
      
      return results.map(r => ({
        documentId: r.id,
        similarity: r.similarity,
      }));
    } catch (error) {
      console.error(chalk.red('Error in semantic search:'), error);
      throw error;
    }
  }

  /**
   * Search for similar chunks
   */
  async searchChunks(
    query: string,
    limit = 20,
    threshold = 0.7
  ): Promise<Array<{
    documentId: string;
    chunkIndex: number;
    content: string;
    similarity: number;
  }>> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // We'll need to create a similar function for chunks
      // For now, return empty array as this needs vector search setup
      console.log(chalk.yellow('⚠️  Chunk search requires vector search setup'));
      return [];
    } catch (error) {
      console.error(chalk.red('Error searching chunks:'), error);
      throw error;
    }
  }

  cleanup() {
    this.chunker.cleanup();
  }
}