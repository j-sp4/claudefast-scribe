import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const knowledgeEntries = pgTable('knowledge_entries', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  normalizedQuestion: text('normalized_question').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});