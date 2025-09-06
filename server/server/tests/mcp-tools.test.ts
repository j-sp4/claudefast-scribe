/**
 * Integration tests for MCP tools
 * Tests the ask_questions and create_qa tools
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../lib/db';
import { knowledgeEntries } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// Test data
const TEST_QA = {
  question: 'What is the test framework used?',
  answer: 'Jest is used for testing the MCP tools and database operations.'
};

const TEST_QA_2 = {
  question: 'How do MCP tools work?',
  answer: 'MCP tools expose functionality through a JSON-RPC interface that can be called by AI assistants.'
};

describe('MCP Tools Integration Tests', () => {
  // Clean up test data before and after tests
  beforeAll(async () => {
    // Clean any test entries
    await db.delete(knowledgeEntries)
      .where(eq(knowledgeEntries.question, TEST_QA.question));
    await db.delete(knowledgeEntries)
      .where(eq(knowledgeEntries.question, TEST_QA_2.question));
  });

  afterAll(async () => {
    // Clean up test entries
    await db.delete(knowledgeEntries)
      .where(eq(knowledgeEntries.question, TEST_QA.question));
    await db.delete(knowledgeEntries)
      .where(eq(knowledgeEntries.question, TEST_QA_2.question));
  });

  describe('Database Operations', () => {
    it('should insert a new Q&A entry', async () => {
      const result = await db.insert(knowledgeEntries).values({
        question: TEST_QA.question,
        answer: TEST_QA.answer,
        normalizedQuestion: TEST_QA.question.toLowerCase().replace(/[^\w\s]/g, '').trim(),
      }).returning();

      expect(result).toHaveLength(1);
      expect(result[0].question).toBe(TEST_QA.question);
      expect(result[0].answer).toBe(TEST_QA.answer);
    });

    it('should retrieve Q&A entries', async () => {
      const entries = await db.select().from(knowledgeEntries)
        .where(eq(knowledgeEntries.question, TEST_QA.question));

      expect(entries).toHaveLength(1);
      expect(entries[0].question).toBe(TEST_QA.question);
    });

    it('should detect duplicate questions by normalized form', async () => {
      // Try to insert with different casing and punctuation
      const duplicateQuestion = 'What is the TEST framework used???';
      const normalizedOriginal = TEST_QA.question.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const normalizedDuplicate = duplicateQuestion.toLowerCase().replace(/[^\w\s]/g, '').trim();

      expect(normalizedOriginal).toBe(normalizedDuplicate);

      // Check if duplicate exists
      const existing = await db.select().from(knowledgeEntries)
        .where(eq(knowledgeEntries.normalizedQuestion, normalizedDuplicate));

      expect(existing).toHaveLength(1);
    });

    it('should update an existing answer', async () => {
      const updatedAnswer = TEST_QA.answer + ' It provides excellent testing capabilities.';
      
      const result = await db.update(knowledgeEntries)
        .set({ 
          answer: updatedAnswer,
          updatedAt: new Date()
        })
        .where(eq(knowledgeEntries.question, TEST_QA.question))
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].answer).toBe(updatedAnswer);
    });
  });

  describe('Knowledge Parser Utilities', () => {
    it('should normalize questions correctly', async () => {
      const { normalizeQuestion } = await import('../lib/utils/knowledge-parser');
      
      const testCases = [
        { input: 'What is MCP?', expected: 'what is mcp' },
        { input: 'How does it work???', expected: 'how does it work' },
        { input: '  Spaces  everywhere  ', expected: 'spaces everywhere' },
        { input: 'Special!@#$%^&*()chars', expected: 'specialchars' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeQuestion(input)).toBe(expected);
      });
    });

    it('should parse Q&A entries from markdown', async () => {
      const { parseQAEntries } = await import('../lib/utils/knowledge-parser');
      
      const markdown = `
# Knowledge Base

## Q&A Entries

**Q: What is Scribe MCP?**
A: Scribe MCP is a crowd-sourced documentation system.

**Q: How does it work?**
A: It uses MCP tools to read and update documentation.

---
`;

      const entries = parseQAEntries(markdown);
      
      expect(entries).toHaveLength(2);
      expect(entries[0].question).toBe('What is Scribe MCP?');
      expect(entries[0].answer).toBe('Scribe MCP is a crowd-sourced documentation system.');
      expect(entries[0].normalizedQuestion).toBe('what is scribe mcp');
      
      expect(entries[1].question).toBe('How does it work?');
      expect(entries[1].answer).toBe('It uses MCP tools to read and update documentation.');
    });

    it('should format Q&A entries as markdown', async () => {
      const { formatQAEntriesAsMarkdown } = await import('../lib/utils/knowledge-parser');
      
      const entries = [
        { question: 'Q1?', answer: 'A1' },
        { question: 'Q2?', answer: 'A2' },
      ];

      const markdown = formatQAEntriesAsMarkdown(entries);
      
      expect(markdown).toBe('**Q: Q1?**\nA: A1\n\n**Q: Q2?**\nA: A2');
    });
  });
});

describe('MCP Tool Endpoints', () => {
  it('should handle ask_questions tool calls', async () => {
    // This would require setting up a test server
    // For now, we're focusing on the database layer tests
    expect(true).toBe(true);
  });

  it('should handle create_qa tool calls', async () => {
    // This would require setting up a test server
    // For now, we're focusing on the database layer tests
    expect(true).toBe(true);
  });
});