# Scribe MCP Beta Development Plan

## Executive Summary

Scribe MCP is a crowd-sourced documentation system that won $10,000 at the YC hackathon. The current prototype demonstrates the concept but requires significant development to reach beta readiness. This plan outlines a 4-phase approach to deliver a production-ready system within 1 month.

## Current State Analysis

### What Exists (Hackathon Prototype)
- **Basic MCP Server**: Next.js app with 2 simple tools
- **File-based Storage**: Single KNOWLEDGE.md file
- **AI Integration**: Uses Claude for Q&A search and duplicate detection
- **Sync Script**: Watches file changes and triggers validation
- **Documentation Site**: Basic Next.js docs structure (empty)

### Critical Limitations
1. **No Database**: Uses a single markdown file - won't scale
2. **Missing 90% of MCP Tools**: Only has ask_questions and create_qa
3. **No Multi-Project Support**: Hardcoded to single codebase
4. **No User Management**: No auth, roles, or permissions
5. **No Review System**: No moderation workflow
6. **No Version Control**: No revision tracking or rollback
7. **No Search Infrastructure**: Only AI-based Q&A lookup
8. **Model Issues**: References non-existent Claude model
9. **No Rate Limiting**: Vulnerable to abuse
10. **No Production Infrastructure**: Local-only, no cloud deployment

## Beta Requirements

Based on customer demand and the MVP specification, the beta must deliver:

### Core Features
- ✅ Multi-project documentation management
- ✅ Full MCP tool suite (read, search, propose, review, approve)
- ✅ Database-backed storage with versioning
- ✅ Context-first search (leveraging large context windows)
- ✅ Review and moderation workflow
- ✅ User authentication and roles
- ✅ Rate limiting and abuse protection
- ✅ Cloud deployment ready

### Integration Requirements
- ✅ Support for Claude Code (existing)
- ✅ Support for Cursor
- ✅ Support for other MCP-compatible tools
- ✅ Integration with documentation platforms (Readme, Mintlify, etc.)

## Development Timeline (4 Weeks)

### Phase 1: Core MCP Tools & Supabase (Week 1)
**Goal**: Implement the full MCP tool suite with Supabase for persistence and auth

Key Deliverables:
- Supabase database schema with RLS policies
- Drizzle ORM setup for type-safe queries
- All 10+ MCP tools with context-first approach
- Supabase Auth with GitHub OAuth
- Smart context loading system

### Phase 2: Context Management & Search (Week 2)
**Goal**: Build intelligent context loading and in-context search

Key Deliverables:
- Smart document loading strategies
- In-context search (no RAG needed)
- Context budget management
- Usage-based optimization

### Phase 3: Review & Moderation System (Week 3)
**Goal**: Implement the contribution and review workflow

Key Deliverables:
- Proposal submission and tracking
- Review queue and approval flow
- Supabase RLS for role-based access
- Rate limiting with Edge Functions
- Abuse protection policies

### Phase 4: Production & Beta Launch (Week 4)
**Goal**: Deploy to Vercel and onboard beta customers

Key Deliverables:
- Vercel deployment with Supabase
- Production environment setup
- Monitoring (Vercel + Supabase dashboards)
- Documentation and onboarding
- Beta customer support

## Risk Mitigation

### Technical Risks
1. **Context Limits**: Smart loading for projects >100k tokens
2. **Scale**: Start with managed PostgreSQL, monitor closely
3. **Performance**: In-memory search and caching

### Business Risks
1. **Adoption**: Already have interested customers from hackathon
2. **Competition**: First-mover advantage in MCP documentation space
3. **Support**: Automate onboarding, provide clear documentation

## Success Metrics

### Week 1
- All core MCP tools functional
- Database schema deployed
- Can create/read/update docs via MCP

### Week 2
- Search returns relevant results
- <300ms response time for searches
- Hybrid ranking implemented

### Week 3
- Full review workflow operational
- 5+ test proposals approved
- Auth and roles working

### Week 4
- Deployed to production
- 3+ beta customers onboarded
- <2hr response time for issues

## Resource Requirements

### Technical
- Supabase (database, auth, storage)
- Drizzle ORM for migrations
- Anthropic API access (for Q&A, not embeddings)
- Vercel hosting
- GitHub OAuth (via Supabase Auth)

### Team
- 1 full-time developer (YC founder mindset)
- Automated onboarding via documentation
- Community support model for beta

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews

---

## Detailed Phase Plans

See individual phase files:
- [Phase 1: Core MCP Tools](./phase1.md)
- [Phase 2: Search Infrastructure](./phase2.md)
- [Phase 3: Review System](./phase3.md)
- [Phase 4: Beta Launch](./phase4.md)

## Progress Tracking

Progress updates in [`./progress/`](./progress/) folder.