# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Scribe MCP** server - a crowd-sourced documentation system that provides MCP (Model Context Protocol) tools for reading, searching, and improving documentation directly from AI coding assistants.

There is no need to lint in this project.

NEVER RUN PNPM RUN DEV. IT IS ALREADY RUNNING BY DEFAULT.

## Development Commands

### Server Commands (in /server directory)
```bash
# Development
npm run dev           # Start Next.js dev server with Turbopack on http://localhost:3000

# Production
npm run build         # Build for production with Turbopack
npm run start         # Start production server
```

### Development Logs
The development server logs are automatically written to `/server/dev.log` when running `npm run dev`. Claude should check this file for:
- MCP server errors and debugging information
- API route errors at `/api/mcp`
- Next.js build and runtime errors
- Request/response logs for MCP tool invocations

**Important**: When debugging MCP server issues or investigating errors, always check `/server/dev.log` first for detailed error messages and stack traces.

## Architecture

### Technology Stack
- **Framework**: Next.js 15.5.0 with App Router and Turbopack
- **MCP Handler**: mcp-handler v1.0.1 for MCP protocol implementation
- **Language**: TypeScript with strict type checking
- **Validation**: Zod for runtime schema validation

### Project Structure
```
hackathon-scribe/
├── server/                     # Next.js application
│   ├── app/
│   │   ├── api/
│   │   │   └── mcp/
│   │   │       └── route.tsx  # MCP server endpoint
│   │   └── layout.tsx         # Root layout
│   ├── package.json           # Dependencies and scripts
│   └── tsconfig.json          # TypeScript configuration
├── mvp.md                     # MVP specification
└── mcp-crowd-docs-plan.md    # Full implementation plan
```

### MCP Server Implementation

The MCP server is accessible at `http://localhost:3000/api/mcp` and currently implements:

**Current Tools:**
- `get_docs` - Retrieves documentation for the current codebase
- `update_docs` - Updates documentation for the codebase

**Planned Tools (from MVP):**
- `list_topics` - Discover doc topics by project
- `read_doc` - Read specific documentation with versioning
- `search_docs` - Keyword-based search with snippets
- `propose_update` - Submit documentation edits
- `review_queue` - View pending proposals
- `approve_proposal` / `reject_proposal` - Merge or decline changes

### MCP Integration

To use this MCP server with Claude Code or Cursor:
1. Configure your MCP client to connect to `http://localhost:3000/api/mcp`
2. The server exposes tools via the mcp-handler library with basePath `/api`

## Key Implementation Details

### TypeScript Configuration
- Target: ES2017
- Strict mode enabled
- Module resolution: bundler
- Path alias: `@/*` maps to root directory

### Database Design (Planned)
According to the MVP, the system will use:
- PostgreSQL with pgvector for semantic search
- Full-text search using tsvector/BM25
- Tables: projects, topics, documents, revisions, proposals, users
- Document versioning with revision tracking

### Search & Ranking (Planned)
- Hybrid search: keyword (BM25) + semantic (embeddings)
- Ranking factors: relevance, recency, quality scores
- Chunk documents by headings (400-800 tokens)

## Development Guidelines

1. **MCP Tools**: Keep tool responses compact and include metadata for citations
2. **Versioning**: Use baseDocVersion for conflict detection
3. **Auth**: GitHub OAuth with role-based access (user, reviewer, admin)
4. **Rate Limiting**: Implement per-user and per-IP limits on proposals

## Current Status

The project is in early development with:
- Basic MCP server setup complete
- Next.js application structure in place
- Two initial MCP tools implemented
- Full specification documented in mvp.md and mcp-crowd-docs-plan.md

Next steps involve implementing the database schema, search functionality, and the complete set of MCP tools outlined in the MVP.
