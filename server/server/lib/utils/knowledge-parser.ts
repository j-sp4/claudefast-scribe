/**
 * Shared utilities for parsing and normalizing knowledge base entries
 * Used by both the MCP route and migration scripts
 */

/**
 * Regular expression to parse Q&A entries from markdown
 * Matches: **Q: [question]**\nA: [answer]
 * Stops at: next **Q:, ---, or ## heading
 */
export const QA_ENTRY_REGEX = /\*\*Q: ([^*]+)\*\*\nA: ([^]*?)(?=\n\n\*\*Q:|---|\n\n##|$)/gm;

/**
 * Normalize a question for duplicate detection
 * Removes punctuation and converts to lowercase
 * @param question - The raw question text
 * @returns Normalized question string
 */
export function normalizeQuestion(question: string): string {
  return question.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

/**
 * Parse Q&A entries from markdown content
 * @param content - The markdown content to parse
 * @returns Array of parsed Q&A entries with normalized questions
 */
export function parseQAEntries(content: string): Array<{
  question: string;
  answer: string;
  normalizedQuestion: string;
}> {
  const entries: Array<{
    question: string;
    answer: string;
    normalizedQuestion: string;
  }> = [];
  
  let match;
  const regex = new RegExp(QA_ENTRY_REGEX);
  
  while ((match = regex.exec(content)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    const normalizedQuestion = normalizeQuestion(question);
    
    entries.push({
      question,
      answer,
      normalizedQuestion,
    });
  }
  
  return entries;
}

/**
 * Format Q&A entries as markdown
 * @param entries - Array of Q&A entries
 * @returns Formatted markdown string
 */
export function formatQAEntriesAsMarkdown(entries: Array<{
  question: string;
  answer: string;
}>): string {
  return entries
    .map(entry => `**Q: ${entry.question}**\nA: ${entry.answer}`)
    .join('\n\n');
}