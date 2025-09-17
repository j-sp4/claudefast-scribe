# Scribe MCP API Documentation

## Overview

Scribe MCP provides a comprehensive API for managing crowd-sourced documentation through the Model Context Protocol (MCP). This API enables AI assistants to read, search, propose updates, and manage documentation collaboratively.

## Base URL

```
Production: https://scribe-mcp.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

All API requests require authentication via Supabase Auth. Include the authentication token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## MCP Server Endpoint

### Connect to MCP Server

```
POST /api/mcp
```

The MCP server implements the Model Context Protocol and exposes the following tools:

## MCP Tools

### Discovery Tools

#### list_projects
Browse available documentation projects.

**Parameters:**
- `search` (string, optional): Filter projects by name
- `limit` (number, optional): Max results (default: 20)

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "slug": "project-slug",
      "name": "Project Name",
      "description": "Project description",
      "documentCount": 42
    }
  ]
}
```

#### list_topics
Get documentation topics within a project.

**Parameters:**
- `projectSlug` (string, required): Project identifier
- `parentTopicId` (string, optional): Get child topics

**Response:**
```json
{
  "topics": [
    {
      "id": "uuid",
      "slug": "topic-slug",
      "title": "Topic Title",
      "parentId": "parent-uuid",
      "hasChildren": true,
      "documentCount": 5
    }
  ]
}
```

### Reading Tools

#### read_doc
Retrieve specific documentation content.

**Parameters:**
- `topicId` (string, required): Topic identifier
- `version` (number, optional): Specific version

**Response:**
```json
{
  "document": {
    "id": "uuid",
    "title": "Document Title",
    "contentMd": "# Markdown content...",
    "summary": "Brief summary",
    "version": 3,
    "lastUpdated": "2025-09-17T10:00:00Z"
  }
}
```

### Search Tools

#### search_docs
Full-text search using PostgreSQL.

**Parameters:**
- `query` (string, required): Search query
- `projectSlug` (string, optional): Limit to project
- `limit` (number, optional): Max results (default: 10)

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "title": "Document Title",
      "summary": "Matching summary...",
      "rank": 0.95
    }
  ]
}
```

#### semantic_search
AI-powered semantic search using embeddings.

**Parameters:**
- `query` (string, required): Natural language query
- `projectSlug` (string, optional): Limit to project
- `limit` (number, optional): Max results (default: 10)
- `threshold` (number, optional): Min similarity (0-1, default: 0.7)

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "title": "Document Title",
      "summary": "Content summary...",
      "similarity": "85.3%"
    }
  ]
}
```

#### hybrid_search
Combined full-text and semantic search.

**Parameters:**
- `query` (string, required): Search query
- `projectSlug` (string, optional): Limit to project
- `limit` (number, optional): Max results (default: 10)
- `ftsWeight` (number, optional): FTS weight (0-1, default: 0.4)
- `semanticWeight` (number, optional): Semantic weight (0-1, default: 0.6)

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "title": "Document Title",
      "summary": "Content...",
      "scores": {
        "fts": "75.0%",
        "semantic": "82.1%",
        "combined": "79.3%"
      }
    }
  ]
}
```

### Contribution Tools

#### propose_update
Submit a documentation update proposal.

**Parameters:**
- `topicId` (string, required): Target topic
- `title` (string, required): Proposal title
- `contentMd` (string, required): New content
- `changeKind` (enum, required): "replace" | "append" | "prepend"
- `rationale` (string, required): Why this change
- `baseDocVersion` (number, optional): For conflict detection

**Response:**
```json
{
  "proposalId": "uuid",
  "status": "pending",
  "qualityScore": 85
}
```

#### review_queue
View pending proposals for review.

**Parameters:**
- `status` (enum, optional): "pending" | "approved" | "rejected"
- `limit` (number, optional): Max results (default: 10)

**Response:**
```json
{
  "proposals": [
    {
      "id": "uuid",
      "title": "Proposal Title",
      "author": "user@example.com",
      "changeKind": "append",
      "createdAt": "2025-09-17T10:00:00Z",
      "qualityScore": 92
    }
  ]
}
```

#### approve_proposal
Approve a documentation proposal (reviewer only).

**Parameters:**
- `proposalId` (string, required): Proposal to approve
- `reviewNotes` (string, optional): Review comments

**Response:**
```json
{
  "success": true,
  "newDocVersion": 4,
  "mergedAt": "2025-09-17T10:00:00Z"
}
```

#### reject_proposal
Reject a documentation proposal (reviewer only).

**Parameters:**
- `proposalId` (string, required): Proposal to reject
- `reviewNotes` (string, required): Rejection reason

**Response:**
```json
{
  "success": true,
  "rejectedAt": "2025-09-17T10:00:00Z"
}
```

## REST API Endpoints

### Authentication

#### Sign Up
```
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe"
}
```

#### Sign In
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

#### Sign Out
```
POST /api/auth/signout
Authorization: Bearer <token>
```

### Proposals

#### Create Proposal
```
POST /api/proposals
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetDocId": "uuid",
  "changeKind": "replace",
  "title": "Update installation guide",
  "contentMd": "# Updated content...",
  "rationale": "Fixed outdated commands",
  "baseDocVersion": 3
}
```

**Rate Limit:** 5 requests per hour

#### List Proposals
```
GET /api/proposals?status=pending&limit=10
Authorization: Bearer <token>
```

#### Review Proposal
```
POST /api/proposals/{id}/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "approve",
  "reviewNotes": "Good improvements"
}
```

**Required Role:** reviewer or admin

### Health Check

#### System Health
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-17T10:00:00Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 12
    },
    "supabase_auth": {
      "status": "ok",
      "responseTime": 45
    },
    "anthropic_api": {
      "status": "ok",
      "responseTime": 230
    },
    "openai_api": {
      "status": "ok",
      "responseTime": 5
    },
    "vector_search": {
      "status": "ok",
      "responseTime": 8
    }
  }
}
```

## Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| Proposals | 5 | 1 hour |
| Comments | 20 | 5 minutes |
| Votes | 30 | 1 minute |
| General API | 100 | 1 minute |

Rate limit headers:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset time (ISO 8601)
- `Retry-After`: Seconds to wait (on 429 response)

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": {} // Optional additional context
}
```

Common HTTP status codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Version conflict
- `429 Too Many Requests`: Rate limited
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service down

## Quality Requirements

Documentation proposals must pass quality checks:

- Minimum 50 characters length
- Proper markdown structure
- Code blocks with language identifiers
- No broken links
- No unclosed code blocks
- Warning for TODO/FIXME comments

Quality score calculation:
- Errors: -20 points each
- Warnings: -10 points each
- Info: -2 points each
- Must score ≥ 60 to be accepted

## Webhooks (Coming Soon)

Configure webhooks for events:
- Proposal created
- Proposal approved/rejected
- Document updated
- New user registered

## SDK Support

Official SDKs coming soon:
- JavaScript/TypeScript
- Python
- Go
- Rust

## Support

- Email: support@scribe-mcp.com
- GitHub: https://github.com/scribe-mcp/api
- Discord: https://discord.gg/scribe-mcp

## Changelog

### v1.0.0 (2025-09-17)
- Initial release
- 14 MCP tools
- Full-text and semantic search
- Proposal system with quality checks
- Rate limiting
- Health monitoring