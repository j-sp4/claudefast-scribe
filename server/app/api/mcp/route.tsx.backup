import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';
import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';

const model = 'claude-opus-4-1-20250805'; // 'claude-3-5-sonnet-20241022';

// Force chalk to always output colors, even when piped through tee
chalk.level = 3; // 0 = disabled, 1 = basic, 2 = 256 colors, 3 = truecolor

const KNOWLEDGE_FILE_PATH = path.join(process.cwd(), '..', 'KNOWLEDGE.md');

// Note: chalk.level = 3 forces colors even when output is piped

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  defaultHeaders: {
    'anthropic-version': '2023-06-01',
  },
});

async function readKnowledgeBase(): Promise<string> {
  try {
    const content = await fs.readFile(KNOWLEDGE_FILE_PATH, 'utf-8');
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const initialContent = `# Knowledge Base

This file contains question and answer pairs about the codebase, accumulated over time to help with future development.

## Q&A Entries

---
`;
      await fs.writeFile(KNOWLEDGE_FILE_PATH, initialContent, 'utf-8');
      return initialContent;
    }
    throw error;
  }
}

async function appendToKnowledgeBase(qaEntries: Array<{question: string, answer: string}>): Promise<{added: number, skipped: number, merged: number}> {
  let currentContent = await readKnowledgeBase();
  
  // Extract all existing questions from the knowledge base for faster comparison
  const existingQuestions = new Map<string, { original: string, answer: string, position: number }>();
  const questionRegex = /\*\*Q: ([^*]+)\*\*\nA: ([^]*?)(?=\n\n\*\*Q:|---|\n\n##|$)/gm;
  let match;
  while ((match = questionRegex.exec(currentContent)) !== null) {
    const q = match[1].trim();
    const a = match[2].trim();
    const normalized = q.toLowerCase().replace(/[^\w\s]/g, '').trim();
    existingQuestions.set(normalized, { original: q, answer: a, position: match.index });
  }
  
  // Process each Q&A entry to check for duplicates or similar questions
  const processedEntries: string[] = [];
  const stats = { added: 0, skipped: 0, merged: 0 };
  
  for (const { question, answer } of qaEntries) {
    const normalizedNewQuestion = question.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    // First check for exact match (normalized)
    if (existingQuestions.has(normalizedNewQuestion)) {
      const existing = existingQuestions.get(normalizedNewQuestion)!;
      
      // Check if the answer is already included
      if (existing.answer.toLowerCase().includes(answer.toLowerCase().trim())) {
        console.log(chalk.bgYellow.black(' ⏭️  SKIP '), chalk.yellow('Duplicate Q&A:'), chalk.yellowBright(question));
        stats.skipped++;
        continue;
      }
      
      // If we have API key, use AI to intelligently merge answers
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const response = await anthropic.messages.create({
            model,
            max_tokens: 1000,
            temperature: 0.1,
            system: 'You are an expert at merging knowledge base answers. When given an existing Q&A pair and a new answer, intelligently combine them into a single comprehensive answer. Keep the merged answer concise and well-structured.',
            messages: [
              {
                role: 'user',
                content: `Existing Question: ${existing.original}\nExisting Answer: ${existing.answer}\n\nNew Answer to merge: ${answer}\n\nPlease provide a merged answer that combines both pieces of information. Return ONLY the merged answer text, no explanation.`
              }
            ],
          });
          
          const mergedAnswer = response.content[0]?.type === 'text' ? response.content[0].text.trim() : existing.answer + '\n\n' + answer;
          
          // Update the answer in the content
          const oldQA = `**Q: ${existing.original}**\nA: ${existing.answer}`;
          const newQA = `**Q: ${existing.original}**\nA: ${mergedAnswer}`;
          currentContent = currentContent.replace(oldQA, newQA);
          
          // Update our map for future comparisons in this batch
          existingQuestions.set(normalizedNewQuestion, { ...existing, answer: mergedAnswer });
          
          console.log(chalk.bgBlue.white(' 🔀 MERGE '), chalk.blue('Merged answer for:'), chalk.blueBright(existing.original));
          stats.merged++;
        } catch (error) {
          console.error(chalk.red('Error merging with AI:'), error);
          // Fall back to simple append
          const mergedAnswer = existing.answer + '\n\nAdditional information:\n' + answer;
          const oldQA = `**Q: ${existing.original}**\nA: ${existing.answer}`;
          const newQA = `**Q: ${existing.original}**\nA: ${mergedAnswer}`;
          currentContent = currentContent.replace(oldQA, newQA);
          existingQuestions.set(normalizedNewQuestion, { ...existing, answer: mergedAnswer });
          stats.merged++;
        }
      } else {
        // No API key, do simple append
        const mergedAnswer = existing.answer + '\n\nAdditional information:\n' + answer;
        const oldQA = `**Q: ${existing.original}**\nA: ${existing.answer}`;
        const newQA = `**Q: ${existing.original}**\nA: ${mergedAnswer}`;
        currentContent = currentContent.replace(oldQA, newQA);
        existingQuestions.set(normalizedNewQuestion, { ...existing, answer: mergedAnswer });
        console.log(chalk.bgBlue.white(' 🔀 MERGE '), chalk.blue('Appended answer for:'), chalk.blueBright(existing.original));
        stats.merged++;
      }
      continue;
    }
    
    // Check for similar questions using AI if available
    let foundSimilar = false;
    if (process.env.ANTHROPIC_API_KEY && existingQuestions.size > 0) {
      try {
        // Get a sample of existing questions for comparison
        const existingQList = Array.from(existingQuestions.values()).map(e => e.original);
        
        const response = await anthropic.messages.create({
          model,
          max_tokens: 500,
          temperature: 0.1,
          system: 'You are an expert at finding semantically similar questions. Given a new question and a list of existing questions, identify if any are asking essentially the same thing even if phrased differently.',
          messages: [
            {
              role: 'user',
              content: `New Question: ${question}\n\nExisting Questions:\n${existingQList.map((q, i) => `${i+1}. ${q}`).join('\n')}\n\nIs the new question semantically identical to any existing question? If yes, respond with ONLY the number of the matching question (e.g., "3"). If no match, respond with "NONE".`
            }
          ],
        });
        
        const responseText = response.content[0]?.type === 'text' ? response.content[0].text.trim() : 'NONE';
        
        if (responseText !== 'NONE' && !responseText.includes('NONE')) {
          const matchIndex = parseInt(responseText) - 1;
          if (!isNaN(matchIndex) && matchIndex >= 0 && matchIndex < existingQList.length) {
            const matchedQuestion = existingQList[matchIndex];
            const normalizedMatched = matchedQuestion.toLowerCase().replace(/[^\w\s]/g, '').trim();
            const existing = existingQuestions.get(normalizedMatched);
            
            if (existing) {
              console.log(chalk.bgMagenta.white(' 🔍 SIMILAR '), chalk.magenta('Found similar question:'), chalk.magentaBright(matchedQuestion));
              
              // Merge the answers
              const mergeResponse = await anthropic.messages.create({
                model,
                max_tokens: 1000,
                temperature: 0.1,
                system: 'You are an expert at merging knowledge base answers. When given an existing Q&A pair and a new answer, intelligently combine them into a single comprehensive answer. Keep the merged answer concise and well-structured.',
                messages: [
                  {
                    role: 'user',
                    content: `Existing Question: ${existing.original}\nExisting Answer: ${existing.answer}\n\nNew Question (similar): ${question}\nNew Answer to merge: ${answer}\n\nPlease provide a merged answer that combines both pieces of information. Return ONLY the merged answer text, no explanation.`
                  }
                ],
              });
              
              const mergedAnswer = mergeResponse.content[0]?.type === 'text' ? mergeResponse.content[0].text.trim() : existing.answer + '\n\n' + answer;
              
              // Update the answer in the content
              const oldQA = `**Q: ${existing.original}**\nA: ${existing.answer}`;
              const newQA = `**Q: ${existing.original}**\nA: ${mergedAnswer}`;
              currentContent = currentContent.replace(oldQA, newQA);
              
              // Update our map
              existingQuestions.set(normalizedMatched, { ...existing, answer: mergedAnswer });
              
              stats.merged++;
              foundSimilar = true;
            }
          }
        }
      } catch (error) {
        console.error(chalk.red('Error checking for similar questions:'), error);
      }
    }
    
    // If not found as duplicate or similar, add as new
    if (!foundSimilar) {
      processedEntries.push(`\n**Q: ${question}**\nA: ${answer}\n`);
      stats.added++;
      console.log(chalk.bgGreen.black(' ✅ ADD '), chalk.green('New question:'), chalk.greenBright(question));
    }
  }
  
  // Only update if there are new entries to add
  if (processedEntries.length > 0) {
    const newEntriesText = processedEntries.join('\n');
    // Find the last --- marker and insert before it
    const lastDashIndex = currentContent.lastIndexOf('\n---\n');
    if (lastDashIndex !== -1) {
      currentContent = currentContent.slice(0, lastDashIndex) + newEntriesText + '\n' + currentContent.slice(lastDashIndex);
    } else {
      // If no --- marker found, append at the end
      currentContent += newEntriesText;
    }
  }
  
  // Write the updated content
  await fs.writeFile(KNOWLEDGE_FILE_PATH, currentContent, 'utf-8');
  
  return stats;
}

async function searchKnowledgeBaseWithAI(knowledgeContent: string, question: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1000,
    temperature: 0.1,
    system: 'You are an expert at searching through a knowledge base. Your job is to find relevant Q&A pairs that answer the given question. If you find relevant information, quote it exactly. If the answer is not in the knowledge base, say "NOT_FOUND".',
    messages: [
      {
        role: 'user',
        content: `Knowledge Base Content:\n${knowledgeContent}\n\nQuestion to answer: ${question}\n\nPlease search the knowledge base and quote any relevant Q&A pairs that help answer this question. If no relevant information exists, respond with "NOT_FOUND".`
      }
    ],
  });

  const answer = response.content[0]?.type === 'text' ? response.content[0].text : null;
  if (!answer || answer.trim().startsWith('NOT_FOUND')) {
    return null;
  }
  return answer;
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'ask_questions',
      'Asks questions about the codebase or on how to solve a particular problem. They will be answered by an expert. You should make use of this tool as much as possible, as the expert is a senior developer with 10+ years of experience in this codebase. Whenever you are trying to solve a problem, or facing an issue that might need solving, ask this tool.',
      {
        questions: z.array(z.string()).describe("Array of questions you want to ask about the codebase or problems you're trying to solve"),
      },
      async ({ questions }) => {
        const knowledgeContent = await readKnowledgeBase();

        console.log(chalk.bgCyan.black.bold('\n\n\n ============================================================ '));
        console.log(chalk.bgCyan.black.bold(' 📋  MCP TOOL: ASK_QUESTIONS                                 '));
        console.log(chalk.bgCyan.black.bold(' ============================================================ '));
        console.log(chalk.magentaBright.bold('\n🔍 Questions Received:'));
        questions.forEach((q, i) => {
          console.log(
            chalk.bgMagenta.white.bold(` ${i + 1} `),
            chalk.yellowBright('▶'),
            chalk.cyanBright.bold(q)
          );
        });
        console.log(chalk.gray.italic('\n⏳ Processing questions through AI knowledge base...'));
        
        const responses = await Promise.all(
          questions.map(async (question) => {
            const answer = await searchKnowledgeBaseWithAI(knowledgeContent, question);
            
            if (answer) {
              return {
                question,
                answer: answer
              };
            } else {
              return {
                question,
                answer: "I don't have a direct answer to that question in the knowledge base. You'll need to figure it out yourself. IMPORTANT: Once you've found the answer, you must add it back to the knowledge base using the create_qa tool so that future sessions can benefit from this knowledge."
              };
            }
          })
        );
        
        const formattedResponse = responses.map(r => `**Question:** ${r.question}\n\n**Answer:** ${r.answer}`).join('\n\n---\n\n');
        
        return {
          content: [{ type: 'text', text: formattedResponse }],
        };
      },
    );
    
    server.tool(
      'create_qa',
      `Create new question and answer pairs in the knowledge base. Use this tool after you've learned something new about the codebase. Please specify a question and an answer, and it will be added to the knowledgebase, and can later be retrieved in later sessions. Write the Q&A in such a way that it would be the MOST useful for future readers & developers, including coding agents but also humans who may read the file. This means you may have to explain the context of the question, when it would be useful, etc. Every question is completely independent of the others, and you cannot assume that the user will receive the questions in the same order they're given, so add all necessary context to each specific question.`,
      {
        qa_entries: z.array(z.object({
          question: z.string().describe("The question that you're answering"),
          answer: z.string().describe("The answer to the question"),
        })).describe("The question and answer pairs that you've learned about the codebase"),
      },
      async ({ qa_entries }) => {
        const stats = await appendToKnowledgeBase(qa_entries);

        console.log(chalk.bgGreen.black.bold('\n\n\n ============================================================ '));
        console.log(chalk.bgGreen.black.bold(' ✅  MCP TOOL: CREATE_QA                                     '));
        console.log(chalk.bgGreen.black.bold(' ============================================================ '));
        
        console.log(chalk.yellowBright.bold('\n📊 Processing Statistics:'));
        console.log(
          chalk.bgGreen.white.bold(' ADDED '), chalk.greenBright.bold(stats.added),
          stats.merged > 0 ? chalk.bgYellow.black.bold(' MERGED ') + ' ' + chalk.yellowBright.bold(stats.merged) : '',
          stats.skipped > 0 ? chalk.bgGray.white(' SKIPPED ') + ' ' + chalk.gray(stats.skipped) : ''
        );
        
        if (qa_entries.length > 0) {
          console.log(chalk.magentaBright.bold('\n📝 Knowledge Base Entries:'));
          qa_entries.forEach((entry, i) => {
            console.log(chalk.bgBlue.white.bold(`\n  Entry ${i + 1} `));
            console.log(chalk.yellowBright('  ❓ Question:'), chalk.cyanBright.bold(entry.question));
            console.log(chalk.greenBright('  ✅ Answer:'));
            const answerLines = entry.answer.split('\n');
            answerLines.forEach(line => {
              console.log(chalk.whiteBright('     ' + line));
            });
          });
        }
        console.log(chalk.gray('\n' + '─'.repeat(60)));
        
        let message = `Processed ${qa_entries.length} Q&A pair(s):\n`;
        if (stats.added > 0) message += `- Added ${stats.added} new question(s)\n`;
        if (stats.merged > 0) message += `- Merged ${stats.merged} answer(s) with similar questions\n`;
        if (stats.skipped > 0) message += `- Skipped ${stats.skipped} duplicate question(s)\n`;
        
        return {
          content: [{ type: 'text', text: message.trim() }],
        };
      },
    );
  },
  {},
  {
    basePath: '/api'
  }
);

export { handler as GET, handler as POST, handler as DELETE };

// demo change 1755998949760
// demo change 1755999037552
// demo change 1755999115071
