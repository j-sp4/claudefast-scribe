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

- Postgres as the only store (managed: Supabase/Neon/RDS).
- Full‑text search (tsvector/BM25) across doc chunks; simple tokenizer for Markdown headings.
- Embeddings optional (pgvector) — add later; MVP ships with keyword search.

Chunking:
- Split by headings and size (400–800 tokens). Store chunk table or computed view for search.

---

## 6) Retrieval & Ranking (v0)

- Rank by keyword score + light recency boost.
- Default to latest stable `version` for a topic.
- Return top 5 results with snippet and `anchorId`.

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

- Auth: GitHub OAuth.
- Roles: `user` (read, propose), `reviewer` (approve/reject), `admin` (manage projects/topics).
- Rate limits: per‑IP and per‑user caps on `propose_update` (comments omitted in MVP).
- Size limits: max proposal content length; strip images/attachments.

---

## 9) Deployment & Ops (v0)

- Single service (Node/TypeScript) implementing MCP over stdio or HTTP; deploy on Vercel/Fly/Render.
- Postgres managed; automated migrations.
- Background job runner optional; re‑index inline on approval for MVP.
- Logging: request logs + error tracking.

---

## 10) Milestones & Checklist (2 weeks)

Week 1:
- DB schema + migrations; seed 3–5 topics for one example project.
- Implement MCP tools: `list_topics`, `read_doc`, `search_docs`.
- Implement `propose_update` and `review_queue`.

Week 2:
- Implement `approve_proposal`/`reject_proposal` and version bump + re‑index.
- Markdown lint + link checker in proposal intake.
- Basic auth (GitHub), roles, and rate limits.
- Documentation: how to install MCP client and try flows end‑to‑end.

---

## 11) Success Criteria (v0)

- Docs are discoverable via `search_docs` with useful snippets.
- At least 10 proposals submitted; ≥5 approved and reflected in `read_doc`.
- Median response < 300ms for read/search on small corpus.
