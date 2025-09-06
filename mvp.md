# MCP Crowd‑Docs — MVP (Minimal Viable Product)

A scoped, working slice of the crowd‑sourced documentation server that runs via MCP and enables reading, searching, proposing edits, and simple approval. Target: buildable in ~1–2 weeks.

---

## 1) MVP Goal

- Deliver in‑IDE/assistant access to usable docs and a lightweight path to propose and approve improvements.
- Keep scope small: one DB, one service, a handful of MCP tools, basic ranking, simple moderation.

---

## 2) Scope

- In: Read/search docs; propose updates; reviewer approval; version bumps; re‑indexing; basic auth and rate limits.
- Out (for now): Reputation, weighted votes, comments, complex channels, advanced ranking, external web UI.

---

## 3) MCP Tools (v0)

- `list_topics(projectSlug, query?)` → minimal discovery of doc topics.
- `read_doc(projectSlug, topicSlug|path, version?)` → return title + `contentMd`.
- `search_docs(projectSlug, query, topK=5)` → keyword‑first search, returns snippets + anchor links.
- `propose_update(target{projectSlug, topicSlug|path}, change{kind: 'replace'|'append', contentMd, baseDocVersion?}, rationale?)` → submit edit.
- `review_queue(projectSlug, limit=10)` → pending proposals with diff preview.
- `approve_proposal(proposalId)` / `reject_proposal(proposalId)` → merge or decline.

Notes:
- Keep payloads small; paginate queues; include `docId`, `version`, `anchorId` where applicable.

---

## 4) Data Model (minimal)

- `projects(id, slug, name)`
- `topics(id, project_id, slug, title, path, tags[])`
- `documents(id, topic_id, version, title, content_md, updated_at)`
- `revisions(id, doc_id, version, content_md, author_id, created_at)`
- `proposals(id, target_doc_id, project_id, topic_id, change_kind, content_md, base_doc_version, author_id, status, created_at)`
- `users(id, handle, role)`

Optional (if quick): `usage_events(id, user_id, tool, doc_id, outcome, created_at)`

---

## 5) Storage & Search

- Supabase PostgreSQL as the only store.
- Context-first approach - load full docs into context when possible.
- Simple text search within loaded context (no embeddings needed).
- Smart loading for projects that exceed context limits.

Document Organization:
- Track token counts per document for context management.
- Organize by project → topic → document hierarchy.

---

## 6) Retrieval & Context Loading (v0)

- Load entire project if under context budget (100k tokens).
- Smart selection based on access patterns for larger projects.
- In-context search with markdown structure awareness.
- Return results with anchors for deep linking.

---

## 7) Contribution & Review Flow (v0)

1) User reads via `read_doc` or `search_docs`.
2) User calls `propose_update` with `replace` or `append` (no patches/diffs in MVP).
3) Automated checks:
   - Markdown lint and dead‑link check only.
4) Proposal appears in `review_queue`.
5) Reviewer calls `approve_proposal` (creates `revision`, bumps `documents.version`, updates `content_md`) or `reject_proposal`.
6) Re‑index full‑text for the affected topic.

Policies:
- One channel only (`stable`).
- Last‑write wins with `baseDocVersion` guard; on mismatch, require resubmission.

---

## 8) Auth, Roles, and Abuse Controls (v0)

- Auth: Supabase Auth with GitHub OAuth.
- Roles: `user` (read, propose), `reviewer` (approve/reject), `admin` (manage projects/topics).
- Rate limits: Supabase RLS policies and Edge Functions.
- Size limits: max proposal content length; strip images/attachments.

---

## 9) Deployment & Ops (v0)

- Next.js app on Vercel implementing MCP over HTTP.
- Supabase for database, auth, and storage.
- Drizzle ORM for type-safe queries and migrations.
- Simple caching for frequently accessed projects.
- Logging: Vercel logs + Supabase logs.

---

## 10) Milestones & Checklist (2 weeks)

Week 1:
- Supabase project setup with schema; seed 3–5 topics for one example project.
- Implement MCP tools: `list_projects`, `load_project_context`, `search_in_context`.
- Implement `propose_update` and `review_queue`.

Week 2:
- Implement `approve_proposal`/`reject_proposal` and version management.
- Smart loading for large projects.
- Supabase Auth integration with GitHub OAuth.
- Documentation: how to install MCP client and try flows end‑to‑end.

---

## 11) Success Criteria (v0)

- Full projects loadable into context for projects <100k tokens.
- Smart loading works for larger projects.
- At least 10 proposals submitted; ≥5 approved and reflected in documents.
- Median response < 100ms for in-context search.
