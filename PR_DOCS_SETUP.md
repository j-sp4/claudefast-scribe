# GitHub PR Documentation Update System - Setup Guide

This system automatically updates documentation when pull requests are created on GitHub. It analyzes PR content using AI and updates target documentation repositories, submodules, or folders.

## 🚀 Quick Start

### 1. Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here

# Anthropic API (for PR analysis)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Install Dependencies

```bash
cd server
npm install
```

The system has been configured with the required dependencies:
- `@octokit/rest` - GitHub API client
- `simple-git` - Git operations
- `@anthropic-ai/sdk` - AI analysis

### 3. Database Setup

Run the database migration to create the required tables:

```bash
# Apply the migration in Supabase
# The migration file is at: server/supabase/migrations/create_pr_docs_tables.sql
```

Or run it manually in your Supabase SQL editor.

### 4. GitHub Setup

#### Create a GitHub App or Personal Access Token

**Option A: GitHub App (Recommended)**
1. Go to GitHub Settings > Developer settings > GitHub Apps
2. Click "New GitHub App"
3. Configure:
   - **App name**: Your App Name
   - **Homepage URL**: Your domain
   - **Webhook URL**: `https://yourdomain.com/api/github/webhook`
   - **Webhook secret**: Generate a secure secret
   - **Permissions**:
     - Repository contents: Read & Write
     - Pull requests: Read
     - Issues: Read
     - Metadata: Read
4. Install the app on your repositories

**Option B: Personal Access Token**
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate new token with these scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)

#### Configure Webhook

If using a Personal Access Token, set up webhooks manually:
1. Go to your repository Settings > Webhooks
2. Add webhook:
   - **Payload URL**: `https://yourdomain.com/api/github/webhook`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret
   - **Events**: Select "Pull requests"

## 📋 Configuration

### Repository Configuration

1. **Access Admin Panel**: Navigate to `/admin/pr-docs` (admin access required)

2. **Add Repository**: Enter repository name in format `owner/repo-name`

3. **Default Configuration**: The system creates a default configuration with:
   - **Source patterns**: Files to watch for changes
     - `src/**/*.ts`, `lib/**/*.ts` - TypeScript files
     - `README.md`, `docs/**/*.md` - Documentation files
     - `package.json` - Dependencies
   
   - **Targets**: Where to update documentation
     - Type: `folder` (creates PR in same repo)
     - Path: `docs/`
     - Branch: `docs-updates`
   
   - **Rules**: How to map changes to documentation
     - API files → `api/` documentation
     - README/docs → `guides/` documentation
     - package.json → changelog

### Custom Configuration

You can customize the configuration through the admin panel or directly in the database:

```typescript
interface RepositoryConfig {
  repository_name: string;
  source_patterns: string[]; // Glob patterns for files to watch
  targets: Array<{
    type: 'repository' | 'submodule' | 'folder';
    owner?: string;        // For external repositories
    repo?: string;         // For external repositories
    path: string;          // Target path for documentation
    branch?: string;       // Target branch
  }>;
  rules: Array<{
    patterns: string[];    // File patterns that trigger this rule
    doc_path: string;      // Where to put the documentation
    update_type: string;   // Type of documentation update
  }>;
  enabled: boolean;
}
```

## 🔄 How It Works

### 1. PR Event Trigger
- GitHub sends webhook when PR is opened/updated
- System verifies webhook signature
- Event is queued for processing

### 2. AI Analysis
- Fetches PR files and changes
- Analyzes with Claude AI to determine if docs need updates
- Generates specific documentation updates with reasoning

### 3. Documentation Updates
- **Repository target**: Creates commits in external repo
- **Folder target**: Creates new branch and PR in same repo
- **Submodule target**: Updates submodule repository

### 4. Tracking & Monitoring
- All processing is logged in `pr_processing_logs` table
- Documentation updates tracked in `documentation_updates` table
- Admin panel shows status and results

## 🛠️ API Endpoints

### Webhook Endpoint
- `POST /api/github/webhook` - Receives GitHub webhook events

### Admin Endpoints (Require admin role)
- `GET /api/admin/repository-configs` - List repository configurations
- `POST /api/admin/repository-configs` - Create/update repository configuration
- `GET /api/admin/pr-logs` - View PR processing logs

## 📊 Monitoring

### Admin Dashboard
Access `/admin/pr-docs` to:
- View repository configurations
- Enable/disable repositories
- Monitor PR processing logs
- See success/failure rates

### Database Tables
- `repository_configs` - Repository configuration
- `pr_processing_logs` - PR processing history
- `documentation_updates` - Individual update tracking
- `webhook_events` - Raw webhook events (debugging)

## 🔐 Security

### Authentication
- Uses existing Supabase auth system
- Admin role required for configuration management
- Reviewer role can view processing logs

### Webhook Security
- Verifies GitHub webhook signatures
- Uses timing-safe comparison
- Logs invalid attempts

### API Security
- All admin endpoints require authentication
- Row Level Security (RLS) enabled on all tables
- Service role used for webhook processing

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not received**
   - Check webhook URL is accessible
   - Verify webhook secret matches
   - Check GitHub webhook delivery logs

2. **PR processing fails**
   - Check Anthropic API key is valid
   - Verify GitHub token has required permissions
   - Check repository configuration is enabled

3. **Documentation update fails**
   - Verify target repository permissions
   - Check branch protection rules
   - Review error logs in admin panel

### Debug Information

Check these logs:
- Server console output
- Supabase logs
- GitHub webhook delivery attempts
- Admin panel processing logs

## 📈 Scaling Considerations

### Performance
- PR analysis is async (doesn't block webhook response)
- Uses Supabase for reliable queuing
- AI analysis cached where possible

### Rate Limits
- Respects GitHub API rate limits
- Anthropic API usage monitored
- Configurable processing delays

### Multi-Repository Support
- Each repository has independent configuration
- Supports multiple target repositories
- Bulk configuration management via admin panel

## 🔄 Deployment

### Production Checklist
- [ ] Set all environment variables
- [ ] Run database migrations
- [ ] Configure GitHub webhooks
- [ ] Test with a sample PR
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy

### Scaling Options
- Use Redis for better queuing (future enhancement)
- Add background job processing
- Implement webhook retry logic
- Add metrics and alerting

## 📝 Example Workflow

1. **Developer creates PR** with API changes in `src/api/users.ts`
2. **GitHub sends webhook** to your server
3. **System analyzes PR** using Claude AI
4. **AI determines** documentation updates needed for user API
5. **System generates** updated API documentation
6. **Creates PR** in docs repository or same repo
7. **Reviewer approves** documentation PR
8. **Documentation stays in sync** with code changes

This system ensures your documentation never falls behind your code changes!
