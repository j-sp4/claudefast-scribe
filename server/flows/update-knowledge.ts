import { query } from "@anthropic-ai/claude-code";
import { readFile } from "node:fs/promises";
import path from "node:path";
// import { mkdir } from "node:fs/promises";  // For future git worktree support
// import { execFile } from "node:child_process";  // For future git worktree support
// import { promisify } from "node:util";  // For future git worktree support
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  defaultHeaders: {
    "anthropic-version": "2023-06-01",
  },
});

async function extractQAStringsFromKnowledge(knowledgeMarkdown: string): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 2000,
      temperature: 0,
      system:
        "You are an expert at parsing markdown knowledge bases. Extract all Q&A pairs under the knowledge base and return them strictly as a JSON array of strings. Each string must contain exactly one Q&A, formatted as: **Q: <question>**\\nA: <answer>. Do not include headings or commentary. Do not add code fences or extra prose.",
      messages: [
        {
          role: "user",
          content:
            `Here is the content of KNOWLEDGE.md. Extract all Q&A pairs as described and return ONLY a JSON array of strings.\n\n${knowledgeMarkdown}`,
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = tryParseStringArray(text);
    if (parsed && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to local parsing below
  }

  // Fallback: parse Q&A from markdown locally
  const fallback = parseQAFromMarkdown(knowledgeMarkdown);
  return fallback;
}

function tryParseStringArray(text: string): string[] | null {
  // Try direct JSON parse
  try {
    const direct = JSON.parse(text);
    if (Array.isArray(direct) && direct.every((v) => typeof v === "string")) {
      return direct as string[];
    }
  } catch {}

  // Try to extract first JSON array substring
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      const arr = JSON.parse(candidate);
      if (Array.isArray(arr) && arr.every((v) => typeof v === "string")) {
        return arr as string[];
      }
    } catch {}
  }
  return null;
}

function parseQAFromMarkdown(markdown: string): string[] {
  const results: string[] = [];
  const qaRegex = /\*\*Q:\s*([\s\S]*?)\*\*\s*\nA:\s*([\s\S]*?)(?=\n\*\*Q:|\n###|\n##|$)/g;
  let match: RegExpExecArray | null;
  while ((match = qaRegex.exec(markdown)) !== null) {
    const q = match[1].trim();
    const a = match[2].trim();
    results.push(`**Q: ${q}**\nA: ${a}`);
  }
  return results;
}

async function validateQASequentially(qaStrings: string[], knowledgePath: string, useRandom: boolean = false) {
  const chalk = (await import('chalk')).default;
  
  // If random mode, pick one QA entry at random
  const qaToValidate = useRandom 
    ? [qaStrings[Math.floor(Math.random() * qaStrings.length)]]
    : qaStrings;
  
  if (useRandom) {
    console.log(chalk.bgYellow.black.bold('\n 🎲  RANDOM MODE ACTIVATED                                  '));
    console.log(chalk.yellowBright(`  Selected 1 random QA from ${qaStrings.length} total entries`));
    console.log(chalk.gray('─'.repeat(60)));
  }
  
  for (let i = 0; i < qaToValidate.length; i++) {
    const qa = qaToValidate[i];
    const displayIndex = useRandom 
      ? `[Random Selection]`
      : `${i + 1}/${qaToValidate.length}`;
    
    console.log(chalk.bgCyan.black.bold(`\n━━━ ▶️  Validating Q&A ${displayIndex} ━━━`));
    
    // Display the QA being validated
    const [questionPart, ...answerParts] = qa.split('\nA: ');
    const question = questionPart.replace('**Q: ', '').replace('**', '');
    console.log(chalk.yellowBright('\n❓ Question:'), chalk.cyanBright(question));
    if (answerParts.length > 0) {
      console.log(chalk.greenBright('📝 Current Answer:'));
      const answerLines = answerParts.join('\nA: ').split('\n');
      answerLines.forEach(line => {
        console.log(chalk.gray('   ' + line));
      });
    }
    console.log(chalk.gray('\n' + '─'.repeat(60)));
    
    // Start loading indicator
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinnerIndex = 0;
    const spinnerInterval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(spinnerFrames[spinnerIndex])} ${chalk.gray('[BACKGROUND CHECK] Processing validation...')}`);
      spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    }, 80);
    
    const prompt = buildValidationPrompt(qa, knowledgePath);
    const stream = query({
      prompt,
      options: {
        // Keep tools minimal; Bash enables file edits and Read allows inspection
        allowedTools: ["Read", "Bash"],
      },
    });

    // Clear the spinner line before outputting stream results
    let firstMessage = true;
    for await (const message of stream) {
      if (message.type === "result" && "result" in message) {
        if (firstMessage) {
          clearInterval(spinnerInterval);
          process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the spinner line
          firstMessage = false;
        }
        console.log(message.result);
      }
    }
    
    // Ensure spinner is cleared if no messages were received
    if (firstMessage) {
      clearInterval(spinnerInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
    }
    
    console.log(chalk.greenBright.bold(`\n✅ Validation ${displayIndex} Complete`));
    console.log(chalk.gray('═'.repeat(60)));
  }
}

function buildValidationPrompt(qa: string, knowledgePath: string): string {
  return (
    `You are a meticulous software documentation reviewer working inside a local repository.\n` +
    `Your task: given a single Q&A string from the knowledge base, verify that the answer is correct relative to the repository.\n` +
    `If the answer is incorrect, outdated, incomplete, or misleading, update the knowledge base file in-place to correct it.\n\n` +
    `Q&A string (verbatim):\n${qa}\n\n` +
    `Knowledge base file path (absolute or project-relative):\n${knowledgePath}\n\n` +
    `Instructions:\n` +
    `1) Use the Read tool to inspect relevant files as needed.\n` +
    `2) If an update is needed, use the Bash tool to edit ${knowledgePath} safely.\n` +
    `   - Locate the matching question in ${knowledgePath}.\n` +
    `   - Replace the associated answer with the corrected content.\n` +
    `   - Preserve the existing markdown structure and formatting (**Q: ...** on one line, A: ... on following lines).\n` +
    `3) If the Q&A is already correct, make no changes.\n` +
    `4) Print concise reasoning and the exact Bash commands you run.\n` +
    `5) Wait for each command to complete before issuing the next.\n`
  );
}

export async function checkAndUpdateKnowledgeBase(useRandom: boolean = false) {
  // const execFileAsync = promisify(execFile);  // Unused - keeping for future git worktree support
  const chalk = (await import('chalk')).default;
  chalk.level = 3; // Force colors


  // Determine repository root (this file runs from /server). The repo root is one level up.
  const repoRoot = path.resolve(process.cwd(), "..");

  // Create a dedicated git worktree outside the main working tree and operate within it.
  const worktreeInfo = { worktreeDir: repoRoot, branchName: "main" }; // const worktreeInfo = await createGitWorktree(repoRoot, execFileAsync);
  const knowledgePath = path.join(worktreeInfo.worktreeDir, "KNOWLEDGE.md");
  const knowledge = await readFile(knowledgePath, "utf-8");

  console.log(chalk.bgBlue.white.bold("\n===== 📦 Step 1: Extract Q&A strings with Anthropic ====="));
  
  // Loading indicator for extraction
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinnerIndex = 0;
  const extractSpinner = setInterval(() => {
    process.stdout.write(`\r${chalk.cyan(spinnerFrames[spinnerIndex])} ${chalk.gray('[BACKGROUND CHECK] Extracting Q&A entries from knowledge base...')}`);
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
  }, 80);
  
  const qaStrings = await extractQAStringsFromKnowledge(knowledge);
  console.log(`Discovered ${qaStrings.length} Q&A entr${qaStrings.length === 1 ? "y" : "ies"} to validate.`);
  
  clearInterval(extractSpinner);
  process.stdout.write('\r' + ' '.repeat(60) + '\r'); // Clear the spinner line
  
  console.log(chalk.greenBright(`✅ Discovered ${qaStrings.length} Q&A entr${qaStrings.length === 1 ? "y" : "ies"} to validate.`));
  
  if (qaStrings.length === 0) {
    console.log(chalk.yellowBright.bold('⚠️  No Q&A entries found in knowledge base'));
    return;
  }

  console.log("\n===== Step 2: Sequential validation with claude-code (in git worktree) =====");

  // Run the agent with CWD set to the worktree so tools operate within it
  const originalCwd = process.cwd();
  try {
    process.chdir(worktreeInfo.worktreeDir);
    await validateQASequentially(qaStrings, knowledgePath, useRandom);
  } finally {
    process.chdir(originalCwd);
  }
}

// Helpers
// Commenting out for now - will use when git worktree support is needed
/*
async function createGitWorktree(
  repoRoot: string,
  execFileAsync: (file: string, args?: readonly string[] | undefined, options?: any) => Promise<{ stdout: string; stderr: string }>
): Promise<{ worktreeDir: string; branchName: string }> {
  // Find current branch or fallback to HEAD
  let currentRef = "HEAD";
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoRoot });
    const branch = stdout.trim();
    currentRef = branch && branch !== "HEAD" ? branch : "HEAD";
  } catch {}

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const branchName = `claude-knowledge-validate-${timestamp}`;

  // Create a base directory for worktrees next to the repo root
  const siblingBase = path.resolve(repoRoot, "..", `${path.basename(repoRoot)}.worktrees`);
  await mkdir(siblingBase, { recursive: true });
  const worktreeDir = path.join(siblingBase, branchName);

  // Create the worktree off the current ref on a new branch
  await execFileAsync(
    "git",
    ["-C", repoRoot, "worktree", "add", "-b", branchName, worktreeDir, currentRef]
  );

  // Ensure the directory exists (git creates it, but be defensive)
  await mkdir(worktreeDir, { recursive: true });

  // Log where we're operating
  console.log(`Using git worktree at: ${worktreeDir} (branch ${branchName} from ${currentRef})`);

  return { worktreeDir, branchName };
}
*/

