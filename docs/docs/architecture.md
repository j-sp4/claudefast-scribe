# System Architecture

## Database Design

The system uses PostgreSQL (via Neon.tech) for storing knowledge base entries. The schema includes:

```typescript
knowledgeEntries {
  id: serial
  question: text
  answer: text
  normalizedQuestion: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Key Components

- **Database Layer**: PostgreSQL with Drizzle ORM
- **API Layer**: Next.js API routes
- **MCP Tools**: Database-backed Q&A operations

## Data Flow

1. Questions are normalized for duplicate detection
2. Entries are stored in PostgreSQL
3. AI assistant queries use database lookups
