# Phase 1: Core MCP Tools & Database Infrastructure

**Duration**: Week 1 (Days 1-7)  
**Goal**: Replace file-based system with database and implement all core MCP tools

## Overview

The current prototype uses a single KNOWLEDGE.md file and only implements 2 MCP tools. Phase 1 will establish the proper database foundation and implement all 10+ MCP tools specified in the MVP.

## Key Deliverables

### 1. Database Schema Implementation
- [ ] Set up PostgreSQL with pgvector extension
- [ ] Create all tables from MVP spec:
  - `projects` - Multi-project support
  - `topics` - Documentation topics per project
  - `documents` - Versioned document content
  - `revisions` - Full revision history
  - `proposals` - Proposed changes
  - `users` - User accounts
  - `usage_events` - Analytics
- [ ] Database migrations setup (using Prisma or similar)
- [ ] Connection pooling and optimization

### 2. Core MCP Tools Implementation

Replace current 2 tools with full suite:

#### Discovery Tools
- [ ] `list_projects` - Browse available projects
- [ ] `list_topics` - Explore topics within a project

#### Reading Tools  
- [ ] `read_doc` - Retrieve specific documentation
- [ ] `search_docs` - Keyword-based search (basic version)
- [ ] `get_best_doc` - Context-aware doc retrieval

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

### Database Setup

```sql
-- Core schema excerpt
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE topics (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  path VARCHAR(500),
  tags JSONB DEFAULT '[]',
  UNIQUE(project_id, slug)
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  topic_id UUID REFERENCES topics(id),
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_md TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(topic_id, version)
);
```

### Tool Implementation Pattern

```typescript
// Example: list_topics implementation
server.tool(
  'list_topics',
  'Explore documentation topics for a project',
  {
    projectSlug: z.string(),
    query: z.string().optional()
  },
  async ({ projectSlug, query }) => {
    const topics = await db.topic.findMany({
      where: {
        project: { slug: projectSlug },
        ...(query && {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } }
          ]
        })
      },
      select: {
        id: true,
        slug: true,
        title: true,
        path: true,
        tags: true
      }
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ topics }, null, 2)
      }]
    };
  }
);
```

## Daily Milestones

### Day 1-2: Database Foundation
- Set up PostgreSQL locally and in development
- Create and test schema
- Set up migrations

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

- PostgreSQL 15+ with pgvector
- Prisma or similar ORM
- Database hosting (local for now)
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

1. **Environment Variables**: Create `.env` file with:
   ```
   DATABASE_URL=postgresql://...
   ANTHROPIC_API_KEY=...
   ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   MCP_BASE_URL=http://localhost:3000
   KNOWLEDGE_FILE_PATH=/path/to/knowledge.md
   ```

2. **Configuration Module**: Create centralized config:
   ```typescript
   export const config = {
     db: { url: process.env.DATABASE_URL },
     anthropic: { 
       apiKey: process.env.ANTHROPIC_API_KEY,
       model: process.env.ANTHROPIC_MODEL 
     },
     paths: { 
       knowledge: process.env.KNOWLEDGE_FILE_PATH 
     }
   };
   ```

3. **Error Handling**: Comprehensive try-catch blocks
4. **Logging**: Add structured logging for debugging
5. **Type Safety**: Full TypeScript types for all database operations