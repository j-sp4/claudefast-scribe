# Scribe MCP Setup Guide

## Quick Start (5 minutes)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (free tier is sufficient)
3. Save your project credentials:
   - Project URL: `https://[PROJECT_ID].supabase.co`
   - Anon Key: `eyJ...` (public)
   - Service Key: `eyJ...` (secret)
   - Database Password: (you set this)

### 2. Configure Environment

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Database URL (get from Supabase dashboard > Settings > Database)
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# Anthropic (optional for now)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 3. Run Database Migrations

Generate and run the initial migration:

```bash
# Generate migration from schema
npx drizzle-kit generate:pg

# Push schema to database
npx drizzle-kit push:pg
```

### 4. Enable Row Level Security

Go to Supabase Dashboard > SQL Editor and run:

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read" ON documents FOR SELECT USING (true);
CREATE POLICY "Public read" ON revisions FOR SELECT USING (true);

-- Authenticated users can propose
CREATE POLICY "Authenticated propose" ON proposals 
  FOR INSERT WITH CHECK (true);

-- Only reviewers/admins can review
CREATE POLICY "Reviewer approve" ON proposals 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = auth.uid() 
      AND users.role IN ('reviewer', 'admin')
    )
  );
```

### 5. Seed Initial Data

Create your first project and topic:

```sql
-- Insert a test project
INSERT INTO projects (slug, name, description, total_tokens)
VALUES ('scribe-docs', 'Scribe Documentation', 'Documentation for the Scribe MCP system', 0);

-- Get the project ID (copy this)
SELECT id FROM projects WHERE slug = 'scribe-docs';

-- Insert a test topic (replace PROJECT_ID)
INSERT INTO topics (project_id, slug, title, path, tags)
VALUES ('PROJECT_ID', 'getting-started', 'Getting Started', '/docs/getting-started', '["intro", "setup"]'::jsonb);

-- Get the topic ID (copy this)
SELECT id FROM topics WHERE slug = 'getting-started';

-- Insert a test document (replace TOPIC_ID)
INSERT INTO documents (topic_id, version, title, content_md, token_count)
VALUES (
  'TOPIC_ID',
  1,
  'Getting Started with Scribe',
  '# Getting Started with Scribe

Scribe is a crowd-sourced documentation system for MCP.

## Features
- Context-first architecture
- Smart document loading
- Contribution workflow
- Version history

## Quick Start
1. Load project context
2. Search documentation
3. Propose improvements',
  150
);

-- Update project token count
UPDATE projects 
SET total_tokens = (
  SELECT SUM(d.token_count) 
  FROM documents d 
  JOIN topics t ON d.topic_id = t.id 
  WHERE t.project_id = projects.id
)
WHERE slug = 'scribe-docs';
```

### 6. Start the Server

```bash
npm run dev
```

The MCP server is now available at `http://localhost:3000/api/mcp`

## Testing the MCP Tools

### Test with curl

```bash
# List projects
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_projects",
      "arguments": {}
    },
    "id": 1
  }'

# Load project context
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "load_project_context",
      "arguments": {
        "projectSlug": "scribe-docs"
      }
    },
    "id": 2
  }'
```

### Configure with Claude Code

Add to your MCP settings:

```json
{
  "mcpServers": {
    "scribe": {
      "command": "node",
      "args": ["--experimental-modules", "server.js"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3000/api/mcp"
      }
    }
  }
}
```

## Available MCP Tools

### Discovery
- `list_projects` - List all projects with token counts
- `list_topics` - List topics in a project

### Reading
- `load_project_context` - Load entire project if fits in context
- `search_in_context` - Search within loaded context
- `read_doc` - Read specific document

### Contributing
- `propose_update` - Propose documentation changes
- `review_queue` - View pending proposals
- `approve_proposal` - Approve and apply changes
- `reject_proposal` - Reject a proposal

### Utility
- `history` - View document revision history

## Deployment to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

## Troubleshooting

### Database not connecting
- Check DATABASE_URL format
- Ensure Supabase project is active
- Try connection pooler URL

### MCP tools return "not configured"
- Verify .env.local exists
- Check environment variables are loaded
- Restart dev server

### Context exceeds limit
- Adjust CONTEXT_BUDGET in .env.local
- Use selective loading for large projects
- Split into multiple smaller projects