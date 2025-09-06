-- Enable Row Level Security on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Public read access for documentation
CREATE POLICY "Public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read access" ON documents FOR SELECT USING (true);
CREATE POLICY "Public read access" ON revisions FOR SELECT USING (true);

-- Anyone can view pending proposals (transparency)
CREATE POLICY "Public read proposals" ON proposals 
  FOR SELECT USING (status = 'pending');

-- Authenticated users can submit proposals
CREATE POLICY "Authenticated users can propose" ON proposals 
  FOR INSERT WITH CHECK (true);

-- Only reviewers and admins can approve/reject proposals
CREATE POLICY "Reviewers can update proposals" ON proposals 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.supabase_user_id = auth.uid() 
      AND users.role IN ('reviewer', 'admin')
    )
  );

-- Users can read their own usage events
CREATE POLICY "Users read own events" ON usage_events 
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_user_id = auth.uid()
    )
  );

-- System can insert usage events
CREATE POLICY "System insert events" ON usage_events 
  FOR INSERT WITH CHECK (true);

-- Users can read all users (for contributor list)
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users update own profile" ON users 
  FOR UPDATE USING (supabase_user_id = auth.uid());

-- ============================================
-- SEED DATA
-- ============================================

-- Insert initial project
INSERT INTO projects (slug, name, description, total_tokens) VALUES 
  ('scribe-docs', 'Scribe Documentation', 'Official documentation for the Scribe MCP system', 0),
  ('example-project', 'Example Project', 'A sample project to demonstrate Scribe features', 0);

-- Get project IDs (you'll need to run this query and note the IDs)
-- SELECT id, slug FROM projects;

-- Insert topics for scribe-docs (replace PROJECT_ID with actual ID from above)
DO $$
DECLARE
  scribe_project_id uuid;
  example_project_id uuid;
  getting_started_topic_id uuid;
  api_topic_id uuid;
BEGIN
  -- Get project IDs
  SELECT id INTO scribe_project_id FROM projects WHERE slug = 'scribe-docs';
  SELECT id INTO example_project_id FROM projects WHERE slug = 'example-project';

  -- Insert topics for scribe-docs
  INSERT INTO topics (project_id, slug, title, path, tags, total_tokens) VALUES 
    (scribe_project_id, 'getting-started', 'Getting Started', '/docs/getting-started', '["intro", "setup", "quickstart"]'::jsonb, 0),
    (scribe_project_id, 'api-reference', 'API Reference', '/docs/api', '["api", "reference", "tools"]'::jsonb, 0),
    (scribe_project_id, 'architecture', 'Architecture', '/docs/architecture', '["architecture", "design", "technical"]'::jsonb, 0);

  -- Insert topics for example-project  
  INSERT INTO topics (project_id, slug, title, path, tags, total_tokens) VALUES 
    (example_project_id, 'readme', 'README', '/', '["readme", "overview"]'::jsonb, 0);

  -- Get topic IDs
  SELECT id INTO getting_started_topic_id FROM topics WHERE slug = 'getting-started' AND project_id = scribe_project_id;
  SELECT id INTO api_topic_id FROM topics WHERE slug = 'api-reference' AND project_id = scribe_project_id;

  -- Insert documents
  INSERT INTO documents (topic_id, version, title, content_md, token_count) VALUES 
    (getting_started_topic_id, 1, 'Getting Started with Scribe', 
'# Getting Started with Scribe

Scribe is a crowd-sourced documentation system that uses MCP (Model Context Protocol) to provide intelligent documentation directly in your AI coding assistant.

## Key Features

- **Context-First Architecture**: Leverages large context windows instead of traditional RAG
- **Smart Loading**: Automatically loads entire projects when they fit in context
- **Version Control**: Full revision history with rollback capability
- **Contribution Workflow**: Submit, review, and approve documentation changes
- **Multi-Project Support**: Manage documentation for multiple codebases

## Quick Start

### 1. List Available Projects

Use the `list_projects` tool to see all available documentation:

```
list_projects()
```

### 2. Load Project Documentation

Load an entire project into context:

```
load_project_context(projectSlug: "scribe-docs")
```

### 3. Search Documentation

Search within the loaded context:

```
search_in_context(projectSlug: "scribe-docs", query: "how to contribute")
```

### 4. Propose Improvements

Found something that could be better? Submit a proposal:

```
propose_update(
  projectSlug: "scribe-docs",
  topicSlug: "getting-started",
  change: {
    kind: "append",
    title: "Adding Docker setup",
    contentMd: "## Docker Setup\n\n..."
  }
)
```

## Architecture Overview

Scribe uses a simplified architecture that prioritizes speed and accuracy:

1. **Database**: Supabase PostgreSQL for persistence
2. **Context Management**: Smart loading based on token counts
3. **Search**: In-memory search within loaded context
4. **Auth**: Supabase Auth with GitHub OAuth

## Contributing

Anyone can contribute to documentation:

1. **Read**: All documentation is publicly readable
2. **Propose**: Submit improvement proposals
3. **Review**: Reviewers approve or reject changes
4. **Merge**: Approved changes create new versions

## Next Steps

- Explore the [API Reference](/docs/api) for all available tools
- Learn about the [Architecture](/docs/architecture)
- Start contributing to documentation!
', 400),

    (api_topic_id, 1, 'MCP Tools API Reference',
'# MCP Tools API Reference

## Discovery Tools

### list_projects
List all available projects with their token counts.

**Parameters:**
- `query` (optional): Search query to filter projects

**Returns:**
- Array of projects with slug, name, description, and token count

### list_topics
List all topics within a project.

**Parameters:**
- `projectSlug`: The project slug
- `query` (optional): Search query to filter topics

**Returns:**
- Array of topics with slug, title, path, and tags

## Reading Tools

### load_project_context
Load entire project documentation into context if size permits.

**Parameters:**
- `projectSlug`: The project slug
- `userContext` (optional): Current context for smart loading

**Returns:**
- Load result with strategy, documents, and token counts

### search_in_context
Search within loaded project context.

**Parameters:**
- `projectSlug`: The project slug
- `query`: Search query
- `limit`: Maximum results (default: 5)

**Returns:**
- Search results with matches and relevance scores

### read_doc
Read a specific document.

**Parameters:**
- `projectSlug`: The project slug
- `topicSlug`: The topic slug
- `version` (optional): Specific version

**Returns:**
- Document content with metadata

## Contribution Tools

### propose_update
Propose an update to documentation.

**Parameters:**
- `projectSlug`: The project slug
- `topicSlug` (optional): For existing topics
- `change`: Object with kind, title, and contentMd
- `rationale` (optional): Reason for change

**Returns:**
- Proposal ID and status

### review_queue
View pending proposals for review.

**Parameters:**
- `projectSlug` (optional): Filter by project
- `limit`: Maximum proposals (default: 10)

**Returns:**
- Array of pending proposals

### approve_proposal
Approve a proposal and apply changes.

**Parameters:**
- `proposalId`: The proposal ID
- `reviewNote` (optional): Review comment

**Returns:**
- Approval status and new version

### reject_proposal
Reject a proposal.

**Parameters:**
- `proposalId`: The proposal ID
- `reviewNote`: Reason for rejection

**Returns:**
- Rejection confirmation

## Utility Tools

### history
View revision history for a document.

**Parameters:**
- `projectSlug`: The project slug
- `topicSlug`: The topic slug
- `limit`: Maximum revisions (default: 10)

**Returns:**
- Array of revisions with versions and descriptions
', 500);

  -- Update token counts for topics
  UPDATE topics SET total_tokens = (
    SELECT COALESCE(SUM(token_count), 0) FROM documents WHERE topic_id = topics.id
  );

  -- Update token counts for projects
  UPDATE projects SET total_tokens = (
    SELECT COALESCE(SUM(total_tokens), 0) FROM topics WHERE project_id = projects.id
  );

  RAISE NOTICE 'Seed data created successfully!';
END $$;

-- Create a test user (optional - for testing review functionality)
-- Note: In production, users are created via Supabase Auth
INSERT INTO users (handle, email, role, github_username) VALUES 
  ('test-reviewer', 'reviewer@example.com', 'reviewer', 'test-reviewer');

-- Verify the setup
SELECT 
  p.slug as project,
  p.total_tokens as project_tokens,
  COUNT(DISTINCT t.id) as topics,
  COUNT(DISTINCT d.id) as documents
FROM projects p
LEFT JOIN topics t ON p.id = t.project_id
LEFT JOIN documents d ON t.id = d.topic_id
GROUP BY p.id, p.slug, p.total_tokens
ORDER BY p.slug;