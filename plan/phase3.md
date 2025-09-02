# Phase 3: Review & Moderation System

**Duration**: Week 3 (Days 15-21)  
**Goal**: Implement complete contribution workflow with authentication, roles, and moderation

## Overview

The current prototype has no user management, authentication, or review system. Phase 3 will implement the full contribution lifecycle from proposal submission through review and approval, with proper access control and abuse prevention.

## Key Deliverables

### 1. User Authentication & Management
- [ ] GitHub OAuth integration
- [ ] User roles system (user, reviewer, admin)
- [ ] Session management
- [ ] API authentication for MCP
- [ ] User profile and settings

### 2. Proposal System
- [ ] Proposal submission with validation
- [ ] Change types: replace, append, patch
- [ ] Conflict detection (baseDocVersion)
- [ ] Proposal metadata and rationale
- [ ] Draft/submit workflow

### 3. Review Workflow
- [ ] Review queue with filtering
- [ ] Diff visualization
- [ ] Approval/rejection with notes
- [ ] Comment threads on proposals
- [ ] Email notifications (optional)

### 4. Moderation & Quality Control
- [ ] Automated quality checks
- [ ] Markdown linting
- [ ] Link validation
- [ ] Plagiarism detection (basic)
- [ ] Rate limiting per user/IP

### 5. Reputation System (Basic)
- [ ] Track approved proposals
- [ ] Weight votes by reputation
- [ ] Reviewer trust scores
- [ ] Activity tracking

## Technical Implementation

### Authentication Flow

```typescript
// GitHub OAuth setup
import { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Create/update user in database
      await db.user.upsert({
        where: { githubId: profile.id },
        update: { 
          email: profile.email,
          lastLogin: new Date()
        },
        create: {
          githubId: profile.id,
          handle: profile.login,
          email: profile.email,
          role: 'user',
          reputation: 0
        }
      });
      return true;
    }
  }
};
```

### Proposal Management

```typescript
// Proposal submission
async function submitProposal(
  userId: string,
  proposal: ProposalInput
): Promise<ProposalResult> {
  // 1. Validate user permissions
  const user = await validateUser(userId);
  
  // 2. Check rate limits
  await checkRateLimit(userId, 'proposal');
  
  // 3. Validate target document
  const targetDoc = await db.document.findUnique({
    where: { id: proposal.targetDocId }
  });
  
  // 4. Check for conflicts
  if (proposal.baseDocVersion && 
      targetDoc.version !== proposal.baseDocVersion) {
    throw new ConflictError('Document has been updated');
  }
  
  // 5. Run quality checks
  const qualityIssues = await runQualityChecks(proposal.contentMd);
  
  // 6. Create proposal
  const created = await db.proposal.create({
    data: {
      targetDocId: proposal.targetDocId,
      authorId: userId,
      changeKind: proposal.changeKind,
      contentMd: proposal.contentMd,
      baseDocVersion: targetDoc.version,
      rationale: proposal.rationale,
      status: 'pending',
      qualityScore: calculateQualityScore(qualityIssues),
      metadata: {
        qualityIssues,
        wordCount: countWords(proposal.contentMd),
        links: extractLinks(proposal.contentMd)
      }
    }
  });
  
  // 7. Notify reviewers
  await notifyReviewers(created);
  
  return { proposalId: created.id, status: 'pending' };
}
```

### Review System

```typescript
// Review queue implementation
async function getReviewQueue(
  reviewerId: string,
  filters: ReviewFilters
): Promise<ReviewQueueItem[]> {
  // Validate reviewer permissions
  const reviewer = await validateReviewer(reviewerId);
  
  const proposals = await db.proposal.findMany({
    where: {
      status: 'pending',
      projectId: filters.projectId,
      topicId: filters.topicId,
      ...(filters.authorId && { authorId: filters.authorId })
    },
    include: {
      author: true,
      targetDoc: {
        include: {
          topic: true
        }
      },
      votes: true,
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    },
    orderBy: [
      { qualityScore: 'desc' },
      { createdAt: 'asc' }
    ],
    take: filters.limit || 10
  });
  
  // Generate diffs
  return Promise.all(
    proposals.map(async (proposal) => ({
      ...proposal,
      diff: await generateDiff(
        proposal.targetDoc.contentMd,
        proposal.contentMd,
        proposal.changeKind
      ),
      votesSummary: summarizeVotes(proposal.votes)
    }))
  );
}

// Approval flow
async function approveProposal(
  reviewerId: string,
  proposalId: string,
  note?: string
): Promise<ApprovalResult> {
  const reviewer = await validateReviewer(reviewerId);
  
  // Start transaction
  return await db.$transaction(async (tx) => {
    // 1. Lock proposal
    const proposal = await tx.proposal.update({
      where: { id: proposalId },
      data: { status: 'approved' }
    });
    
    // 2. Create new document version
    const newVersion = proposal.targetDoc.version + 1;
    const newDoc = await tx.document.create({
      data: {
        topicId: proposal.targetDoc.topicId,
        version: newVersion,
        title: proposal.targetDoc.title,
        contentMd: applyChange(
          proposal.targetDoc.contentMd,
          proposal.contentMd,
          proposal.changeKind
        )
      }
    });
    
    // 3. Create revision record
    await tx.revision.create({
      data: {
        docId: newDoc.id,
        version: newVersion,
        contentMd: newDoc.contentMd,
        authorId: proposal.authorId,
        diff: proposal.diff
      }
    });
    
    // 4. Update author reputation
    await tx.user.update({
      where: { id: proposal.authorId },
      data: {
        reputation: { increment: 10 }
      }
    });
    
    // 5. Trigger re-indexing
    await scheduleReindex(newDoc.id);
    
    return {
      mergedRevisionId: newDoc.id,
      newDocVersion: newVersion,
      published: true
    };
  });
}
```

### Quality Checks

```typescript
interface QualityCheck {
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: (content: string) => Promise<QualityIssue[]>;
}

const qualityChecks: QualityCheck[] = [
  {
    name: 'markdown-lint',
    severity: 'warning',
    check: async (content) => {
      const linter = await markdownlint.promises.markdownlint({
        strings: { content },
        config: markdownlintConfig
      });
      return Object.entries(linter.content).map(([line, errors]) => ({
        line: parseInt(line),
        message: errors.join(', '),
        severity: 'warning'
      }));
    }
  },
  {
    name: 'broken-links',
    severity: 'error',
    check: async (content) => {
      const links = extractLinks(content);
      const broken = await checkLinks(links);
      return broken.map(link => ({
        message: `Broken link: ${link}`,
        severity: 'error'
      }));
    }
  },
  {
    name: 'code-blocks',
    severity: 'info',
    check: async (content) => {
      const blocks = extractCodeBlocks(content);
      const issues = [];
      for (const block of blocks) {
        if (!block.language) {
          issues.push({
            message: 'Code block missing language identifier',
            line: block.line,
            severity: 'info'
          });
        }
      }
      return issues;
    }
  }
];
```

### Rate Limiting

```typescript
// Rate limiter implementation
class RateLimiter {
  private limits = {
    proposal: { window: 3600, max: 5 }, // 5 per hour
    comment: { window: 300, max: 10 },  // 10 per 5 min
    vote: { window: 60, max: 20 }       // 20 per minute
  };
  
  async checkLimit(
    userId: string,
    action: keyof typeof this.limits
  ): Promise<void> {
    const key = `rate:${action}:${userId}`;
    const limit = this.limits[action];
    
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, limit.window);
    }
    
    if (count > limit.max) {
      throw new RateLimitError(
        `Rate limit exceeded: ${limit.max} per ${limit.window}s`
      );
    }
  }
}
```

## Daily Milestones

### Day 15-16: Authentication
- GitHub OAuth setup
- User model and roles
- Session management
- Protected API routes

### Day 17-18: Proposal System
- Submission endpoints
- Validation logic
- Conflict detection
- Quality checks

### Day 19-20: Review Workflow
- Review queue
- Approval/rejection flow
- Comment system
- Notifications

### Day 21: Integration & Testing
- End-to-end testing
- Rate limiting
- Performance optimization
- Documentation

## Acceptance Criteria

1. **Authentication**
   - GitHub login works
   - Roles properly enforced
   - Sessions persist

2. **Proposals**
   - Can submit all change types
   - Quality checks run
   - Conflicts detected

3. **Reviews**
   - Queue shows pending items
   - Approval creates new version
   - Comments work

4. **Security**
   - Rate limits enforced
   - Permissions checked
   - No unauthorized access

## Configuration

```env
# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Rate Limits
RATE_LIMIT_PROPOSALS_PER_HOUR=5
RATE_LIMIT_COMMENTS_PER_5MIN=10

# Quality Checks
ENABLE_PLAGIARISM_CHECK=false
MARKDOWN_LINT_CONFIG=.markdownlint.json
```

## Success Metrics

- ✅ Full auth flow working
- ✅ 10+ test proposals submitted
- ✅ 5+ proposals approved
- ✅ Rate limits prevent abuse
- ✅ <500ms response times

## Output

By end of Phase 3:
- Complete review system
- Secure authentication
- Quality control pipeline
- Ready for production deployment