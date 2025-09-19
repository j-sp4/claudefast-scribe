import { z } from 'zod';

export interface QualityIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
}

export interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-100
  issues: QualityIssue[];
}

/**
 * Run quality checks on markdown content
 */
export async function runQualityChecks(content: string): Promise<QualityCheckResult> {
  const issues: QualityIssue[] = [];
  
  // Check 1: Minimum content length
  if (content.length < 50) {
    issues.push({
      type: 'error',
      message: 'Content is too short. Please provide more detailed documentation.',
    });
  }

  // Check 2: Check for proper markdown structure
  const lines = content.split('\n');
  let hasHeading = false;
  let codeBlockOpen = false;
  let codeBlockLanguage = false;
  
  lines.forEach((line, index) => {
    // Check for headings
    if (line.startsWith('#')) {
      hasHeading = true;
    }
    
    // Check for code blocks
    if (line.startsWith('```')) {
      if (!codeBlockOpen) {
        codeBlockOpen = true;
        // Check if language is specified
        if (line.length === 3) {
          issues.push({
            type: 'warning',
            message: 'Code block missing language identifier',
            line: index + 1,
          });
        }
      } else {
        codeBlockOpen = false;
      }
    }
    
    // Check for broken markdown links
    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      if (!match[2] || match[2].trim() === '') {
        issues.push({
          type: 'error',
          message: 'Broken markdown link detected',
          line: index + 1,
          column: match.index,
        });
      }
    }
    
    // Check for TODO/FIXME comments
    if (line.includes('TODO') || line.includes('FIXME')) {
      issues.push({
        type: 'warning',
        message: 'Unresolved TODO/FIXME comment found',
        line: index + 1,
      });
    }
    
    // Check for very long lines (markdown best practice)
    if (line.length > 120 && !line.startsWith('```')) {
      issues.push({
        type: 'info',
        message: 'Line exceeds recommended length of 120 characters',
        line: index + 1,
      });
    }
  });
  
  // Check for unclosed code blocks
  if (codeBlockOpen) {
    issues.push({
      type: 'error',
      message: 'Unclosed code block detected',
    });
  }
  
  // Check 3: No headings found
  if (!hasHeading && content.length > 200) {
    issues.push({
      type: 'warning',
      message: 'No headings found. Consider adding structure with markdown headings.',
    });
  }

  // Check 4: Check for common typos and issues
  const commonIssues = [
    { pattern: /\s+$/, message: 'Trailing whitespace detected' },
    { pattern: /^\s+/, message: 'Leading whitespace detected' },
    { pattern: /\t/, message: 'Tab character found, use spaces for consistency' },
    { pattern: /\s\s+/, message: 'Multiple consecutive spaces detected' },
  ];

  lines.forEach((line, index) => {
    commonIssues.forEach(({ pattern, message }) => {
      if (pattern.test(line) && !line.startsWith('```')) {
        issues.push({
          type: 'info',
          message,
          line: index + 1,
        });
      }
    });
  });

  // Check 5: Validate front matter if present
  if (content.startsWith('---')) {
    const frontMatterEnd = content.indexOf('---', 3);
    if (frontMatterEnd === -1) {
      issues.push({
        type: 'error',
        message: 'Unclosed front matter block',
      });
    }
  }

  // Calculate quality score
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const infoCount = issues.filter(i => i.type === 'info').length;
  
  let score = 100;
  score -= errorCount * 20;
  score -= warningCount * 10;
  score -= infoCount * 2;
  score = Math.max(0, score);

  return {
    passed: errorCount === 0,
    score,
    issues,
  };
}

/**
 * Extract all links from markdown content
 */
export function extractLinks(content: string): string[] {
  const links: string[] = [];
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    if (match[2]) {
      links.push(match[2]);
    }
  }
  
  return links;
}

/**
 * Extract code blocks from markdown
 */
export function extractCodeBlocks(content: string): Array<{
  language?: string;
  code: string;
  line: number;
}> {
  const blocks: Array<{ language?: string; code: string; line: number }> = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let currentBlock: string[] = [];
  let currentLanguage: string | undefined;
  let blockStartLine = 0;
  
  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        currentLanguage = line.slice(3).trim() || undefined;
        blockStartLine = index + 1;
      } else {
        blocks.push({
          language: currentLanguage,
          code: currentBlock.join('\n'),
          line: blockStartLine,
        });
        currentBlock = [];
        currentLanguage = undefined;
        inCodeBlock = false;
      }
    } else if (inCodeBlock) {
      currentBlock.push(line);
    }
  });
  
  return blocks;
}

/**
 * Count words in markdown content
 */
export function countWords(content: string): number {
  // Remove code blocks
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  // Remove markdown syntax
  const plainText = withoutCode
    .replace(/^#+\s+/gm, '') // Headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/[*_~`]/g, '') // Emphasis
    .replace(/^[-*+]\s+/gm, '') // Lists
    .replace(/^\d+\.\s+/gm, ''); // Numbered lists
  
  // Count words
  const words = plainText.match(/\b\w+\b/g);
  return words ? words.length : 0;
}

/**
 * Calculate a quality score for a proposal
 */
export function calculateQualityScore(issues: QualityIssue[]): number {
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  
  let score = 100;
  score -= errorCount * 20;
  score -= warningCount * 10;
  
  return Math.max(0, Math.min(100, score));
}