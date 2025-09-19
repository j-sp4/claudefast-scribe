# GitHub Token Architecture - Flexible Authentication

## 🎯 Problem Solved

You're absolutely right that GitHub tokens should be configurable per repository! The system now supports **three levels of token configuration** with intelligent fallbacks.

## 🏗️ Token Hierarchy (Priority Order)

```
1. Target-specific token (highest priority)
   ↓ (fallback if not set)
2. Repository-specific token  
   ↓ (fallback if not set)
3. Global environment token (GITHUB_TOKEN)
```

## 📊 Configuration Options

### Option 1: Global Token (Simplest)
**Best for**: Single organization, simple setup

```bash
# .env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pros**: 
- ✅ Simple setup
- ✅ Works immediately
- ✅ Good for development

**Cons**: 
- ❌ Single point of failure
- ❌ Broad permissions needed
- ❌ Not scalable across orgs

### Option 2: Per-Repository Tokens (Recommended)
**Best for**: Multiple repositories, different organizations

```json
{
  "repository_name": "owner/repo-name",
  "github_token": "ghp_repo_specific_token_here",
  "targets": [...],
  "rules": [...]
}
```

**Pros**:
- ✅ Granular permissions
- ✅ Better security
- ✅ Scalable across organizations
- ✅ Independent token rotation

**Cons**:
- ❌ More complex setup
- ❌ More tokens to manage

### Option 3: Per-Target Tokens (Most Granular)
**Best for**: Complex setups with multiple target repositories

```json
{
  "repository_name": "owner/repo-name",
  "targets": [
    {
      "type": "repository",
      "owner": "docs-org",
      "repo": "documentation",
      "auth_token": "ghp_docs_specific_token_here"
    },
    {
      "type": "folder",
      "path": "docs/",
      "auth_token": "ghp_main_repo_token_here"
    }
  ]
}
```

**Pros**:
- ✅ Maximum security
- ✅ Minimal required permissions per token
- ✅ Fine-grained access control

**Cons**:
- ❌ Most complex setup
- ❌ Many tokens to manage

## 🚀 Recommended Setup Approaches

### Approach A: Start Simple, Scale Up

1. **Development**: Use global `GITHUB_TOKEN`
2. **Production**: Add per-repository tokens as needed
3. **Enterprise**: Use per-target tokens for maximum security

### Approach B: GitHub App (Production Recommended)

Instead of personal access tokens, use a GitHub App:

```bash
# .env.local
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
GITHUB_APP_INSTALLATION_ID=12345678
```

**Benefits**:
- ✅ Automatic token management
- ✅ Granular repository permissions
- ✅ Better audit trail
- ✅ No personal token management

## 🔧 Implementation Details

### Code Changes Made

1. **Enhanced RepositoryConfig**:
   ```typescript
   interface RepositoryConfig {
     // ... existing fields
     github_token?: string; // NEW: Repository-specific token
   }
   ```

2. **Enhanced TargetConfig**:
   ```typescript
   interface TargetConfig {
     // ... existing fields  
     auth_token?: string; // Target-specific token
   }
   ```

3. **Smart Token Resolution**:
   ```typescript
   function createGitHubClient(token?: string): Octokit {
     const authToken = token || process.env.GITHUB_TOKEN;
     if (!authToken) {
       throw new Error('No GitHub token available');
     }
     return new Octokit({ auth: authToken });
   }
   ```

4. **Database Schema Updated**:
   ```sql
   ALTER TABLE repository_configs 
   ADD COLUMN github_token text; -- Repository-specific token
   ```

## 🎛️ Admin Panel Integration

The admin panel now supports:

- **Global fallback**: Uses `GITHUB_TOKEN` environment variable
- **Per-repository tokens**: Set in repository configuration
- **Token validation**: Tests token permissions before saving
- **Security**: Tokens are stored encrypted in database

### Usage in Admin Panel

1. **Add Repository** without token → Uses global `GITHUB_TOKEN`
2. **Add Repository** with token → Uses repository-specific token
3. **Configure targets** with tokens → Uses target-specific tokens

## 🔐 Security Best Practices

### Token Permissions (Minimal Required)

**For source repository analysis**:
- `Contents: Read` - Read PR files
- `Pull requests: Read` - Access PR metadata
- `Metadata: Read` - Repository information

**For target repository updates**:
- `Contents: Write` - Create/update documentation files
- `Pull requests: Write` - Create documentation PRs

### Token Storage
- ✅ Encrypted in database
- ✅ Never logged in plaintext
- ✅ Masked in admin interface
- ✅ Rotatable without system restart

## 📝 Configuration Examples

### Example 1: Simple Setup (Global Token)
```bash
# .env.local - Just set this
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Example 2: Multi-Org Setup (Per-Repository Tokens)
```json
// Repository Config 1
{
  "repository_name": "company-a/main-app",
  "github_token": "ghp_company_a_token_here",
  "targets": [{"type": "folder", "path": "docs/"}]
}

// Repository Config 2  
{
  "repository_name": "company-b/other-app",
  "github_token": "ghp_company_b_token_here", 
  "targets": [{"type": "folder", "path": "docs/"}]
}
```

### Example 3: Complex Setup (Per-Target Tokens)
```json
{
  "repository_name": "myorg/main-app",
  "targets": [
    {
      "type": "repository",
      "owner": "myorg",
      "repo": "public-docs",
      "auth_token": "ghp_public_docs_token"
    },
    {
      "type": "repository", 
      "owner": "internal-org",
      "repo": "private-docs",
      "auth_token": "ghp_private_docs_token"
    }
  ]
}
```

## 🎉 What This Means For You

**You now have complete flexibility**:

1. **Start simple**: Just set `GITHUB_TOKEN` environment variable
2. **Scale gradually**: Add per-repository tokens as needed
3. **Maximum security**: Use per-target tokens for sensitive setups

**No breaking changes**: Existing global token setup still works perfectly!

The system intelligently chooses the most specific token available, falling back gracefully to less specific options.

## 🚀 Next Steps

1. **For now**: You can use just the global `GITHUB_TOKEN` to get started
2. **Later**: Add per-repository tokens via the admin panel as you scale
3. **Production**: Consider GitHub Apps for the best security and management

This gives you the flexibility to start simple and scale the authentication architecture as your needs grow!
