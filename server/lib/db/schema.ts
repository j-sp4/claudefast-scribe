import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, boolean, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const userRoleEnum = pgEnum('user_role', ['user', 'reviewer', 'admin'])
export const proposalStatusEnum = pgEnum('proposal_status', ['pending', 'approved', 'rejected', 'withdrawn'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  githubUsername: varchar('github_username', { length: 255 }),
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  githubUsernameIdx: index('users_github_username_idx').on(table.githubUsername),
}))

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  githubUrl: varchar('github_url', { length: 500 }),
  websiteUrl: varchar('website_url', { length: 500 }),
  ownerId: uuid('owner_id').references(() => users.id),
  settings: jsonb('settings').default({}),
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('projects_slug_idx').on(table.slug),
  ownerIdx: index('projects_owner_idx').on(table.ownerId),
}))

export const topics = pgTable('topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  path: varchar('path', { length: 500 }),
  parentTopicId: uuid('parent_topic_id'),
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectSlugIdx: uniqueIndex('topics_project_slug_idx').on(table.projectId, table.slug),
  pathIdx: index('topics_path_idx').on(table.path),
  parentIdx: index('topics_parent_idx').on(table.parentTopicId),
}))

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  contentMd: text('content_md').notNull(),
  contentHtml: text('content_html'),
  summary: text('summary'),
  author_id: uuid('author_id').references(() => users.id),
  isLatest: boolean('is_latest').default(false).notNull(),
  embedding: jsonb('embedding'), // Will store vector(1536) in database
  searchVector: text('search_vector'), // Generated tsvector column
  viewCount: integer('view_count').default(0),
  helpfulCount: integer('helpful_count').default(0),
  notHelpfulCount: integer('not_helpful_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  topicVersionIdx: uniqueIndex('documents_topic_version_idx').on(table.topicId, table.version),
  latestIdx: index('documents_latest_idx').on(table.topicId, table.isLatest),
  authorIdx: index('documents_author_idx').on(table.author_id),
}))

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: jsonb('embedding'), // Will store vector(1536) in database
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  documentChunkIdx: uniqueIndex('chunks_document_chunk_idx').on(table.documentId, table.chunkIndex),
  documentIdx: index('chunks_document_idx').on(table.documentId),
}))

export const revisions = pgTable('revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  previousVersion: integer('previous_version'),
  version: integer('version').notNull(),
  changesSummary: text('changes_summary'),
  diff: jsonb('diff'),
  authorId: uuid('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('revisions_document_idx').on(table.documentId),
  authorIdx: index('revisions_author_idx').on(table.authorId),
}))

export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  contentMd: text('content_md').notNull(),
  changesSummary: text('changes_summary').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  status: proposalStatusEnum('status').default('pending').notNull(),
  reviewNotes: text('review_notes'),
  aiSuggestions: jsonb('ai_suggestions'),
  voteCount: integer('vote_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  topicIdx: index('proposals_topic_idx').on(table.topicId),
  authorIdx: index('proposals_author_idx').on(table.authorId),
  statusIdx: index('proposals_status_idx').on(table.status),
  reviewerIdx: index('proposals_reviewer_idx').on(table.reviewerId),
}))

export const usageEvents = pgTable('usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventData: jsonb('event_data').default({}),
  mcpTool: varchar('mcp_tool', { length: 100 }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('usage_events_user_idx').on(table.userId),
  projectIdx: index('usage_events_project_idx').on(table.projectId),
  eventTypeIdx: index('usage_events_type_idx').on(table.eventType),
  sessionIdx: index('usage_events_session_idx').on(table.sessionId),
  createdAtIdx: index('usage_events_created_at_idx').on(table.createdAt),
}))

export const proposalVotes = pgTable('proposal_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').notNull().references(() => proposals.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  vote: integer('vote').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userProposalIdx: uniqueIndex('votes_user_proposal_idx').on(table.userId, table.proposalId),
  proposalIdx: index('votes_proposal_idx').on(table.proposalId),
}))

export const documentFeedback = pgTable('document_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  helpful: boolean('helpful').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('feedback_document_idx').on(table.documentId),
  userDocumentIdx: index('feedback_user_document_idx').on(table.userId, table.documentId),
}))

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  documents: many(documents),
  proposals: many(proposals),
  proposalReviews: many(proposals),
  votes: many(proposalVotes),
  feedback: many(documentFeedback),
  usageEvents: many(usageEvents),
  revisions: many(revisions),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  topics: many(topics),
  usageEvents: many(usageEvents),
}))

export const topicsRelations = relations(topics, ({ one, many }) => ({
  project: one(projects, {
    fields: [topics.projectId],
    references: [projects.id],
  }),
  parentTopic: one(topics, {
    fields: [topics.parentTopicId],
    references: [topics.id],
    relationName: 'parentChild',
  }),
  childTopics: many(topics, {
    relationName: 'parentChild',
  }),
  documents: many(documents),
  proposals: many(proposals),
}))

export const documentsRelations = relations(documents, ({ one, many }) => ({
  topic: one(topics, {
    fields: [documents.topicId],
    references: [topics.id],
  }),
  author: one(users, {
    fields: [documents.author_id],
    references: [users.id],
  }),
  revisions: many(revisions),
  proposals: many(proposals),
  feedback: many(documentFeedback),
  usageEvents: many(usageEvents),
  chunks: many(documentChunks),
}))

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}))

export const revisionsRelations = relations(revisions, ({ one }) => ({
  document: one(documents, {
    fields: [revisions.documentId],
    references: [documents.id],
  }),
  author: one(users, {
    fields: [revisions.authorId],
    references: [users.id],
  }),
}))

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  topic: one(topics, {
    fields: [proposals.topicId],
    references: [topics.id],
  }),
  document: one(documents, {
    fields: [proposals.documentId],
    references: [documents.id],
  }),
  author: one(users, {
    fields: [proposals.authorId],
    references: [users.id],
    relationName: 'proposalAuthor',
  }),
  reviewer: one(users, {
    fields: [proposals.reviewerId],
    references: [users.id],
    relationName: 'proposalReviewer',
  }),
  votes: many(proposalVotes),
}))

export const proposalVotesRelations = relations(proposalVotes, ({ one }) => ({
  proposal: one(proposals, {
    fields: [proposalVotes.proposalId],
    references: [proposals.id],
  }),
  user: one(users, {
    fields: [proposalVotes.userId],
    references: [users.id],
  }),
}))

export const documentFeedbackRelations = relations(documentFeedback, ({ one }) => ({
  document: one(documents, {
    fields: [documentFeedback.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentFeedback.userId],
    references: [users.id],
  }),
}))

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  user: one(users, {
    fields: [usageEvents.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [usageEvents.projectId],
    references: [projects.id],
  }),
  document: one(documents, {
    fields: [usageEvents.documentId],
    references: [documents.id],
  }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Topic = typeof topics.$inferSelect
export type NewTopic = typeof topics.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type DocumentChunk = typeof documentChunks.$inferSelect
export type NewDocumentChunk = typeof documentChunks.$inferInsert
export type Revision = typeof revisions.$inferSelect
export type NewRevision = typeof revisions.$inferInsert
export type Proposal = typeof proposals.$inferSelect
export type NewProposal = typeof proposals.$inferInsert
export type UsageEvent = typeof usageEvents.$inferSelect
export type NewUsageEvent = typeof usageEvents.$inferInsert
export type ProposalVote = typeof proposalVotes.$inferSelect
export type NewProposalVote = typeof proposalVotes.$inferInsert
export type DocumentFeedback = typeof documentFeedback.$inferSelect
export type NewDocumentFeedback = typeof documentFeedback.$inferInsert