import { pgTable, uuid, text, timestamp, integer, jsonb, unique, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'reviewer', 'admin']);
export const proposalStatusEnum = pgEnum('proposal_status', ['pending', 'approved', 'rejected']);
export const changeKindEnum = pgEnum('change_kind', ['replace', 'append', 'edit']);

// Tables
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  totalTokens: integer('total_tokens').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  path: text('path'),
  tags: jsonb('tags').default([]).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  uniqueProjectSlug: unique().on(table.projectId, table.slug)
}));

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  title: text('title').notNull(),
  contentMd: text('content_md').notNull(),
  tokenCount: integer('token_count').notNull(),
  accessCount: integer('access_count').default(0).notNull(),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid('updated_by')
}, (table) => ({
  uniqueTopicVersion: unique().on(table.topicId, table.version)
}));

export const revisions = pgTable('revisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  contentMd: text('content_md').notNull(),
  tokenCount: integer('token_count').notNull(),
  changeDescription: text('change_description'),
  authorId: uuid('author_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const proposals = pgTable('proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }),
  targetDocumentId: uuid('target_document_id').references(() => documents.id, { onDelete: 'cascade' }),
  changeKind: changeKindEnum('change_kind').notNull(),
  title: text('title').notNull(),
  contentMd: text('content_md').notNull(),
  rationale: text('rationale'),
  baseDocVersion: integer('base_doc_version'),
  status: proposalStatusEnum('status').default('pending').notNull(),
  authorId: uuid('author_id'),
  reviewerId: uuid('reviewer_id'),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true })
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  supabaseUserId: uuid('supabase_user_id').unique(),
  handle: text('handle').unique().notNull(),
  email: text('email'),
  role: userRoleEnum('role').default('user').notNull(),
  githubUsername: text('github_username'),
  proposalCount: integer('proposal_count').default(0).notNull(),
  approvedCount: integer('approved_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true })
});

export const usageEvents = pgTable('usage_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  tool: text('tool').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  outcome: text('outcome'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Relations
export const projectRelations = relations(projects, ({ many }) => ({
  topics: many(topics),
  proposals: many(proposals),
  usageEvents: many(usageEvents)
}));

export const topicRelations = relations(topics, ({ one, many }) => ({
  project: one(projects, {
    fields: [topics.projectId],
    references: [projects.id]
  }),
  documents: many(documents),
  proposals: many(proposals)
}));

export const documentRelations = relations(documents, ({ one, many }) => ({
  topic: one(topics, {
    fields: [documents.topicId],
    references: [topics.id]
  }),
  revisions: many(revisions),
  proposals: many(proposals),
  usageEvents: many(usageEvents)
}));

export const revisionRelations = relations(revisions, ({ one }) => ({
  document: one(documents, {
    fields: [revisions.documentId],
    references: [documents.id]
  })
}));

export const proposalRelations = relations(proposals, ({ one }) => ({
  project: one(projects, {
    fields: [proposals.projectId],
    references: [projects.id]
  }),
  topic: one(topics, {
    fields: [proposals.topicId],
    references: [topics.id]
  }),
  targetDocument: one(documents, {
    fields: [proposals.targetDocumentId],
    references: [documents.id]
  })
}));

export const userRelations = relations(users, ({ many }) => ({
  usageEvents: many(usageEvents)
}));

export const usageEventRelations = relations(usageEvents, ({ one }) => ({
  user: one(users, {
    fields: [usageEvents.userId],
    references: [users.id]
  }),
  project: one(projects, {
    fields: [usageEvents.projectId],
    references: [projects.id]
  }),
  document: one(documents, {
    fields: [usageEvents.documentId],
    references: [documents.id]
  })
}));