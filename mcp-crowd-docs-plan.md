# MCP Server for Crowd‑Sourced Documentation — Implementation Plan

This document outlines how to design and implement an MCP (Model Context Protocol) server that enables users to read and iteratively improve documentation for libraries/SDKs in a crowd‑sourced manner, directly from AI coding tools that support MCP (e.g., Cursor, Claude Code).

---

## 1) Objectives and Success Criteria

- **Primary goal**: Make it easy for developers to discover, retrieve, and improve docs from within their IDE/AI assistant; let high‑quality revisions rise to the top via community review and usage signals.
- **MVP success**: Users can read docs via MCP, propose edits, reviewers approve/reject, and improved docs become preferred results for subsequent retrieval.
- **Non‑goals (initially)**: Full WYSIWYG doc site, multi‑language deep i18n, rich code execution sandboxes.

---

## 2) High‑Level Architecture

- **MCP Server**: A JSON‑RPC stream server that exposes tools/resources/prompts for documentation retrieval and contribution.
- **App Backend**: Persists docs, proposals, votes, and moderation state. Provides search (semantic + keyword) and ranking APIs used by the MCP tools.
- **Storage**:
  - Primary relational DB (e.g., Postgres) for canonical doc texts, versions, proposals, votes, users, audit logs.
  - Vector index (e.g., pgvector, Qdrant, Weaviate) for semantic search across doc chunks.
  - Optional blob storage for attachments/images.
- **Ranking & Signals**: Combines semantic relevance, popularity, recency, reviewer trust, and usage telemetry to select the “best” doc for a query.
- **Governance & Trust**: Role‑based moderation, reputation‑weighted voting, transparent audit log.

---

## 3) MCP Interface (Tools, Resources, Prompts)

### 3.1 Tools (initial set)

Design tool names and schemas to be stable and self‑descriptive. Return concise, chunked results with metadata and anchors for linking back to full docs.

1) `list_projects`
   - Input: `{ query?: string }`
   - Output: `{ projects: Array<{ id, slug, name, repoUrl?, latestVersion?, topicsCount }> }`
   - Purpose: Discover libraries/SDKs.

2) `list_topics`
   - Input: `{ projectSlug: string, query?: string }`
   - Output: `{ topics: Array<{ id, slug, title, path, tags }>} `
   - Purpose: Explore a project’s doc topics.

3) `read_doc`
   - Input: `{ projectSlug: string, topicSlug?: string, path?: string, version?: string }`
   - Output: `{ doc: { id, version, title, contentMd, anchors: Array<{ id, title, offset }>, qualityScore, source } }`
   - Purpose: Retrieve canonical or best doc for a topic.

4) `search_docs`
   - Input: `{ projectSlug: string, query: string, filters?: { version?, tags? }, topK?: number }`
   - Output: `{ results: Array<{ docId, topicSlug, version, snippetMd, rank, scoreBreakdown, anchorId? }>} `
   - Purpose: Hybrid semantic/keyword search for relevant doc chunks.

5) `get_best_doc`
   - Input: `{ projectSlug: string, topicSlug?: string, query?: string, userContext?: { runtime?, os?, language?, framework?, libraryVersion? } }`
   - Output: `{ doc: { docId, title, contentMd, version, rationale: { factors: Array, score } } }`
   - Purpose: Returns the currently “best” doc given context + ranking.

6) `propose_update`
   - Input: `{ target: { docId? , projectSlug, topicSlug? , path? }, change: { kind: 'patch'|'replace'|'append', contentMd, baseDocVersion? }, rationale?: string, references?: Array<string> }`
   - Output: `{ proposalId, status: 'pending' }`
   - Purpose: Crowd submits doc improvements (diff‑based or full content replacement).

7) `review_queue`
   - Input: `{ projectSlug: string, topicSlug?: string, limit?: number }`
   - Output: `{ proposals: Array<{ proposalId, summary, author, createdAt, diffPreview, votes, status }> }`
   - Purpose: Surface pending proposals to reviewers/maintainers.

8) `vote_proposal`
   - Input: `{ proposalId: string, vote: 'up'|'down' }`
   - Output: `{ ok: boolean, newTally }`
   - Purpose: Lightweight community signal; weight by reputation.

9) `approve_proposal`
   - Input: `{ proposalId: string, note?: string }`
   - Output: `{ mergedRevisionId, newDocVersion, published: boolean }`
   - Purpose: Merge change into canonical doc; bump version; trigger re‑indexing.

10) `reject_proposal`
    - Input: `{ proposalId: string, reason?: string }`
    - Output: `{ ok: boolean }`
    - Purpose: Decline unsuitable edits; keep audit trail.

11) `comment_proposal`
    - Input: `{ proposalId: string, body: string }`
    - Output: `{ ok: boolean, commentId }`
    - Purpose: Asynchronous discussion thread for proposals.

12) `history`
    - Input: `{ docId: string }`
    - Output: `{ revisions: Array<{ revisionId, author, createdAt, diffSummary, version }>} `
    - Purpose: Inspect provenance and evolution of docs.

Notes:
- Keep tool responses compact for MCP clients; paginate when needed.
- Include `source` and `anchors` to help assistants cite and deep‑link.
- Add per‑tool rate limits and basic abuse protection.

### 3.2 Resources (optional)

- `resource:project_index` — Cached list of projects with minimal metadata.
- `resource:style_guide` — Markdown style guide for contributors (tone, structure, examples).
- `resource:doc_schema` — Machine‑readable schema for doc payloads to aid client rendering.

### 3.3 Prompts (quality scaffolds)

- `prompt:propose_minimal_fix` — Instructs models to produce small, testable edits with citations.
- `prompt:improve_example` — Focus on runnable code examples and edge cases.
- `prompt:resolve_conflict` — Helps produce a reconciled draft when proposals disagree.

---

## 4) Data Model and Storage

### 4.1 Entities

- **Project**: `{ id, slug, name, repoUrl?, maintainers[] }`
- **Topic**: `{ id, projectId, slug, title, path, tags[] }`
- **Document**: `{ id, topicId, version, title, contentMd, anchors[], status: 'stable'|'beta'|'experimental', qualityScore, createdAt }`
- **Revision**: `{ id, docId, version, diff?, contentMd, authorId, createdAt }`
- **Proposal**: `{ id, targetDocId?, projectId, topicId?, changeKind, contentMd, baseDocVersion?, authorId, status, createdAt }`
- **Vote**: `{ id, proposalId, userId, value: +1|-1, weight }`
- **Comment**: `{ id, proposalId, userId, body, createdAt }`
- **User**: `{ id, externalId?, handle, role: 'user'|'reviewer'|'maintainer'|'admin', reputation }`
- **UsageEvent**: `{ id, userId?, toolName, docId?, query?, outcome: 'view'|'copy'|'success'|'abandon', createdAt }`

### 4.2 Storage Choices

- **Relational DB**: Postgres (managed: Supabase/Neon/RDS). Use migrations. Enforce foreign keys.
- **Vector Store**: pgvector extension in the same Postgres for simplicity; or external (Qdrant/Weaviate) if scale demands.
- **Indexing**: Maintain both full‑text (tsvector) and embeddings for hybrid search.
- **Attachments**: S3‑compatible storage for images; store references in DB.
- **Audit Log**: Immutable append‑only table for moderation and merges.

### 4.3 Versioning & Concurrency

- Store full `contentMd` per revision; store diffs for efficient previews.
- Use 3‑way merge against `baseDocVersion` for `changeKind='patch'`; fall back to reviewer resolution on conflicts.
- Keep `status` channels: `stable`, `beta`, `experimental`. Default retrieval uses `stable` unless specified.

### 4.4 Chunking & Embeddings

- Chunk by Markdown headings and length (target 400–800 tokens) with overlap.
- Index each chunk with: `{ docId, topicSlug, version, anchorId, embedding, keywords, popularity }`.
- Re‑index on approved merges or project releases.

---

## 5) Retrieval and “Best Doc” Ranking

### 5.1 Ranking Inputs

- **Semantic relevance**: Embedding cosine similarity to the query.
- **Keyword match**: BM25/tsvector score for exact terms and API symbols.
- **Popularity**: Views, successful task completions after reading, copy usage.
- **Quality**: Reviewer approvals, reputation‑weighted votes, lints passing.
- **Freshness**: Recency of last approved revision; decay over time.
- **Context fit**: Match to `userContext` (runtime, OS, language, library version).

### 5.2 Scoring (initial heuristic)

Compute a weighted score: `score = w_sem * sem + w_kw * kw + w_pop * pop + w_qual * qual + w_recency * rec + w_ctx * ctx`. Start with fixed weights, tune via offline eval and online bandits (e.g., epsilon‑greedy) on tie‑cases.

### 5.3 Safety & Guardrails

- Penalize hallucination signals (inconsistent API names, bad code lint results).
- Prefer docs with runnable, passing examples (if testable snippets are available).
- Down‑rank content with broken links or flagged by moderators.

---

## 6) Contribution and Moderation Lifecycle

1) User reads a doc via `read_doc` or `search_docs`.
2) User proposes a change via `propose_update` (patch/replace/append) with rationale and references.
3) Automated checks run:
   - Markdown/style lints, link checker.
   - Optional static checks for code blocks (language detection, compile/lint for simple examples).
   - Plagiarism/licensing checks on large insertions.
4) Proposal enters `review_queue`.
5) Community provides `vote_proposal` and `comment_proposal`.
6) Reviewer/maintainer `approve_proposal` or `reject_proposal`.
7) On approval: create `Revision`, update `Document.version`, re‑index vectors/full‑text, recompute quality scores.
8) Publish to `stable` or `beta` channel (configurable per project policy).

Escalations & Appeals:
- Auto‑close stale proposals; allow re‑open on new evidence.
- Keep clear, immutable audit log.

---

## 7) Identity, Reputation, and Abuse Mitigation

- **Auth**: GitHub OAuth for identity; support pseudonymous users with limited privileges.
- **Roles**: User, Reviewer, Maintainer, Admin. Reviewers/maintainers can be project‑scoped.
- **Reputation**: Earned from approved proposals and helpful votes; decays slowly over time to reflect recency.
- **Weighting**: Votes and approvals weighted by reputation; throttles on new accounts.
- **Rate limits**: Per‑user and per‑IP caps on proposals/comments.
- **Content filters**: Reject PII, malware, or license‑violating content.

---

## 8) Client Experience (Cursor/Claude via MCP)

- Inline retrieval: `get_best_doc` returns concise, directly usable snippets with anchors.
- Quick‑fix flow: Ideation prompt + `propose_update` payload pre‑filled from user changes.
- Review ergonomics: Summarized diffs and rationale via `review_queue`.
- Citations: Always include `source` and `anchorId` so assistants can attribute and deep‑link.

---

## 9) Deployment, Operations, and Observability

- **Deploy**: Containerized service (Fly.io, Render, Vercel for MCP over HTTP or local pipe modes).
- **Database**: Managed Postgres with pgvector; automated backups; migration tooling.
- **Index jobs**: Workers/queues (BullMQ/Cloud Tasks) for re‑indexing and batch imports.
- **Telemetry**: Basic metrics: search latency, approval rates, proposal throughput, doc quality trend.
- **Backups & DR**: Nightly backups; restore drills for audit and content.

---

## 10) Roadmap & Milestones

### Phase 0 (MVP, 1–2 weeks)

- Implement core MCP tools: `list_projects`, `list_topics`, `read_doc`, `search_docs`, `propose_update`, `review_queue`, `approve_proposal`, `reject_proposal`.
- Postgres schema + pgvector; simple embedding pipeline; full‑text index.
- Basic ranking heuristic; stable channel only.
- Minimal auth (GitHub) and role checks; rate limiting.

### Phase 1 (Production‑ready, 3–6 weeks)

- Add `get_best_doc`, `vote_proposal`, `comment_proposal`, `history`.
- Automated checks (lint, links, basic code block verification) and moderation dashboards.
- Beta/stable channels; background re‑indexing; incremental embeddings.
- Usage telemetry and feedback loop into ranking.

### Phase 2 (Scale & Quality, 6–12 weeks)

- Bandit‑based ranking refinements; contextual personalization (runtime/version).
- Reputation system, per‑project governance, maintainers onboarding flow.
- Importers for GitHub READMEs/wiki; scheduled sync against releases.
- Public API and minimal web UI for browsing/reviewing outside MCP.

---

## 11) Risks & Mitigations

- **Low‑quality or fabricated content**: Automations + reviewer gate + reputation weighting.
- **Fragmentation across versions**: Enforce version/channel discipline; default to stable.
- **Search drift**: Regular offline eval sets; canary bandits for online tuning.
- **Abuse/Spam**: Auth, rate limits, honeypots, content filters.

---

## 12) Appendix: Example Tool Schemas (illustrative)

```json
{
  "tool": "propose_update",
  "input": {
    "type": "object",
    "properties": {
      "target": {
        "type": "object",
        "properties": {
          "docId": { "type": ["string", "null"] },
          "projectSlug": { "type": "string" },
          "topicSlug": { "type": ["string", "null"] },
          "path": { "type": ["string", "null"] }
        },
        "required": ["projectSlug"]
      },
      "change": {
        "type": "object",
        "properties": {
          "kind": { "enum": ["patch", "replace", "append"] },
          "contentMd": { "type": "string" },
          "baseDocVersion": { "type": ["string", "null"] }
        },
        "required": ["kind", "contentMd"]
      },
      "rationale": { "type": ["string", "null"] },
      "references": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["target", "change"]
  },
  "output": {
    "type": "object",
    "properties": {
      "proposalId": { "type": "string" },
      "status": { "enum": ["pending"] }
    },
    "required": ["proposalId", "status"]
  }
}
```

```json
{
  "tool": "get_best_doc",
  "input": {
    "type": "object",
    "properties": {
      "projectSlug": { "type": "string" },
      "topicSlug": { "type": ["string", "null"] },
      "query": { "type": ["string", "null"] },
      "userContext": {
        "type": "object",
        "properties": {
          "runtime": { "type": ["string", "null"] },
          "os": { "type": ["string", "null"] },
          "language": { "type": ["string", "null"] },
          "framework": { "type": ["string", "null"] },
          "libraryVersion": { "type": ["string", "null"] }
        }
      }
    },
    "required": ["projectSlug"]
  },
  "output": {
    "type": "object",
    "properties": {
      "doc": {
        "type": "object",
        "properties": {
          "docId": { "type": "string" },
          "title": { "type": "string" },
          "contentMd": { "type": "string" },
          "version": { "type": "string" },
          "rationale": { "type": "object" }
        },
        "required": ["docId", "title", "contentMd", "version"]
      }
    },
    "required": ["doc"]
  }
}
```

---

## 13) What to Build First (Checklist)

- DB schema + migrations (projects, topics, documents, revisions, proposals, votes, users, usage_events).
- Embedding + full‑text indices; chunker for Markdown.
- MCP server endpoints for the initial tool set.
- Review workflow (approve/reject) with audit logging.
- Basic ranking heuristic and background re‑indexing.
- Minimal auth and rate‑limits.


