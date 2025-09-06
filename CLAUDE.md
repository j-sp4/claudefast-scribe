# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Scribe MCP** - A crowd-sourced documentation system that provides MCP (Model Context Protocol) tools for reading, searching, and improving documentation directly from AI coding assistants. Winner of $10,000 at the YC 24h hackathon.

## Architecture

### Technology Stack
- **Framework**: Next.js 15.5.0 with App Router and Turbopack
- **MCP Handler**: mcp-handler v1.0.1 for MCP protocol implementation  
- **Language**: TypeScript with strict type checking
- **AI Integration**: @anthropic-ai/sdk for intelligent Q&A search and duplicate detection
- **Validation**: Zod for runtime schema validation

### Key Files & Directories
```
hackathon-scribe/
├── server/                          # Next.js application
│   ├── app/api/mcp/route.tsx       # MCP server endpoint (2 tools implemented)
│   ├── app/api/check/route.tsx     # Validation endpoint
│   └── flows/update-knowledge.ts   # Knowledge validation flow
├── sync/                            # File watcher system
│   └── index.js                     # Watches files and triggers validation
├── KNOWLEDGE.md                     # Single-file knowledge base (200+ lines)
├── mvp.md                          # MVP specification (full feature set)
├── plan/                           # 4-week development plan
│   ├── current-state.md           # Detailed analysis of current limitations
│   └── phase[1-4].md              # Implementation phases
└── mcp-crowd-docs-plan.md         # Full system design
```

## Development Commands

### Server Commands (in /server directory)
```bash
# Development (logs to dev.log automatically)
npm run dev           # Starts on http://localhost:3000 with Turbopack

# Production
npm run build         # Build for production
npm run start         # Start production server

# Code Quality
npm run lint          # Run ESLint
```

### Sync System Commands (in /sync directory)  
```bash
npm start            # Start file watcher for knowledge validation
```

## Current Implementation Status

### What's Working
- **MCP Server**: Basic server at `http://localhost:3000/api/mcp` with 2 tools
- **Knowledge Storage**: Single KNOWLEDGE.md file with Q&A pairs
- **AI Integration**: Claude-powered search and duplicate detection
- **File Watching**: Sync system triggers validation on file changes

### Current MCP Tools
1. **`ask_questions`**: AI-powered search through knowledge base
2. **`create_qa`**: Add Q&A pairs with intelligent duplicate detection and merging

### Critical Limitations (vs MVP spec)
- Missing 8+ MCP tools (`list_topics`, `read_doc`, `search_docs`, `propose_update`, `review_queue`, etc.)
- No database (uses single markdown file)
- No multi-project support (hardcoded to single codebase)
- No user authentication or roles
- No review/moderation workflow
- No version control or revision tracking
- No proper search infrastructure (only AI Q&A)
- Hardcoded Claude model reference (line 8 in route.tsx)
- No rate limiting or abuse protection
- No production deployment configuration

## Development Roadmap

### Phase 1 (Week 1): Core MCP Tools & Database
- Implement PostgreSQL schema
- Build all 10+ MCP tools from MVP spec
- Migrate from file to database storage

### Phase 2 (Week 2): Search Infrastructure
- Full-text search with PostgreSQL
- Semantic search with pgvector
- Hybrid ranking algorithm
- Document chunking and indexing

### Phase 3 (Week 3): Review System
- Proposal submission and tracking
- Review queue and approval flow
- GitHub OAuth authentication
- Role-based access control

### Phase 4 (Week 4): Beta Launch
- Cloud deployment (Vercel/Fly.io)
- Production database setup
- Monitoring and logging
- Customer onboarding

## Important Notes

1. **Model Configuration**: The Claude model specified in `/server/app/api/mcp/route.tsx:8` needs updating to a valid model
2. **Knowledge Path**: Currently hardcoded to `../KNOWLEDGE.md` relative to server directory
3. **Development Logs**: Check `/server/dev.log` for MCP server errors and debugging information
4. **No Tests**: Project currently has no test suite implemented
5. **Customer Demand**: Multiple companies have expressed interest post-hackathon, requiring production-grade features

## MCP Integration

To use this MCP server with Claude Code or Cursor:
1. Configure your MCP client to connect to `http://localhost:3000/api/mcp`
2. The server exposes tools via the mcp-handler library with basePath `/api`
3. Currently only 2 tools available (vs 10+ in MVP spec)

## Next Steps

The project requires significant development to reach beta readiness. See `/plan/README.md` for the complete 4-week development plan to deliver the full MVP specification outlined in `/mvp.md`.