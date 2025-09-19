# Phase 3: Review & Moderation System 🚧

**Status**: IN PROGRESS
**Started**: 2025-09-17
**Target**: Week 3 (Days 15-21)
**Goal**: Implement complete contribution workflow with authentication, roles, and moderation

## Overview

Building a comprehensive review and moderation system with user authentication, role-based access control, and quality checks for documentation contributions.

## Key Technology Decisions

### Authentication Stack
- **Primary Auth**: Supabase Auth (already configured)
- **OAuth Provider**: GitHub OAuth (to be configured in Supabase)
- **Session Management**: Supabase SSR with cookies
- **Role System**: user, reviewer, admin roles in database

### Review Infrastructure
- **Quality Checks**: Custom markdown validation
- **Rate Limiting**: In-memory rate limiter (production: Redis)
- **Proposal System**: Database-backed with version tracking
- **Approval Workflow**: Transactional updates with new document versions

## Progress Tracker

### 1. User Authentication & Management ✅
- [x] Login page with email/GitHub OAuth
- [x] Signup page with user registration
- [x] OAuth callback handler
- [x] Email verification page
- [x] Auth context provider with hooks
- [x] Logout API endpoint
- [x] User role system in database
- [x] Session management via Supabase

### 2. Proposal System ✅
- [x] Proposal submission API endpoint
- [x] Change types: replace, append, prepend
- [x] Conflict detection with baseDocVersion
- [x] Proposal validation with Zod
- [x] Integration with quality checks

### 3. Review Workflow ✅
- [x] Review API for approval/rejection
- [x] Role-based permissions (reviewer/admin only)
- [x] Automatic document versioning on approval
- [x] Revision tracking
- [x] Reputation system updates
- [ ] Review queue UI
- [ ] Diff visualization
- [ ] Comment system

### 4. Moderation & Quality Control ✅
- [x] Automated quality checks for markdown
- [x] Code block validation
- [x] Link extraction and validation
- [x] Word count and content analysis
- [x] Quality scoring system
- [x] TODO/FIXME detection

### 5. Rate Limiting ✅
- [x] In-memory rate limiter implementation
- [x] Configurable limits per action type
- [x] Automatic cleanup of expired entries
- [x] Rate limit headers in responses
- [x] Integration with proposal API

## Implementation Details

### Files Created

#### Authentication
- `/app/auth/login/page.tsx` - Login page with GitHub OAuth
- `/app/auth/signup/page.tsx` - User registration page
- `/app/auth/callback/route.ts` - OAuth callback handler
- `/app/auth/verify-email/page.tsx` - Email verification
- `/contexts/AuthContext.tsx` - React context for auth state
- `/app/api/auth/signout/route.ts` - Logout endpoint

#### Proposal & Review System
- `/app/api/proposals/route.ts` - Proposal submission and listing
- `/app/api/proposals/[id]/review/route.ts` - Approval/rejection endpoint
- `/lib/quality-checks.ts` - Markdown validation utilities
- `/lib/rate-limiter.ts` - Rate limiting implementation

### API Endpoints

1. **POST /api/proposals** - Submit new proposal
   - Rate limited: 5 per hour
   - Quality checks enforced
   - Conflict detection

2. **GET /api/proposals** - List proposals with filters
   - Filter by status, author, target doc
   - Includes author and document info

3. **POST /api/proposals/[id]/review** - Approve/reject proposal
   - Reviewer/admin only
   - Creates new document version
   - Updates reputation

4. **POST /api/auth/signout** - Sign out user

## Next Actions

1. **GitHub OAuth Setup**
   - Configure GitHub app in Supabase dashboard
   - Add client ID and secret
   - Test OAuth flow

2. **Review Queue UI**
   - Create `/app/review` page
   - Show pending proposals
   - Add diff visualization
   - Implement approval/rejection UI

3. **Testing**
   - Test authentication flows
   - Submit test proposals
   - Verify quality checks
   - Test rate limiting

## Technical Notes

### Quality Check Rules
- Minimum content length: 50 characters
- Code blocks must have language identifiers
- Links must be valid
- No unclosed code blocks
- Warning for TODO/FIXME comments
- Line length recommendation: 120 chars

### Rate Limits
- Proposals: 5 per hour
- Comments: 20 per 5 minutes
- Votes: 30 per minute
- General API: 100 per minute

### Database Changes
- Users table with role enum
- Proposals table with quality scores
- Revisions tracking all changes
- Reputation system in users table

## Success Metrics

- ✅ Authentication working with Supabase
- ✅ Proposals can be submitted with validation
- ✅ Quality checks prevent low-quality content
- ✅ Rate limiting prevents abuse
- ✅ Review API creates proper versions
- ⏳ GitHub OAuth configured
- ⏳ Review queue UI complete
- ⏳ 10+ test proposals processed