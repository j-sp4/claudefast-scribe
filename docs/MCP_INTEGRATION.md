# MCP Integration Guide for Scribe

## Overview

Scribe MCP enables AI assistants like Claude Code and Cursor to interact with your documentation system directly through the Model Context Protocol (MCP). This guide will help you integrate Scribe MCP into your AI development workflow.

## Prerequisites

- Active Scribe MCP account
- Claude Code or Cursor IDE
- API credentials from your Scribe dashboard

## Quick Start

### 1. Claude Code Integration

#### Step 1: Configure MCP Server

Add Scribe MCP to your Claude Code configuration:

```json
// .claude/mcp_servers.json
{
  "servers": {
    "scribe": {
      "url": "https://scribe-mcp.vercel.app/api/mcp",
      "auth": {
        "type": "bearer",
        "token": "your-api-token"
      },
      "capabilities": {
        "tools": true,
        "resources": false
      }
    }
  }
}
```

#### Step 2: Test Connection

In Claude Code, run:
```
/mcp list-tools
```

You should see all available Scribe tools listed.

#### Step 3: Start Using

Example commands in Claude Code:

```
# Search for documentation
/mcp scribe search_docs query="authentication setup"

# Read specific documentation
/mcp scribe read_doc topicId="auth-setup-uuid"

# Propose an update
/mcp scribe propose_update topicId="auth-setup-uuid" title="Add OAuth section" contentMd="# OAuth Setup..." changeKind="append" rationale="Missing OAuth documentation"
```

### 2. Cursor IDE Integration

#### Step 1: Install MCP Extension

1. Open Cursor Settings
2. Navigate to Extensions
3. Search for "MCP Client"
4. Install and enable

#### Step 2: Configure Connection

```json
// .cursor/settings.json
{
  "mcp.servers": [
    {
      "name": "scribe",
      "endpoint": "https://scribe-mcp.vercel.app/api/mcp",
      "authentication": {
        "type": "bearer",
        "token": "${env:SCRIBE_API_TOKEN}"
      }
    }
  ]
}
```

#### Step 3: Set Environment Variable

```bash
export SCRIBE_API_TOKEN="your-api-token"
```

#### Step 4: Use in Cursor

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) and type:
- "MCP: Search Documentation"
- "MCP: Read Document"
- "MCP: Propose Update"

## Available MCP Tools

### Discovery Tools

#### `list_projects`
Browse all documentation projects.

```typescript
await mcp.call('list_projects', {
  search: 'api',  // optional
  limit: 20       // optional
});
```

#### `list_topics`
Get topics within a project.

```typescript
await mcp.call('list_topics', {
  projectSlug: 'my-project',
  parentTopicId: 'parent-uuid'  // optional
});
```

### Search Tools

#### `search_docs`
Full-text search across documentation.

```typescript
await mcp.call('search_docs', {
  query: 'authentication OAuth',
  projectSlug: 'my-project',  // optional
  limit: 10                   // optional
});
```

#### `semantic_search`
AI-powered semantic search.

```typescript
await mcp.call('semantic_search', {
  query: 'How do I set up user authentication?',
  threshold: 0.7,  // minimum similarity
  limit: 10
});
```

#### `hybrid_search`
Combined full-text and semantic search.

```typescript
await mcp.call('hybrid_search', {
  query: 'OAuth setup guide',
  ftsWeight: 0.4,      // weight for keyword search
  semanticWeight: 0.6  // weight for semantic search
});
```

### Reading Tools

#### `read_doc`
Retrieve specific documentation.

```typescript
await mcp.call('read_doc', {
  topicId: 'topic-uuid',
  version: 3  // optional, defaults to latest
});
```

#### `get_best_doc`
Get most relevant doc based on context.

```typescript
await mcp.call('get_best_doc', {
  context: 'Setting up OAuth with GitHub',
  projectSlug: 'auth-docs'  // optional
});
```

### Contribution Tools

#### `propose_update`
Submit documentation improvements.

```typescript
await mcp.call('propose_update', {
  topicId: 'topic-uuid',
  title: 'Add TypeScript examples',
  contentMd: '# Updated content with TypeScript...',
  changeKind: 'append',  // or 'replace', 'prepend'
  rationale: 'Added missing TypeScript examples',
  baseDocVersion: 3  // for conflict detection
});
```

#### `review_queue`
View pending proposals (reviewers only).

```typescript
await mcp.call('review_queue', {
  status: 'pending',
  limit: 10
});
```

#### `approve_proposal`
Approve a proposal (reviewers only).

```typescript
await mcp.call('approve_proposal', {
  proposalId: 'proposal-uuid',
  reviewNotes: 'Great addition!'
});
```

## Best Practices

### 1. Search Before Creating

Always search existing documentation before proposing new content:

```javascript
// Good practice
const existing = await mcp.call('search_docs', {
  query: 'OAuth setup'
});

if (existing.results.length === 0) {
  // Create new documentation
} else {
  // Update existing
}
```

### 2. Use Semantic Search for Questions

When looking for answers to questions, use semantic search:

```javascript
// Natural language questions
const answer = await mcp.call('semantic_search', {
  query: 'How do I configure rate limiting?',
  threshold: 0.8
});
```

### 3. Version Tracking

Always include `baseDocVersion` to prevent conflicts:

```javascript
const doc = await mcp.call('read_doc', { topicId: 'uuid' });

await mcp.call('propose_update', {
  topicId: 'uuid',
  baseDocVersion: doc.document.version,
  // ... other fields
});
```

### 4. Quality Guidelines

Ensure proposals meet quality standards:
- Minimum 50 characters
- Proper markdown formatting
- Code blocks with language tags
- No broken links
- Clear, descriptive titles

## Common Use Cases

### 1. Documentation Search Assistant

```javascript
async function findRelevantDocs(question) {
  // Try semantic search first
  const semantic = await mcp.call('semantic_search', {
    query: question,
    threshold: 0.8
  });
  
  if (semantic.results.length === 0) {
    // Fall back to keyword search
    const keywords = extractKeywords(question);
    return await mcp.call('search_docs', {
      query: keywords.join(' ')
    });
  }
  
  return semantic;
}
```

### 2. Auto-Documentation from Code

```javascript
async function documentFunction(functionCode, projectSlug) {
  // Generate documentation
  const docs = generateDocsFromCode(functionCode);
  
  // Check if already documented
  const existing = await mcp.call('search_docs', {
    query: functionName,
    projectSlug
  });
  
  if (existing.results.length > 0) {
    // Update existing
    await mcp.call('propose_update', {
      topicId: existing.results[0].topicId,
      contentMd: docs,
      changeKind: 'replace',
      rationale: 'Updated from source code'
    });
  } else {
    // Create new topic
    await mcp.call('propose_update', {
      projectSlug,
      title: functionName,
      contentMd: docs,
      changeKind: 'create',
      rationale: 'Auto-generated from code'
    });
  }
}
```

### 3. Documentation Validation

```javascript
async function validateDocs(projectSlug) {
  const topics = await mcp.call('list_topics', { projectSlug });
  
  for (const topic of topics.topics) {
    const doc = await mcp.call('read_doc', { 
      topicId: topic.id 
    });
    
    // Check for issues
    const issues = [];
    
    // Check for TODOs
    if (doc.contentMd.includes('TODO')) {
      issues.push('Contains TODO items');
    }
    
    // Check for broken links
    const links = extractLinks(doc.contentMd);
    for (const link of links) {
      if (!await isValidLink(link)) {
        issues.push(`Broken link: ${link}`);
      }
    }
    
    if (issues.length > 0) {
      console.log(`${topic.title}: ${issues.join(', ')}`);
    }
  }
}
```

## Troubleshooting

### Connection Issues

If MCP connection fails:

1. Verify API token is valid
2. Check network connectivity
3. Ensure server URL is correct
4. Review rate limits

### Rate Limiting

Respect rate limits to avoid 429 errors:

| Action | Limit | Window |
|--------|-------|--------|
| Proposals | 5 | 1 hour |
| Searches | 100 | 1 minute |
| Reads | 100 | 1 minute |

### Quality Check Failures

If proposals are rejected for quality:

1. Check minimum length (50 chars)
2. Validate markdown syntax
3. Add language tags to code blocks
4. Fix any broken links
5. Remove TODO/FIXME comments

## Advanced Configuration

### Custom Headers

Add custom headers for tracking:

```json
{
  "servers": {
    "scribe": {
      "url": "https://scribe-mcp.vercel.app/api/mcp",
      "headers": {
        "X-Client-Version": "1.0.0",
        "X-Project-Id": "my-project"
      }
    }
  }
}
```

### Timeout Configuration

Adjust timeouts for slow connections:

```json
{
  "servers": {
    "scribe": {
      "url": "https://scribe-mcp.vercel.app/api/mcp",
      "timeout": 30000  // 30 seconds
    }
  }
}
```

### Retry Logic

Implement retry for reliability:

```javascript
async function callWithRetry(tool, params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await mcp.call(tool, params);
    } catch (error) {
      if (error.code === 'RATE_LIMITED' && i < maxRetries - 1) {
        // Wait and retry
        await sleep(error.retryAfter * 1000);
      } else {
        throw error;
      }
    }
  }
}
```

## Security Best Practices

1. **Never commit API tokens** - Use environment variables
2. **Rotate tokens regularly** - Monthly rotation recommended
3. **Use project-specific tokens** - Limit scope
4. **Monitor usage** - Check dashboard for anomalies
5. **Report suspicious activity** - Contact support immediately

## Support Resources

- **Documentation**: https://docs.scribe-mcp.com
- **API Reference**: https://scribe-mcp.com/api/docs
- **GitHub**: https://github.com/scribe-mcp
- **Discord**: https://discord.gg/scribe-mcp
- **Email**: support@scribe-mcp.com

## FAQ

**Q: Can I use Scribe MCP with other AI assistants?**
A: Yes! Any MCP-compatible client can connect to Scribe.

**Q: How do I get reviewer permissions?**
A: Contact your organization admin or email support.

**Q: What's the difference between semantic and hybrid search?**
A: Semantic uses AI embeddings for meaning, hybrid combines this with keyword matching.

**Q: Can I bulk import existing documentation?**
A: Yes, use the bulk import API or contact support for assistance.

**Q: How are conflicts handled?**
A: Use `baseDocVersion` for optimistic locking. Conflicts return 409 status.

## Next Steps

1. Set up your development environment
2. Explore available tools with `/mcp list-tools`
3. Try searching your documentation
4. Make your first contribution
5. Join our Discord community

Happy documenting! 📚