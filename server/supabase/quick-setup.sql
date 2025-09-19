-- Quick setup for testing the PR documentation system
-- Run this in your Supabase SQL Editor

-- Repository configurations
CREATE TABLE IF NOT EXISTS repository_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_name text NOT NULL UNIQUE,
  source_patterns jsonb NOT NULL DEFAULT '[]',
  targets jsonb NOT NULL DEFAULT '[]',
  rules jsonb NOT NULL DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT true,
  github_token text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- PR processing logs  
CREATE TABLE IF NOT EXISTS pr_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_name text NOT NULL,
  pr_number integer NOT NULL,
  pr_title text NOT NULL,
  pr_author text NOT NULL,
  status text NOT NULL,
  started_at timestamp NOT NULL,
  completed_at timestamp,
  analysis jsonb,
  results jsonb,
  error_message text,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Documentation updates tracking
CREATE TABLE IF NOT EXISTS documentation_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_name text NOT NULL,
  pr_number integer NOT NULL,
  target_type text NOT NULL,
  target_path text NOT NULL,
  update_type text NOT NULL,
  commit_sha text,
  pull_request_url text,
  success boolean NOT NULL,
  error_message text,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Insert test configuration
INSERT INTO repository_configs (
  repository_name,
  source_patterns,
  targets,
  rules,
  enabled
) VALUES (
  'maxmartinezruts/claudefast-scribe',
  '["src/**/*.ts", "server/**/*.ts", "lib/**/*.ts", "README.md", "docs/**/*.md"]',
  '[{"type": "folder", "path": "docs/", "branch": "docs-updates"}]',
  '[{"patterns": ["server/**/*.ts"], "doc_path": "api/", "update_type": "api_docs"}]',
  true
) ON CONFLICT (repository_name) DO NOTHING;

SELECT 'Tables created successfully!' as status;
