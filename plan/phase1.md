# Phase 1: Core MCP Tools & Database Infrastructure (Context-First Architecture)

**Duration**: Week 1 (Days 1-7)  
**Goal**: Replace file-based system with database for persistence/organization and implement all core MCP tools using a context-first approach

## Overview

The current prototype uses a single KNOWLEDGE.md file and only implements 2 MCP tools. Phase 1 will establish a simplified database for storage and organization, while leveraging large context windows instead of traditional RAG for retrieval.

## Key Deliverables

### 1. Supabase & Drizzle Setup
- [ ] Create Supabase project
- [ ] Install and configure Drizzle ORM
- [ ] Define schema with Drizzle:
  - `projects` - Multi-project support
  - `topics` - Documentation topics per project  
  - `documents` - Versioned document content
  - `revisions` - Full revision history
  - `proposals` - Proposed changes
  - `users` - Managed by Supabase Auth
  - `usage_events` - Analytics
- [ ] Generate and run Drizzle migrations
- [ ] Set up Row Level Security (RLS) policies
- [ ] Configure Supabase Auth with GitHub OAuth
- [ ] Document size tracking for context management

### 2. Context-First MCP Tools Implementation

Replace current 2 tools with context-aware suite:

#### Discovery Tools
- [ ] `list_projects` - Browse available projects with size info
- [ ] `list_topics` - Explore topics within a project

#### Context-Aware Reading Tools  
- [ ] `load_project_context` - Load entire project docs if fits in context
- [ ] `read_doc` - Retrieve specific documentation
- [ ] `search_in_context` - Search within loaded context (no RAG)
- [ ] `smart_load` - Intelligently load relevant sections for large projects

#### Contribution Tools
- [ ] `propose_update` - Submit documentation changes
- [ ] `review_queue` - View pending proposals
- [ ] `approve_proposal` - Merge approved changes
- [ ] `reject_proposal` - Decline proposals

#### Utility Tools
- [ ] `history` - View document revision history

### 3. Data Migration
- [ ] Script to migrate existing KNOWLEDGE.md to database
- [ ] Preserve existing Q&A entries as seed data
- [ ] Create initial project structure

### 4. MCP Handler Updates
- [ ] Update mcp-handler integration for new tools
- [ ] Proper error handling and validation
- [ ] Response formatting for all tools

## Technical Implementation

### Drizzle Schema Definition

```typescript
// drizzle/schema.ts
import { pgTable, uuid, text, timestamp, integer, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by') // References Supabase auth.users
});

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  path: text('path'),
  tags: jsonb('tags').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  uniqueProjectSlug: unique().on(table.projectId, table.slug)
}));

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  title: text('title').notNull(),
  contentMd: text('content_md').notNull(),
  tokenCount: integer('token_count').notNull(), // Track size for context management
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by')
}, (table) => ({
  uniqueTopicVersion: unique().on(table.topicId, table.version)
}));

// Relations
export const projectRelations = relations(projects, ({ many }) => ({
  topics: many(topics)
}));

export const topicRelations = relations(topics, ({ one, many }) => ({
  project: one(projects, {
    fields: [topics.projectId],
    references: [projects.id]
  }),
  documents: many(documents)
}));

export const documentRelations = relations(documents, ({ one }) => ({
  topic: one(topics, {
    fields: [documents.topicId],
    references: [topics.id]
  })
}));

// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
} satisfies Config;
```

### Tool Implementation with Drizzle & Supabase

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import * as schema from './drizzle/schema';

// Drizzle for database queries
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

// Supabase for auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Example: Context-first implementation with Drizzle
server.tool(
  'load_project_context',
  'Load entire project documentation into context if size permits',
  {
    projectSlug: z.string(),
    maxTokens: z.number().default(100000)
  },
  async ({ projectSlug, maxTokens }) => {
    // Get project with all documents using Drizzle
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.slug, projectSlug),
      with: {
        topics: {
          with: {
            documents: true
          }
        }
      }
    });
    
    if (!project) {
      return { content: [{ type: 'text', text: 'Project not found' }] };
    }
    
    // Calculate total tokens
    const totalTokens = project.topics.reduce(
      (sum, topic) => 
        sum + topic.documents.reduce(
          (tSum, doc) => tSum + doc.tokenCount, 0
        ), 0
    );
    
    if (totalTokens <= maxTokens) {
      // Return full project context
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ 
            strategy: 'full_context',
            total_tokens: totalTokens,
            project: project 
          }, null, 2)
        }]
      };
    } else {
      // Return metadata for smart loading
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ 
            strategy: 'selective_loading',
            total_tokens: totalTokens,
            message: 'Project too large for context, use smart_load tool'
          }, null, 2)
        }]
      };
    }
  }
);
```

## Daily Milestones

### Day 1-2: Supabase Setup
- Create Supabase project
- Set up schema through Supabase dashboard
- Configure Auth with GitHub OAuth
- Test RLS policies

### Day 3-4: Tool Implementation
- Implement all read tools
- Implement discovery tools
- Basic testing of each tool

### Day 5-6: Contribution Flow
- Implement propose/review/approve tools
- Test full contribution workflow
- Handle edge cases

### Day 7: Integration & Testing
- Migrate existing data
- End-to-end testing
- Performance optimization

## Acceptance Criteria

1. **Database Operational**
   - All tables created and indexed
   - Can connect from Next.js app
   - Migrations reproducible

2. **All Tools Functional**
   - Each tool returns valid responses
   - Error handling works properly
   - Response times <100ms

3. **Data Migrated**
   - Existing KNOWLEDGE.md imported
   - No data loss
   - Proper relationships established

4. **MCP Protocol Compliance**
   - Tools follow MCP spec
   - Proper JSON-RPC handling
   - Compatible with Claude Code

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database complexity | High | Start with minimal schema, iterate |
| Tool implementation time | Medium | Prioritize read tools first |
| Migration issues | Low | Keep KNOWLEDGE.md as backup |
| Performance problems | Medium | Add indexes, use connection pooling |

## Dependencies

- Supabase account (free tier sufficient for MVP)
- Drizzle ORM and drizzle-kit
- @supabase/supabase-js (for auth)
- postgres driver for Drizzle
- Vercel account for deployment
- Environment variables setup

## Success Metrics

- ✅ All 10 MCP tools implemented
- ✅ Database schema deployed
- ✅ Can perform CRUD operations
- ✅ <100ms response time
- ✅ Existing data migrated

## Output

By end of Phase 1:
- Fully functional MCP server with database backing
- All core tools operational
- Ready for search implementation in Phase 2

## Notes for Implementation

### Critical Hardcoded Values to Fix

1. **Claude Model**: 
   - Current: `claude-opus-4-1-20250805` (non-existent)
   - Fix: Use `claude-3-5-sonnet-20241022` or make configurable

2. **File Paths**:
   - `KNOWLEDGE.md` path: `path.join(process.cwd(), '..', 'KNOWLEDGE.md')`
   - Sync paths: Hardcoded to specific server/docs structure
   - Fix: Use environment variables for all paths

3. **URLs & Ports**:
   - Server: `http://localhost:3000`
   - MCP endpoint: `http://localhost:3000/api/mcp`
   - Check endpoint: `http://localhost:3000/api/check?random=true`
   - Fix: Make configurable via env vars

4. **Directory Structure**:
   - Assumes server runs from `/server` directory
   - Hardcoded parent directory navigation (`..`)
   - Fix: Use absolute paths or proper base path config

5. **Sync Script**:
   - Hardcoded `hardcodedUpdateArchitecture()` function
   - Specific file watching paths
   - Fix: Make configurable or remove for production

### Implementation Guidelines

1. **Environment Variables**: Create `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...
   ANTHROPIC_API_KEY=...
   ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   ```

2. **Database Client Setup**: Create Drizzle and Supabase clients:
   ```typescript
   // lib/db.ts
   import { drizzle } from 'drizzle-orm/postgres-js';
   import postgres from 'postgres';
   import { createClient } from '@supabase/supabase-js';
   import * as schema from '../drizzle/schema';
   
   // Drizzle for queries
   const client = postgres(process.env.DATABASE_URL!);
   export const db = drizzle(client, { schema });
   
   // Supabase for auth
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_KEY!,
     {
       auth: {
         autoRefreshToken: false,
         persistSession: false
       }
     }
   );
   
   export const config = {
     anthropic: { 
       apiKey: process.env.ANTHROPIC_API_KEY,
       model: process.env.ANTHROPIC_MODEL 
     },
     context: {
       maxTokens: 100000,
       cacheEnabled: true
     }
   };
   ```

3. **Error Handling**: Comprehensive try-catch blocks
4. **Logging**: Add structured logging for debugging
5. **Type Safety**: Full TypeScript types for all database operations