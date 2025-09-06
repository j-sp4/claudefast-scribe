import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';
import { db, schema, config } from '@/lib/db';
import { ContextLoader } from '@/lib/context-loader';
import { eq, desc, and, or, ilike } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

// Initialize context loader
const contextLoader = new ContextLoader();

// Token counting (simple approximation)
function countTokens(text: string): number {
  // Rough approximation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

const handler = createMcpHandler(
  (server) => {
    // Discovery Tools
    server.tool(
      'list_projects',
      'List all available projects with their token counts',
      {
        query: z.string().optional().describe('Optional search query')
      },
      async ({ query }) => {
        if (!db) {
          return {
            content: [{
              type: 'text',
              text: 'Database not configured. Please set up Supabase first.'
            }]
          };
        }

        let projects;
        if (query) {
          projects = await db.query.projects.findMany({
            where: or(
              ilike(schema.projects.name, `%${query}%`),
              ilike(schema.projects.slug, `%${query}%`)
            )
          });
        } else {
          projects = await db.query.projects.findMany();
        }

        const projectsWithInfo = projects.map(p => ({
          slug: p.slug,
          name: p.name,
          description: p.description,
          totalTokens: p.totalTokens,
          fitsInContext: p.totalTokens <= config.context.maxTokens
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ projects: projectsWithInfo }, null, 2)
          }]
        };
      }
    );

    server.tool(
      'list_topics',
      'List topics within a project',
      {
        projectSlug: z.string().describe('The project slug'),
        query: z.string().optional().describe('Optional search query')
      },
      async ({ projectSlug, query }) => {
        if (!db) {
          return {
            content: [{
              type: 'text',
              text: 'Database not configured. Please set up Supabase first.'
            }]
          };
        }

        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.slug, projectSlug),
          with: {
            topics: true
          }
        });

        if (!project) {
          return {
            content: [{
              type: 'text',
              text: `Project '${projectSlug}' not found`
            }]
          };
        }

        let topics = project.topics;
        if (query) {
          const queryLower = query.toLowerCase();
          topics = topics.filter(t => 
            t.title.toLowerCase().includes(queryLower) ||
            t.slug.toLowerCase().includes(queryLower)
          );
        }

        const topicsWithInfo = topics.map(t => ({
          slug: t.slug,
          title: t.title,
          path: t.path,
          tags: t.tags,
          totalTokens: t.totalTokens
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ 
              project: project.name,
              topics: topicsWithInfo 
            }, null, 2)
          }]
        };
      }
    );

    // Context-Aware Reading Tools
    server.tool(
      'load_project_context',
      'Load entire project documentation into context if size permits',
      {
        projectSlug: z.string().describe('The project slug'),
        userContext: z.string().optional().describe('Current user context for smart loading')
      },
      async ({ projectSlug, userContext }) => {
        const result = await contextLoader.loadProject(projectSlug, userContext);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
    );

    server.tool(
      'search_in_context',
      'Search within loaded project context',
      {
        projectSlug: z.string().describe('The project slug'),
        query: z.string().describe('Search query'),
        limit: z.number().default(5).describe('Maximum results to return')
      },
      async ({ projectSlug, query, limit }) => {
        // First load the project context
        const loadResult = await contextLoader.loadProject(projectSlug);
        
        if (loadResult.strategy === 'not_found') {
          return {
            content: [{
              type: 'text',
              text: loadResult.message || 'Project not found'
            }]
          };
        }

        // Search within loaded documents
        const searchResults = await contextLoader.searchInContext(
          loadResult.documents,
          query,
          limit
        );

        const formattedResults = searchResults.map(r => ({
          topic: r.document.topicSlug,
          title: r.document.title,
          score: r.score,
          matches: r.matches
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              project: projectSlug,
              query,
              contextStrategy: loadResult.strategy,
              results: formattedResults
            }, null, 2)
          }]
        };
      }
    );

    server.tool(
      'read_doc',
      'Read a specific document',
      {
        projectSlug: z.string().describe('The project slug'),
        topicSlug: z.string().describe('The topic slug'),
        version: z.number().optional().describe('Specific version (latest if not specified)')
      },
      async ({ projectSlug, topicSlug, version }) => {
        if (!db) {
          return {
            content: [{
              type: 'text',
              text: 'Database not configured. Please set up Supabase first.'
            }]
          };
        }

        const topic = await db.query.topics.findFirst({
          where: and(
            eq(schema.topics.slug, topicSlug)
          ),
          with: {
            project: true,
            documents: {
              where: version ? eq(schema.documents.version, version) : undefined,
              orderBy: [desc(schema.documents.version)],
              limit: 1
            }
          }
        });

        if (!topic || topic.project.slug !== projectSlug) {
          return {
            content: [{
              type: 'text',
              text: `Topic '${topicSlug}' not found in project '${projectSlug}'`
            }]
          };
        }

        const document = topic.documents[0];
        if (!document) {
          return {
            content: [{
              type: 'text',
              text: `No document found for topic '${topicSlug}'`
            }]
          };
        }

        // Update access count
        await db.update(schema.documents)
          .set({ 
            accessCount: document.accessCount + 1,
            lastAccessedAt: new Date()
          })
          .where(eq(schema.documents.id, document.id));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              project: projectSlug,
              topic: topicSlug,
              version: document.version,
              title: document.title,
              content: document.contentMd,
              tokens: document.tokenCount,
              lastUpdated: document.updatedAt
            }, null, 2)
          }]
        };
      }
    );

    // Contribution Tools
    server.tool(
      'propose_update',
      'Propose an update to documentation',
      {
        projectSlug: z.string().describe('The project slug'),
        topicSlug: z.string().optional().describe('Topic slug for existing topic'),
        newTopic: z.object({
          slug: z.string(),
          title: z.string(),
          path: z.string().optional(),
          tags: z.array(z.string()).optional()
        }).optional().describe('Create a new topic'),
        change: z.object({
          kind: z.enum(['replace', 'append', 'edit']),
          title: z.string(),
          contentMd: z.string(),
          baseDocVersion: z.number().optional()
        }),
        rationale: z.string().optional()
      },
      async ({ projectSlug, topicSlug, newTopic, change, rationale }) => {
        if (!db) {
          return {
            content: [{
              type: 'text',
              text: 'Database not configured. Please set up Supabase first.'
            }]
          };
        }

        // Get project
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.slug, projectSlug)
        });

        if (!project) {
          return {
            content: [{
              type: 'text',
              text: `Project '${projectSlug}' not found`
            }]
          };
        }

        let topic;
        let targetDocument;

        // Handle existing topic vs new topic
        if (topicSlug) {
          topic = await db.query.topics.findFirst({
            where: and(
              eq(schema.topics.projectId, project.id),
              eq(schema.topics.slug, topicSlug)
            ),
            with: {
              documents: {
                orderBy: [desc(schema.documents.version)],
                limit: 1
              }
            }
          });

          if (!topic) {
            return {
              content: [{
                type: 'text',
                text: `Topic '${topicSlug}' not found`
              }]
            };
          }

          targetDocument = topic.documents[0];

          // Check version conflict
          if (change.baseDocVersion && targetDocument && 
              targetDocument.version !== change.baseDocVersion) {
            return {
              content: [{
                type: 'text',
                text: `Version conflict: document has been updated. Current version: ${targetDocument.version}, your version: ${change.baseDocVersion}`
              }]
            };
          }
        }

        // Create proposal
        const tokenCount = countTokens(change.contentMd);
        
        const [proposal] = await db.insert(schema.proposals).values({
          projectId: project.id,
          topicId: topic?.id,
          targetDocumentId: targetDocument?.id,
          changeKind: change.kind as any,
          title: change.title,
          contentMd: change.contentMd,
          rationale,
          baseDocVersion: change.baseDocVersion,
          status: 'pending'
        }).returning();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              proposalId: proposal.id,
              status: 'pending',
              message: 'Proposal submitted successfully',
              tokenCount
            }, null, 2)
          }]
        };
      }
    );

    server.tool(
      'review_queue',
      'View pending proposals for review',
      {
        projectSlug: z.string().optional().describe('Filter by project'),
        limit: z.number().default(10).describe('Maximum proposals to return')
      },
      async ({ projectSlug, limit }) => {
        if (!db) {
          return {
            content: [{
              type: 'text',
              text: 'Database not configured. Please set up Supabase first.'
            }]
          };
        }

        let proposals;
        if (projectSlug) {
          const project = await db.query.projects.findFirst({
            where: eq(schema.projects.slug, projectSlug)
          });
          
          if (!project) {
            return {
              content: [{
                type: 'text',
                text: `Project '${projectSlug}' not found`
              }]
            };
          }

          proposals = await db.query.proposals.findMany({
            where: and(
              eq(schema.proposals.projectId, project.id),
              eq(schema.proposals.status, 'pending')
            ),
            with: {
              project: true,
              topic: true,
              targetDocument: true
            },
            limit,
            orderBy: [desc(schema.proposals.createdAt)]
          });
        } else {
          proposals = await db.query.proposals.findMany({
            where: eq(schema.proposals.status, 'pending'),
            with: {
              project: true,
              topic: true,
              targetDocument: true
            },
            limit,
            orderBy: [desc(schema.proposals.createdAt)]
          });
        }

        const formattedProposals = proposals.map(p => ({
          id: p.id,
          project: p.project.slug,
          topic: p.topic?.slug,
          changeKind: p.changeKind,
          title: p.title,
          rationale: p.rationale,
          createdAt: p.createdAt,
          contentPreview: p.contentMd.substring(0, 200) + '...'
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              count: formattedProposals.length,
              proposals: formattedProposals
            }, null, 2)
          }]
        };
      }
    );

    server.tool(
      'approve_proposal',
      'Approve a proposal and apply changes',
      {
        proposalId: z.string().describe('The proposal ID'),
        reviewNote: z.string().optional().describe('Optional review note')
      },
      async ({ proposalId, reviewNote }) => {
        if (!db) {
          return {
            content: [{
              type: 'text',
              text: 'Database not configured. Please set up Supabase first.'
            }]
          };
        }

        const proposal = await db.query.proposals.findFirst({
          where: eq(schema.proposals.id, proposalId),
          with: {
            topic: true,
            targetDocument: true
          }
        });

        if (!proposal) {
          return {
            content: [{
              type: 'text',
              text: `Proposal '${proposalId}' not found`
            }]
          };
        }

        if (proposal.status !== 'pending') {
          return {
            content: [{
              type: 'text',
              text: `Proposal already ${proposal.status}`
            }]
          };
        }

        // Begin transaction-like operations
        let newVersion = 1;
        let topicId = proposal.topicId;

        // If updating existing document
        if (proposal.targetDocument) {
          newVersion = proposal.targetDocument.version + 1;
          
          // Create revision
          await db.insert(schema.revisions).values({
            documentId: proposal.targetDocument.id,
            version: proposal.targetDocument.version,
            contentMd: proposal.targetDocument.contentMd,
            tokenCount: proposal.targetDocument.tokenCount,
            changeDescription: proposal.rationale
          });

          // Update document
          let newContent = proposal.contentMd;
          if (proposal.changeKind === 'append') {
            newContent = proposal.targetDocument.contentMd + '\n\n' + proposal.contentMd;
          }

          const tokenCount = countTokens(newContent);
          
          await db.update(schema.documents)
            .set({
              version: newVersion,
              title: proposal.title,
              contentMd: newContent,
              tokenCount,
              updatedAt: new Date()
            })
            .where(eq(schema.documents.id, proposal.targetDocument.id));

          // Update topic token count
          await db.update(schema.topics)
            .set({
              totalTokens: tokenCount,
              updatedAt: new Date()
            })
            .where(eq(schema.topics.id, proposal.topicId!));
        } else {
          // Create new topic if needed
          if (!topicId) {
            const [newTopic] = await db.insert(schema.topics).values({
              projectId: proposal.projectId,
              slug: `new-topic-${Date.now()}`,
              title: proposal.title,
              totalTokens: countTokens(proposal.contentMd)
            }).returning();
            topicId = newTopic.id;
          }

          // Create new document
          const tokenCount = countTokens(proposal.contentMd);
          
          await db.insert(schema.documents).values({
            topicId: topicId!,
            version: 1,
            title: proposal.title,
            contentMd: proposal.contentMd,
            tokenCount
          });
        }

        // Update proposal status
        await db.update(schema.proposals)
          .set({
            status: 'approved',
            reviewNote,
            reviewedAt: new Date()
          })
          .where(eq(schema.proposals.id, proposalId));

        // Update project total tokens
        const projectDocs = await db.query.documents.findMany({
          where: eq(schema.topics.projectId, proposal.projectId),
          columns: {
            tokenCount: true
          }
        });

        const totalTokens = projectDocs.reduce((sum, doc) => sum + doc.tokenCount, 0);
        
        await db.update(schema.projects)
          .set({
            totalTokens,
            updatedAt: new Date()
          })
          .where(eq(schema.projects.id, proposal.projectId));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'approved',
              newVersion,
              message: 'Proposal approved and changes applied'
            }, null, 2)
          }]
        };
      }
    );

    server.tool(
      'reject_proposal',
      'Reject a proposal',
      {
        proposalId: z.string().describe('The proposal ID'),
        reviewNote: z.string().describe('Reason for rejection')
      },
      async ({ proposalId, reviewNote }) => {
        if (!db) {
          return {
            content: [{
              type: 'text',
              text: 'Database not configured. Please set up Supabase first.'
            }]
          };
        }

        const proposal = await db.query.proposals.findFirst({
          where: eq(schema.proposals.id, proposalId)
        });

        if (!proposal) {
          return {
            content: [{
              type: 'text',
              text: `Proposal '${proposalId}' not found`
            }]
          };
        }

        if (proposal.status !== 'pending') {
          return {
            content: [{
              type: 'text',
              text: `Proposal already ${proposal.status}`
            }]
          };
        }

        await db.update(schema.proposals)
          .set({
            status: 'rejected',
            reviewNote,
            reviewedAt: new Date()
          })
          .where(eq(schema.proposals.id, proposalId));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'rejected',
              message: 'Proposal rejected'
            }, null, 2)
          }]
        };
      }
    );

    // Utility Tools
    server.tool(
      'history',
      'View revision history for a document',
      {
        projectSlug: z.string().describe('The project slug'),
        topicSlug: z.string().describe('The topic slug'),
        limit: z.number().default(10).describe('Maximum revisions to return')
      },
      async ({ projectSlug, topicSlug, limit }) => {
        if (!db) {
          return {
            content: [{
              type: 'text',
              text: 'Database not configured. Please set up Supabase first.'
            }]
          };
        }

        const topic = await db.query.topics.findFirst({
          where: eq(schema.topics.slug, topicSlug),
          with: {
            project: true,
            documents: {
              with: {
                revisions: {
                  orderBy: [desc(schema.revisions.version)],
                  limit
                }
              }
            }
          }
        });

        if (!topic || topic.project.slug !== projectSlug) {
          return {
            content: [{
              type: 'text',
              text: `Topic '${topicSlug}' not found in project '${projectSlug}'`
            }]
          };
        }

        const history = [];
        for (const doc of topic.documents) {
          for (const rev of doc.revisions) {
            history.push({
              version: rev.version,
              changeDescription: rev.changeDescription,
              createdAt: rev.createdAt,
              tokenCount: rev.tokenCount
            });
          }
        }

        history.sort((a, b) => b.version - a.version);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              project: projectSlug,
              topic: topicSlug,
              history: history.slice(0, limit)
            }, null, 2)
          }]
        };
      }
    );
  },
  {},
  {
    basePath: '/api'
  }
);

export { handler as GET, handler as POST, handler as DELETE };