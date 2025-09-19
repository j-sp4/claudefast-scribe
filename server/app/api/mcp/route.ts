import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';
import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { db, projects, topics, documents, proposals, revisions } from '@/lib/db';
import { eq, and, like, desc, asc, or, sql, isNull } from 'drizzle-orm';
import { EmbeddingService } from '@/lib/services/embeddings';
import { logger } from '@/lib/logger';

const model = 'claude-3-5-sonnet-20241022';

chalk.level = 3;

const KNOWLEDGE_FILE_PATH = path.join(process.cwd(), '..', 'KNOWLEDGE.md');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

async function readKnowledgeBase(): Promise<string> {
  try {
    const content = await fs.readFile(KNOWLEDGE_FILE_PATH, 'utf-8');
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const initialContent = `# Knowledge Base

This file contains question and answer pairs about the codebase, accumulated over time to help with future development.

## Q&A Entries

---
`;
      await fs.writeFile(KNOWLEDGE_FILE_PATH, initialContent, 'utf-8');
      return initialContent;
    }
    throw error;
  }
}

async function appendToKnowledgeBase(qaEntries: Array<{question: string, answer: string}>): Promise<{added: number, skipped: number, merged: number}> {
  let currentContent = await readKnowledgeBase();
  
  const existingQuestions = new Map<string, { original: string, answer: string, position: number }>();
  const questionRegex = /\*\*Q: ([^*]+)\*\*\nA: ([^]*?)(?=\n\n\*\*Q:|---|\n\n##|$)/gm;
  let match;
  while ((match = questionRegex.exec(currentContent)) !== null) {
    const q = match[1].trim();
    const a = match[2].trim();
    const normalized = q.toLowerCase().replace(/[^\w\s]/g, '').trim();
    existingQuestions.set(normalized, { original: q, answer: a, position: match.index });
  }
  
  const processedEntries: string[] = [];
  const stats = { added: 0, skipped: 0, merged: 0 };
  
  for (const { question, answer } of qaEntries) {
    const normalizedNewQuestion = question.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    if (existingQuestions.has(normalizedNewQuestion)) {
      const existing = existingQuestions.get(normalizedNewQuestion)!;
      
      if (existing.answer.toLowerCase().includes(answer.toLowerCase().trim())) {
        console.log(chalk.bgYellow.black(' ⏭️  SKIP '), chalk.yellow('Duplicate Q&A:'), chalk.yellowBright(question));
        stats.skipped++;
        continue;
      }
      
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const response = await anthropic.messages.create({
            model,
            max_tokens: 1000,
            temperature: 0.1,
            system: 'You are an expert at merging knowledge base answers. When given an existing Q&A pair and a new answer, intelligently combine them into a single comprehensive answer. Keep the merged answer concise and well-structured.',
            messages: [
              {
                role: 'user',
                content: `Existing Question: ${existing.original}\nExisting Answer: ${existing.answer}\n\nNew Answer to merge: ${answer}\n\nPlease provide a merged answer that combines both pieces of information. Return ONLY the merged answer text, no explanation.`
              }
            ],
          });
          
          const mergedAnswer = response.content[0]?.type === 'text' ? response.content[0].text.trim() : existing.answer + '\n\n' + answer;
          
          const oldQA = `**Q: ${existing.original}**\nA: ${existing.answer}`;
          const newQA = `**Q: ${existing.original}**\nA: ${mergedAnswer}`;
          currentContent = currentContent.replace(oldQA, newQA);
          
          existingQuestions.set(normalizedNewQuestion, { ...existing, answer: mergedAnswer });
          
          console.log(chalk.bgBlue.white(' 🔀 MERGE '), chalk.blue('Merged answer for:'), chalk.blueBright(existing.original));
          stats.merged++;
        } catch (error) {
          console.error(chalk.red('Error merging with AI:'), error);
          const mergedAnswer = existing.answer + '\n\nAdditional information:\n' + answer;
          const oldQA = `**Q: ${existing.original}**\nA: ${existing.answer}`;
          const newQA = `**Q: ${existing.original}**\nA: ${mergedAnswer}`;
          currentContent = currentContent.replace(oldQA, newQA);
          existingQuestions.set(normalizedNewQuestion, { ...existing, answer: mergedAnswer });
          stats.merged++;
        }
      } else {
        const mergedAnswer = existing.answer + '\n\nAdditional information:\n' + answer;
        const oldQA = `**Q: ${existing.original}**\nA: ${existing.answer}`;
        const newQA = `**Q: ${existing.original}**\nA: ${mergedAnswer}`;
        currentContent = currentContent.replace(oldQA, newQA);
        existingQuestions.set(normalizedNewQuestion, { ...existing, answer: mergedAnswer });
        console.log(chalk.bgBlue.white(' 🔀 MERGE '), chalk.blue('Appended answer for:'), chalk.blueBright(existing.original));
        stats.merged++;
      }
      continue;
    }
    
    processedEntries.push(`\n**Q: ${question}**\nA: ${answer}\n`);
    stats.added++;
    console.log(chalk.bgGreen.black(' ✅ ADD '), chalk.green('New question:'), chalk.greenBright(question));
  }
  
  if (processedEntries.length > 0) {
    const newEntriesText = processedEntries.join('\n');
    const lastDashIndex = currentContent.lastIndexOf('\n---\n');
    if (lastDashIndex !== -1) {
      currentContent = currentContent.slice(0, lastDashIndex) + newEntriesText + '\n' + currentContent.slice(lastDashIndex);
    } else {
      currentContent += newEntriesText;
    }
  }
  
  await fs.writeFile(KNOWLEDGE_FILE_PATH, currentContent, 'utf-8');
  
  return stats;
}

async function searchKnowledgeBaseWithAI(knowledgeContent: string, question: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1000,
    temperature: 0.1,
    system: 'You are an expert at searching through a knowledge base. Your job is to find relevant Q&A pairs that answer the given question. If you find relevant information, quote it exactly. If the answer is not in the knowledge base, say "NOT_FOUND".',
    messages: [
      {
        role: 'user',
        content: `Knowledge Base Content:\n${knowledgeContent}\n\nQuestion to answer: ${question}\n\nPlease search the knowledge base and quote any relevant Q&A pairs that help answer this question. If no relevant information exists, respond with "NOT_FOUND".`
      }
    ],
  });

  const answer = response.content[0]?.type === 'text' ? response.content[0].text : null;
  if (!answer || answer.trim().startsWith('NOT_FOUND')) {
    return null;
  }
  return answer;
}


const handler = createMcpHandler(
  (server) => {
    // Original tools
    server.tool(
      'ask_questions',
      'Asks questions about the codebase or on how to solve a particular problem. They will be answered by an expert.',
      {
        questions: z.array(z.string()).describe("Array of questions you want to ask about the codebase"),
      },
      async ({ questions }) => {
        const knowledgeContent = await readKnowledgeBase();

        console.log(chalk.bgCyan.black.bold(' 📋  MCP TOOL: ASK_QUESTIONS '));
        console.log(chalk.magentaBright.bold('🔍 Questions Received:'));
        questions.forEach((q, i) => {
          console.log(chalk.bgMagenta.white.bold(` ${i + 1} `), chalk.cyanBright.bold(q));
        });
        
        const responses = await Promise.all(
          questions.map(async (question) => {
            const answer = await searchKnowledgeBaseWithAI(knowledgeContent, question);
            
            if (answer) {
              return { question, answer };
            } else {
              return {
                question,
                answer: "I don't have a direct answer to that question in the knowledge base. Once you've found the answer, please add it using the create_qa tool."
              };
            }
          })
        );
        
        const formattedResponse = responses.map(r => `**Question:** ${r.question}\n\n**Answer:** ${r.answer}`).join('\n\n---\n\n');
        
        return {
          content: [{ type: 'text', text: formattedResponse }],
        };
      },
    );
    
    server.tool(
      'create_qa',
      'Create new question and answer pairs in the knowledge base.',
      {
        qa_entries: z.array(z.object({
          question: z.string().describe("The question that you're answering"),
          answer: z.string().describe("The answer to the question"),
        })).describe("The question and answer pairs to add"),
      },
      async ({ qa_entries }) => {
        const stats = await appendToKnowledgeBase(qa_entries);

        console.log(chalk.bgGreen.black.bold(' ✅  MCP TOOL: CREATE_QA '));
        console.log(chalk.yellowBright.bold('📊 Processing Statistics:'));
        console.log(
          chalk.bgGreen.white.bold(' ADDED '), chalk.greenBright.bold(stats.added),
          stats.merged > 0 ? chalk.bgYellow.black.bold(' MERGED ') + ' ' + chalk.yellowBright.bold(stats.merged) : '',
          stats.skipped > 0 ? chalk.bgGray.white(' SKIPPED ') + ' ' + chalk.gray(stats.skipped) : ''
        );
        
        let message = `Processed ${qa_entries.length} Q&A pair(s):\n`;
        if (stats.added > 0) message += `- Added ${stats.added} new question(s)\n`;
        if (stats.merged > 0) message += `- Merged ${stats.merged} answer(s) with similar questions\n`;
        if (stats.skipped > 0) message += `- Skipped ${stats.skipped} duplicate question(s)\n`;
        
        return {
          content: [{ type: 'text', text: message.trim() }],
        };
      },
    );

    // Discovery Tools
    server.tool(
      'list_projects',
      'Browse available projects in the documentation system',
      {
        search: z.string().optional().describe("Optional search term to filter projects"),
        limit: z.number().optional().default(20).describe("Maximum number of projects to return"),
      },
      async ({ search, limit }) => {
        console.log(chalk.bgBlue.white.bold(' 📚 MCP TOOL: LIST_PROJECTS '));
        
        try {
          const whereClause = search
            ? or(
                like(projects.name, `%${search}%`),
                projects.description ? like(projects.description, `%${search}%`) : undefined,
                like(projects.slug, `%${search}%`)
              )
            : undefined;
          
          const projectList = whereClause
            ? await db
                .select()
                .from(projects)
                .where(whereClause)
                .limit(limit!)
                .orderBy(asc(projects.name))
            : await db
                .select()
                .from(projects)
                .limit(limit!)
                .orderBy(asc(projects.name));
          
          const formatted = projectList.map(p => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description,
            isPublic: p.isPublic,
          }));
          
          return {
            content: [{ type: 'text', text: JSON.stringify({ projects: formatted }, null, 2) }],
          };
        } catch (error) {
          console.error(chalk.red('Error listing projects:'), error);
          
          // Fallback for when database isn't ready
          return {
            content: [{ type: 'text', text: JSON.stringify({ 
              projects: [
                {
                  slug: 'default',
                  name: 'Default Project',
                  description: 'Documentation project (database not initialized)',
                }
              ]
            }, null, 2) }],
          };
        }
      }
    );

    server.tool(
      'list_topics',
      'Explore documentation topics within a project',
      {
        projectSlug: z.string().describe("The project slug to list topics for"),
        parentTopicId: z.string().optional().describe("Optional parent topic ID to list children"),
        search: z.string().optional().describe("Optional search term to filter topics"),
        limit: z.number().optional().default(50).describe("Maximum number of topics to return"),
      },
      async ({ projectSlug, parentTopicId, search, limit }) => {
        console.log(chalk.bgBlue.white.bold(' 📂 MCP TOOL: LIST_TOPICS '));
        
        try {
          const project = await db
            .select()
            .from(projects)
            .where(eq(projects.slug, projectSlug))
            .limit(1);
          
          if (project.length === 0) {
            return {
              content: [{ type: 'text', text: 'Project not found' }],
            };
          }
          
          const conditions = [eq(topics.projectId, project[0].id)];
          
          if (parentTopicId) {
            conditions.push(eq(topics.parentTopicId, parentTopicId));
          } else {
            conditions.push(isNull(topics.parentTopicId));
          }
          
          if (search) {
            const searchCondition = sql`${topics.title} LIKE ${`%${search}%`} OR ${topics.description} LIKE ${`%${search}%`}`;
            conditions.push(searchCondition);
          }
          
          const topicList = await db
            .select()
            .from(topics)
            .where(and(...conditions))
            .limit(limit!)
            .orderBy(asc(topics.sortOrder), asc(topics.title));
          
          const formatted = topicList.map(t => ({
            id: t.id,
            slug: t.slug,
            title: t.title,
            description: t.description,
            path: t.path,
            tags: t.tags,
          }));
          
          return {
            content: [{ type: 'text', text: JSON.stringify({ topics: formatted }, null, 2) }],
          };
        } catch (error) {
          console.error(chalk.red('Error listing topics:'), error);
          return {
            content: [{ type: 'text', text: 'Error listing topics - database may not be initialized' }],
          };
        }
      }
    );

    // Reading Tools
    server.tool(
      'read_doc',
      'Retrieve specific documentation by topic ID',
      {
        topicId: z.string().describe("The topic ID to retrieve documentation for"),
        version: z.number().optional().describe("Optional version number (defaults to latest)"),
      },
      async ({ topicId, version }) => {
        console.log(chalk.bgCyan.black.bold(' 📖 MCP TOOL: READ_DOC '));
        
        try {
          const conditions = [eq(documents.topicId, topicId)];
          
          if (version !== undefined) {
            conditions.push(eq(documents.version, version));
          } else {
            conditions.push(eq(documents.isLatest, true));
          }
          
          const doc = await db
            .select()
            .from(documents)
            .where(and(...conditions))
            .limit(1);
          
          if (doc.length === 0) {
            return {
              content: [{ type: 'text', text: 'Document not found' }],
            };
          }
          
          // Update view count
          await db
            .update(documents)
            .set({ viewCount: sql`${documents.viewCount} + 1` })
            .where(eq(documents.id, doc[0].id));
          
          return {
            content: [{ 
              type: 'text', 
              text: `# ${doc[0].title}\n\n${doc[0].contentMd}\n\n---\n_Version: ${doc[0].version} | Views: ${doc[0].viewCount}_` 
            }],
          };
        } catch (error) {
          console.error(chalk.red('Error reading document:'), error);
          return {
            content: [{ type: 'text', text: 'Error reading document - database may not be initialized' }],
          };
        }
      }
    );

    server.tool(
      'search_docs',
      'Search documentation using keywords',
      {
        query: z.string().describe("Search query"),
        projectSlug: z.string().optional().describe("Optional project slug to limit search"),
        limit: z.number().optional().default(10).describe("Maximum number of results"),
      },
      async ({ query, projectSlug, limit }) => {
        console.log(chalk.bgMagenta.white.bold(' 🔍 MCP TOOL: SEARCH_DOCS '));
        
        try {
          let projectId: string | undefined;
          
          if (projectSlug) {
            const project = await db
              .select()
              .from(projects)
              .where(eq(projects.slug, projectSlug))
              .limit(1);
            
            if (project.length > 0) {
              projectId = project[0].id;
            }
          }
          
          // Use PostgreSQL full-text search with the search_vector column
          const searchConditions = [
            eq(documents.isLatest, true),
            sql`search_vector @@ plainto_tsquery('english', ${query})`
          ];
          
          if (projectId) {
            const topicIds = await db
              .select({ id: topics.id })
              .from(topics)
              .where(eq(topics.projectId, projectId));
            
            if (topicIds.length > 0) {
              searchConditions.push(
                sql`${documents.topicId} IN (${sql.raw(topicIds.map(t => `'${t.id}'`).join(','))})`
              );
            }
          }
          
          // Enhanced query with FTS ranking
          const results = await db
            .select({
              id: documents.id,
              title: documents.title,
              summary: documents.summary,
              topicId: documents.topicId,
              version: documents.version,
              helpfulCount: documents.helpfulCount,
              rank: sql<number>`ts_rank(search_vector, plainto_tsquery('english', ${query}))`,
            })
            .from(documents)
            .where(and(...searchConditions))
            .limit(limit!)
            .orderBy(
              sql`ts_rank(search_vector, plainto_tsquery('english', ${query})) DESC`,
              desc(documents.helpfulCount)
            );
          
          return {
            content: [{ type: 'text', text: JSON.stringify({ results, query }, null, 2) }],
          };
        } catch (error) {
          console.error(chalk.red('Error searching documents:'), error);
          return {
            content: [{ type: 'text', text: 'Error searching - database may not be initialized' }],
          };
        }
      }
    );

    server.tool(
      'semantic_search',
      'Search documentation using semantic similarity with AI-generated embeddings',
      {
        query: z.string().describe("Natural language search query"),
        projectSlug: z.string().optional().describe("Optional project slug to limit search"),
        limit: z.number().optional().default(10).describe("Maximum number of results"),
        threshold: z.number().optional().default(0.7).describe("Minimum similarity threshold (0-1)"),
      },
      async ({ query, projectSlug, limit, threshold }) => {
        console.log(chalk.bgCyan.black.bold(' 🧠 MCP TOOL: SEMANTIC_SEARCH '));
        
        try {
          const embeddingService = new EmbeddingService();
          
          // Generate embedding for the query
          const queryEmbedding = await embeddingService.generateEmbedding(query);
          
          // Build the query with optional project filter
          let projectFilter = '';
          if (projectSlug) {
            const project = await db
              .select()
              .from(projects)
              .where(eq(projects.slug, projectSlug))
              .limit(1);
            
            if (project.length > 0) {
              const topicIds = await db
                .select({ id: topics.id })
                .from(topics)
                .where(eq(topics.projectId, project[0].id));
              
              if (topicIds.length > 0) {
                projectFilter = sql`AND d.topic_id IN (${sql.raw(topicIds.map(t => `'${t.id}'`).join(','))})`;
              }
            }
          }
          
          // Use the SQL function we created for semantic search
          const results = await db.execute<{
            id: string;
            title: string;
            content_md: string;
            summary: string;
            similarity: number;
          }>(sql`
            SELECT 
              d.id,
              d.title,
              d.content_md,
              d.summary,
              1 - (d.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
            FROM documents d
            WHERE d.embedding IS NOT NULL
              AND d.is_latest = true
              AND 1 - (d.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${threshold}
              ${projectFilter}
            ORDER BY d.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
            LIMIT ${limit}
          `);
          
          // Format results for better readability
          const formattedResults = results.map(r => ({
            id: r.id,
            title: r.title,
            summary: r.summary || r.content_md?.substring(0, 200) + '...',
            similarity: (r.similarity * 100).toFixed(1) + '%',
          }));
          
          embeddingService.cleanup();
          
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({ 
                query,
                resultsCount: formattedResults.length,
                results: formattedResults 
              }, null, 2) 
            }],
          };
        } catch (error) {
          console.error(chalk.red('Error in semantic search:'), error);
          return {
            content: [{ 
              type: 'text', 
              text: `Error performing semantic search: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
          };
        }
      }
    );

    server.tool(
      'hybrid_search',
      'Search documentation using a combination of full-text and semantic search',
      {
        query: z.string().describe("Search query"),
        projectSlug: z.string().optional().describe("Optional project slug to limit search"),
        limit: z.number().optional().default(10).describe("Maximum number of results"),
        ftsWeight: z.number().optional().default(0.4).describe("Weight for FTS results (0-1)"),
        semanticWeight: z.number().optional().default(0.6).describe("Weight for semantic results (0-1)"),
      },
      async ({ query, projectSlug, limit, ftsWeight, semanticWeight }) => {
        console.log(chalk.bgGreen.black.bold(' 🔀 MCP TOOL: HYBRID_SEARCH '));
        
        try {
          const embeddingService = new EmbeddingService();
          
          // Generate embedding for semantic search
          const queryEmbedding = await embeddingService.generateEmbedding(query);
          
          // Build project filter if needed
          let projectFilter = '';
          if (projectSlug) {
            const project = await db
              .select()
              .from(projects)
              .where(eq(projects.slug, projectSlug))
              .limit(1);
            
            if (project.length > 0) {
              const topicIds = await db
                .select({ id: topics.id })
                .from(topics)
                .where(eq(topics.projectId, project[0].id));
              
              if (topicIds.length > 0) {
                projectFilter = `AND d.topic_id IN (${topicIds.map(t => `'${t.id}'`).join(',')})`;
              }
            }
          }
          
          // Use the hybrid search function we created
          const results = await db.execute<{
            id: string;
            title: string;
            content_md: string;
            summary: string;
            fts_rank: number;
            semantic_similarity: number;
            combined_score: number;
          }>(sql`
            SELECT * FROM hybrid_search(
              ${query},
              ${JSON.stringify(queryEmbedding)}::vector,
              ${ftsWeight},
              ${semanticWeight},
              ${limit}
            )
            ${projectFilter ? sql`WHERE id IN (SELECT id FROM documents d WHERE ${sql.raw(projectFilter)})` : sql``}
          `);
          
          // Format results with both scores
          const formattedResults = results.map(r => ({
            id: r.id,
            title: r.title,
            summary: r.summary || r.content_md?.substring(0, 200) + '...',
            scores: {
              fts: (r.fts_rank * 100).toFixed(1) + '%',
              semantic: (r.semantic_similarity * 100).toFixed(1) + '%',
              combined: (r.combined_score * 100).toFixed(1) + '%',
            },
          }));
          
          embeddingService.cleanup();
          
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({ 
                query,
                weights: { fts: ftsWeight, semantic: semanticWeight },
                resultsCount: formattedResults.length,
                results: formattedResults 
              }, null, 2) 
            }],
          };
        } catch (error) {
          console.error(chalk.red('Error in hybrid search:'), error);
          return {
            content: [{ 
              type: 'text', 
              text: `Error performing hybrid search: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
          };
        }
      }
    );

    server.tool(
      'get_best_doc',
      'Get the most relevant documentation based on context',
      {
        context: z.string().describe("Description of what you're looking for"),
        projectSlug: z.string().optional().describe("Optional project slug to limit search"),
      },
      async ({ context, projectSlug }) => {
        console.log(chalk.bgMagenta.white.bold(' 🎯 MCP TOOL: GET_BEST_DOC '));
        
        if (!process.env.ANTHROPIC_API_KEY) {
          return {
            content: [{ type: 'text', text: 'AI search not available - ANTHROPIC_API_KEY not set' }],
          };
        }
        
        try {
          // First get candidate documents
          let candidateDocs;
          
          if (projectSlug) {
            const project = await db
              .select()
              .from(projects)
              .where(eq(projects.slug, projectSlug))
              .limit(1);
            
            if (project.length === 0) {
              return {
                content: [{ type: 'text', text: 'Project not found' }],
              };
            }
            
            const topicIds = await db
              .select({ id: topics.id })
              .from(topics)
              .where(eq(topics.projectId, project[0].id));
            
            candidateDocs = await db
              .select()
              .from(documents)
              .where(
                and(
                  eq(documents.isLatest, true),
                  sql`${documents.topicId} IN (${sql.raw(topicIds.map(t => `'${t.id}'`).join(','))})`
                )
              )
              .limit(20);
          } else {
            candidateDocs = await db
              .select()
              .from(documents)
              .where(eq(documents.isLatest, true))
              .limit(20);
          }
          
          if (candidateDocs.length === 0) {
            return {
              content: [{ type: 'text', text: 'No documents found' }],
            };
          }
          
          // Use AI to find the most relevant
          const docsContext = candidateDocs.map(d => 
            `Title: ${d.title}\nSummary: ${d.summary || 'No summary'}\nContent Preview: ${d.contentMd.substring(0, 500)}`
          ).join('\n\n---\n\n');
          
          const response = await anthropic.messages.create({
            model,
            max_tokens: 500,
            temperature: 0.1,
            system: 'You are an expert at finding relevant documentation. Given a context and a list of documents, identify the most relevant one.',
            messages: [
              {
                role: 'user',
                content: `Context: ${context}\n\nDocuments:\n${docsContext}\n\nWhich document is most relevant? Return ONLY the exact title of the most relevant document.`
              }
            ],
          });
          
          const selectedTitle = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;
          
          if (!selectedTitle) {
            return {
              content: [{ type: 'text', text: 'Could not determine best document' }],
            };
          }
          
          const bestDoc = candidateDocs.find(d => d.title === selectedTitle) || candidateDocs[0];
          
          return {
            content: [{ 
              type: 'text', 
              text: `# ${bestDoc.title}\n\n${bestDoc.contentMd}` 
            }],
          };
        } catch (error) {
          console.error(chalk.red('Error getting best document:'), error);
          return {
            content: [{ type: 'text', text: 'Error finding best document' }],
          };
        }
      }
    );

    // Contribution Tools
    server.tool(
      'propose_update',
      'Submit a documentation update proposal',
      {
        topicId: z.string().describe("The topic ID to update"),
        title: z.string().describe("Title for the update"),
        contentMd: z.string().describe("New markdown content"),
        changesSummary: z.string().describe("Summary of what changed and why"),
      },
      async ({ topicId, title, contentMd, changesSummary }) => {
        console.log(chalk.bgYellow.black.bold(' 📝 MCP TOOL: PROPOSE_UPDATE '));
        
        try {
          // Check if topic exists
          const topic = await db
            .select()
            .from(topics)
            .where(eq(topics.id, topicId))
            .limit(1);
          
          if (topic.length === 0) {
            return {
              content: [{ type: 'text', text: 'Topic not found' }],
            };
          }
          
          // Get current document if exists
          const currentDoc = await db
            .select()
            .from(documents)
            .where(and(eq(documents.topicId, topicId), eq(documents.isLatest, true)))
            .limit(1);
          
          // Create proposal
          const [proposal] = await db.insert(proposals).values({
            topicId,
            documentId: currentDoc.length > 0 ? currentDoc[0].id : undefined,
            title,
            contentMd,
            changesSummary,
            authorId: '00000000-0000-0000-0000-000000000000', // Placeholder user ID
            status: 'pending',
          }).returning();
          
          return {
            content: [{ 
              type: 'text', 
              text: `Proposal created successfully!\nID: ${proposal.id}\nStatus: ${proposal.status}\nTitle: ${proposal.title}` 
            }],
          };
        } catch (error) {
          console.error(chalk.red('Error creating proposal:'), error);
          return {
            content: [{ type: 'text', text: 'Error creating proposal - database may not be initialized' }],
          };
        }
      }
    );

    server.tool(
      'review_queue',
      'View pending documentation proposals',
      {
        status: z.enum(['pending', 'approved', 'rejected', 'withdrawn']).optional().default('pending'),
        limit: z.number().optional().default(10),
      },
      async ({ status, limit }) => {
        console.log(chalk.bgYellow.black.bold(' 📋 MCP TOOL: REVIEW_QUEUE '));
        
        try {
          const proposalList = await db
            .select({
              id: proposals.id,
              title: proposals.title,
              changesSummary: proposals.changesSummary,
              status: proposals.status,
              createdAt: proposals.createdAt,
              voteCount: proposals.voteCount,
            })
            .from(proposals)
            .where(eq(proposals.status, status!))
            .limit(limit!)
            .orderBy(desc(proposals.createdAt));
          
          return {
            content: [{ type: 'text', text: JSON.stringify({ proposals: proposalList, status }, null, 2) }],
          };
        } catch (error) {
          console.error(chalk.red('Error fetching review queue:'), error);
          return {
            content: [{ type: 'text', text: 'Error fetching proposals - database may not be initialized' }],
          };
        }
      }
    );

    server.tool(
      'approve_proposal',
      'Approve a documentation proposal and merge changes',
      {
        proposalId: z.string().describe("The proposal ID to approve"),
        reviewNotes: z.string().optional().describe("Optional review notes"),
      },
      async ({ proposalId, reviewNotes }) => {
        console.log(chalk.bgGreen.black.bold(' ✅ MCP TOOL: APPROVE_PROPOSAL '));
        
        try {
          // Get proposal
          const [proposal] = await db
            .select()
            .from(proposals)
            .where(eq(proposals.id, proposalId))
            .limit(1);
          
          if (!proposal) {
            return {
              content: [{ type: 'text', text: 'Proposal not found' }],
            };
          }
          
          if (proposal.status !== 'pending') {
            return {
              content: [{ type: 'text', text: `Proposal already ${proposal.status}` }],
            };
          }
          
          // Get current version
          const currentDoc = await db
            .select()
            .from(documents)
            .where(and(eq(documents.topicId, proposal.topicId), eq(documents.isLatest, true)))
            .limit(1);
          
          const newVersion = currentDoc.length > 0 ? currentDoc[0].version + 1 : 1;
          
          // Create new document version
          const [newDoc] = await db.insert(documents).values({
            topicId: proposal.topicId,
            version: newVersion,
            title: proposal.title,
            contentMd: proposal.contentMd,
            author_id: proposal.authorId,
            isLatest: true,
          }).returning();
          
          // Update old version to not be latest
          if (currentDoc.length > 0) {
            await db
              .update(documents)
              .set({ isLatest: false })
              .where(eq(documents.id, currentDoc[0].id));
            
            // Create revision record
            await db.insert(revisions).values({
              documentId: newDoc.id,
              previousVersion: currentDoc[0].version,
              version: newVersion,
              changesSummary: proposal.changesSummary,
              authorId: proposal.authorId,
            });
          }
          
          // Update proposal status
          await db
            .update(proposals)
            .set({
              status: 'approved',
              reviewNotes,
              reviewedAt: new Date(),
            })
            .where(eq(proposals.id, proposalId));
          
          return {
            content: [{ 
              type: 'text', 
              text: `Proposal approved!\nNew document version: ${newVersion}\nDocument ID: ${newDoc.id}` 
            }],
          };
        } catch (error) {
          console.error(chalk.red('Error approving proposal:'), error);
          return {
            content: [{ type: 'text', text: 'Error approving proposal - database may not be initialized' }],
          };
        }
      }
    );

    server.tool(
      'reject_proposal',
      'Reject a documentation proposal',
      {
        proposalId: z.string().describe("The proposal ID to reject"),
        reviewNotes: z.string().describe("Reason for rejection"),
      },
      async ({ proposalId, reviewNotes }) => {
        console.log(chalk.bgRed.white.bold(' ❌ MCP TOOL: REJECT_PROPOSAL '));
        
        try {
          const [proposal] = await db
            .select()
            .from(proposals)
            .where(eq(proposals.id, proposalId))
            .limit(1);
          
          if (!proposal) {
            return {
              content: [{ type: 'text', text: 'Proposal not found' }],
            };
          }
          
          if (proposal.status !== 'pending') {
            return {
              content: [{ type: 'text', text: `Proposal already ${proposal.status}` }],
            };
          }
          
          await db
            .update(proposals)
            .set({
              status: 'rejected',
              reviewNotes,
              reviewedAt: new Date(),
            })
            .where(eq(proposals.id, proposalId));
          
          return {
            content: [{ type: 'text', text: `Proposal rejected with notes: ${reviewNotes}` }],
          };
        } catch (error) {
          console.error(chalk.red('Error rejecting proposal:'), error);
          return {
            content: [{ type: 'text', text: 'Error rejecting proposal - database may not be initialized' }],
          };
        }
      }
    );

    // Utility Tools
    server.tool(
      'history',
      'View document revision history',
      {
        topicId: z.string().describe("The topic ID to get history for"),
        limit: z.number().optional().default(10),
      },
      async ({ topicId, limit }) => {
        console.log(chalk.bgGray.white.bold(' 📚 MCP TOOL: HISTORY '));
        
        try {
          const docs = await db
            .select({
              id: documents.id,
              version: documents.version,
              title: documents.title,
              summary: documents.summary,
              isLatest: documents.isLatest,
              createdAt: documents.createdAt,
            })
            .from(documents)
            .where(eq(documents.topicId, topicId))
            .limit(limit!)
            .orderBy(desc(documents.version));
          
          const revisionList = await db
            .select()
            .from(revisions)
            .where(sql`${revisions.documentId} IN (${sql.raw(docs.map(d => `'${d.id}'`).join(','))})`)
            .orderBy(desc(revisions.createdAt));
          
          return {
            content: [{ 
              type: 'text', 
              text: JSON.stringify({ 
                documents: docs, 
                revisions: revisionList 
              }, null, 2) 
            }],
          };
        } catch (error) {
          console.error(chalk.red('Error fetching history:'), error);
          return {
            content: [{ type: 'text', text: 'Error fetching history - database may not be initialized' }],
          };
        }
      }
    );
  },
  {},
  {
    basePath: '/api'
  }
);

// Wrap handler with logging
const loggedHandler = async (req: Request) => {
  const url = new URL(req.url);
  logger.info(`MCP Request: ${req.method} ${url.pathname}`, {
    searchParams: Object.fromEntries(url.searchParams),
  });
  
  try {
    const response = await handler(req);
    logger.info(`MCP Response: ${response.status}`);
    return response;
  } catch (error) {
    logger.error('MCP Handler error:', error);
    throw error;
  }
};

export { loggedHandler as GET, loggedHandler as POST, loggedHandler as DELETE };