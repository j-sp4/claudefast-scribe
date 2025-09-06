# Research: Phase 1 Database Foundation

## Initial Request

**Original**: Starting Phase 1 from plan/phase1.md - Database foundation (Days 1-2)
**Started**: 2025-09-06
**Session**: 1

## Context from Discussion

Working on the Scribe MCP project that won $10k at YC hackathon. Need to replace the file-based KNOWLEDGE.md system with a proper PostgreSQL database and implement all 10+ MCP tools from the MVP specification.

## Findings

### Current System Analysis

- **Storage**: Single KNOWLEDGE.md file with 27 Q&A pairs
- **Format**: Markdown with pattern `**Q: question**\nA: answer`
- **Processing**: Sophisticated duplicate detection (exact match + AI semantic)
- **Search**: AI-powered using Claude Opus model
- **Validation**: Automated flow with progress tracking

### Database Patterns Found

1. **Configuration Pattern** at `plan/phase1.md:247-259`
   - Centralized config module using environment variables
   - DATABASE_URL pattern for PostgreSQL

2. **Zod Validation** at `server/app/api/mcp/route.tsx:252-303`
   - Already using Zod v3.25.76 for runtime validation
   - Integrates with MCP handler for tool parameters

3. **Schema Design** at `plan/phase1.md:61-89`
   - UUIDs for primary keys
   - JSONB for flexible metadata
   - Proper foreign key relationships
   - Version tracking built-in

4. **ORM Query Pattern** at `plan/phase1.md:103-129`
   - Prisma-style syntax prepared
   - Conditional filtering patterns
   - Case-insensitive search support

### PostgreSQL + Prisma Setup Requirements

**Dependencies Needed**:
```json
{
  "@prisma/client": "^6.13.0",
  "@prisma/extension-accelerate": "^1.3.0",
  "prisma": "^6.13.0" // dev dependency
}
```

**Environment Variables**:
```env
DATABASE_URL="postgresql://..." # Pooled connection
POSTGRES_URL_NON_POOLING="postgresql://..." # Direct for migrations
```

**Connection Strategy**:
- Use singleton pattern for Prisma client
- Pooled connections for API routes
- Direct connection for migrations

### Migration Strategy

**Data Volume**: Only 27 Q&A pairs to migrate
**Complexity**: Must preserve:
- Duplicate detection logic (normalized + AI semantic)
- Answer merging algorithms
- AI search functionality
- Validation workflows

**Approach**:
1. Implement database schema first
2. Create migration script for KNOWLEDGE.md
3. Dual-write during transition
4. Validate data integrity
5. Cut over to database-only

## Patterns to Reuse

1. **Zod Validation** (`server/app/api/mcp/route.tsx`)
   - Keep existing validation patterns
   - Extend for new MCP tools

2. **AI Integration** (`server/app/api/mcp/route.tsx:221-244`)
   - Preserve search logic
   - Adapt for database queries

3. **Duplicate Detection** (`server/app/api/mcp/route.tsx:45-219`)
   - Keep normalization logic
   - Store normalized versions in DB

4. **Environment Config** (`plan/phase1.md:247-259`)
   - Use suggested pattern for DB config

## Key Decisions

1. **Use Drizzle ORM** - 4x smaller bundle, native pgvector, better for serverless
2. **Use Neon PostgreSQL** - 3GB free tier, scale-to-zero, no auto-suspend
3. **Defer pgvector** - Implement in Phase 2 for semantic search (but Drizzle ready)
4. **NO DUAL-WRITE** - Pre-launch = no users = just replace everything
5. **PostgreSQL from Day 1** - Avoid migration complexity later

### Why Drizzle over Prisma?
- **Bundle Size**: 1.5MB vs 6.5MB (critical for Vercel serverless)
- **Cold Starts**: 30MB memory vs 80MB memory footprint
- **pgvector**: Native support vs workarounds
- **No Codegen**: Instant schema changes, no build step
- **SQL-first**: Team knows SQL, can move faster

### Why Neon over Supabase/Vercel?
- **3GB free tier** vs Supabase's 500MB
- **No auto-suspend** vs Supabase's 7-day limit
- **Database branching** for safe testing
- **Built for AI workloads** (80% of DBs are AI-created)

### Critical Insight: Pre-Launch Simplicity
- **NO USERS = NO DOWNTIME CONCERNS**
- **No dual-write needed** - Just replace file system
- **No fallbacks needed** - Database is the only system
- **Delete old code immediately** - Reduce complexity

## Implementation Order

### Day 1 Morning: Database Setup
1. Install Prisma dependencies
2. Initialize Prisma schema
3. Create core tables (projects, topics, documents, revisions, proposals, users)
4. Set up development database

### Day 1 Afternoon: Migration Script
1. Parse KNOWLEDGE.md structure
2. Create project/topic hierarchy
3. Import Q&A as documents
4. Verify data integrity

### Day 2 Morning: Core MCP Tools
1. Implement read tools (list_topics, read_doc)
2. Implement search_docs (basic keyword)
3. Test with migrated data

### Day 2 Afternoon: Contribution Tools
1. Implement propose_update
2. Implement review_queue
3. Implement approve/reject_proposal
4. End-to-end testing

## Open Questions

1. **Deployment Target**: Vercel or Fly.io? (Recommend Vercel for simplicity)
2. **Authentication**: GitHub OAuth ready? (Required for user roles)
3. **Rate Limiting**: Redis needed or in-memory sufficient?
4. **Backup Strategy**: How to handle KNOWLEDGE.md during transition?

## Constraints & Risks

- **Model Issue**: Current code references non-existent `claude-opus-4-1-20250805`
- **Hardcoded Paths**: Multiple hardcoded file paths need env vars
- **No Tests**: No existing test suite to validate migration
- **API Costs**: AI operations during migration could be expensive

## Ready to Plan?

✅ Requirements understood: Replace file system with PostgreSQL + implement all MCP tools
✅ Patterns identified: Zod validation, AI integration, config patterns to reuse
✅ Constraints clear: Must preserve sophisticated processing logic
✅ Migration path defined: Gradual transition with validation

The research shows we have solid patterns to build on and a clear migration path. The main challenges will be preserving the sophisticated duplicate detection and AI search while transitioning to the database.