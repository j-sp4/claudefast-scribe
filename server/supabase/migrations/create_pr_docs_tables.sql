-- Tables for GitHub PR documentation update system

-- Repository configurations for documentation updates
CREATE TABLE IF NOT EXISTS repository_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_name text NOT NULL UNIQUE,
  source_patterns jsonb NOT NULL DEFAULT '[]',
  targets jsonb NOT NULL DEFAULT '[]',
  rules jsonb NOT NULL DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT true,
  github_token text, -- Optional repository-specific GitHub token (encrypted)
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
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'error', 'skipped')),
  started_at timestamp NOT NULL,
  completed_at timestamp,
  analysis jsonb,
  results jsonb,
  error_message text,
  created_at timestamp DEFAULT now() NOT NULL,
  UNIQUE(repository_name, pr_number)
);

-- Documentation updates tracking
CREATE TABLE IF NOT EXISTS documentation_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_name text NOT NULL,
  pr_number integer NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('repository', 'submodule', 'folder')),
  target_path text NOT NULL,
  update_type text NOT NULL CHECK (update_type IN ('create', 'update', 'append')),
  commit_sha text,
  pull_request_url text,
  success boolean NOT NULL,
  error_message text,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Webhook events log (for debugging)
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  repository_name text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_repository_configs_name ON repository_configs(repository_name);
CREATE INDEX IF NOT EXISTS idx_repository_configs_enabled ON repository_configs(enabled);

CREATE INDEX IF NOT EXISTS idx_pr_logs_repo_pr ON pr_processing_logs(repository_name, pr_number);
CREATE INDEX IF NOT EXISTS idx_pr_logs_status ON pr_processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_pr_logs_created_at ON pr_processing_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_doc_updates_repo_pr ON documentation_updates(repository_name, pr_number);
CREATE INDEX IF NOT EXISTS idx_doc_updates_success ON documentation_updates(success);
CREATE INDEX IF NOT EXISTS idx_doc_updates_created_at ON documentation_updates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for repository_configs
CREATE TRIGGER update_repository_configs_updated_at 
  BEFORE UPDATE ON repository_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration for the current project
INSERT INTO repository_configs (
  repository_name,
  source_patterns,
  targets,
  rules,
  enabled
) VALUES (
  'maxmartinezruts/claudefast-scribe',
  '["src/**/*.ts", "server/**/*.ts", "lib/**/*.ts", "README.md", "docs/**/*.md", "package.json"]',
  '[
    {
      "type": "folder",
      "path": "docs/",
      "branch": "docs-updates"
    }
  ]',
  '[
    {
      "patterns": ["server/**/*.ts", "lib/**/*.ts"],
      "doc_path": "api/",
      "update_type": "api_docs"
    },
    {
      "patterns": ["README.md", "docs/**/*.md"],
      "doc_path": "guides/",
      "update_type": "user_docs"
    },
    {
      "patterns": ["package.json", "CHANGELOG.md"],
      "doc_path": "",
      "update_type": "changelog"
    }
  ]',
  true
) ON CONFLICT (repository_name) DO UPDATE SET
  source_patterns = EXCLUDED.source_patterns,
  targets = EXCLUDED.targets,
  rules = EXCLUDED.rules,
  enabled = EXCLUDED.enabled,
  updated_at = now();

-- Add RLS policies (Row Level Security)
ALTER TABLE repository_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all records
CREATE POLICY "Allow authenticated read on repository_configs" ON repository_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on pr_processing_logs" ON pr_processing_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on documentation_updates" ON documentation_updates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on webhook_events" ON webhook_events
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access (for webhook processing)
CREATE POLICY "Allow service role full access on repository_configs" ON repository_configs
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access on pr_processing_logs" ON pr_processing_logs
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access on documentation_updates" ON documentation_updates
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access on webhook_events" ON webhook_events
  FOR ALL TO service_role USING (true);

-- Allow admins to manage repository configs
CREATE POLICY "Allow admin manage repository_configs" ON repository_configs
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
