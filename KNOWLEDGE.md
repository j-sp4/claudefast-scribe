# Scribe MCP Knowledge Base

Accumulated knowledge about the Scribe MCP server codebase for efficient development and troubleshooting.

## 🏗️ Project Overview

**Q: What is Scribe MCP?**
A: Crowd-sourced documentation system providing MCP (Model Context Protocol) tools for AI assistants (Claude Code, Cursor) to read, search, and improve documentation directly from coding environments.

**Q: What's the tech stack?**
A: • Next.js 15.5.0 (App Router, Turbopack)
   • TypeScript (strict mode)
   • mcp-handler v1.0.1 (MCP protocol)
   • @anthropic-ai/sdk (AI search)
   • Zod (runtime validation)
   • Chalk (console colors)

**Q: Where are key files located?**
A: • MCP handler: `/server/app/api/mcp/route.tsx`
   • Knowledge base: `/KNOWLEDGE.md` (project root)
   • Guidance doc: `/CLAUDE.md`
   • Dev logs: `/server/dev.log` (gitignored)
   • Server endpoint: `http://localhost:3000/api/mcp`

## 🛠️ MCP Tools

**Q: What tools are implemented?**
A: Two tools via mcp-handler with basePath '/api':
   • `ask_questions`: Searches knowledge base using Claude AI
   • `create_qa`: Adds new Q&A pairs with duplicate detection

**Q: How does ask_questions work?**
A: • Accepts array of questions
   • Reads KNOWLEDGE.md
   • Uses Claude Opus AI for intelligent search
   • Processes in parallel with Promise.all
   • Returns formatted responses or "NOT_FOUND"

**Q: How does create_qa handle duplicates?**
A: Multi-step duplicate detection:
   1. Creates normalized map (lowercase, no punctuation) for O(1) lookups
   2. Checks exact matches → skips if answer exists, merges if different
   3. Uses AI (claude-3-5-sonnet-20241022) for semantic similarity
   4. Intelligently merges similar answers
   5. Falls back to simple concatenation if AI fails

## ⚙️ Configuration

**Q: Required environment variables?**
A: `ANTHROPIC_API_KEY` - Required for AI search functionality

**Q: How to configure for Claude Code?**
A: Add to `~/.config/claude-code/mcp.json` or use existing `.cursor/mcp.json` pointing to `http://localhost:3000/api/mcp`

**Q: What AI models are used?**
A: • Search: Claude Opus (claude-3-opus-20240229) - Note: May be deprecated
   • Duplicate detection: claude-3-5-sonnet-20241022
   • Always include header: `'anthropic-version': '2023-06-01'`

**Q: Anthropic SDK initialization?**
A: ```javascript
new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  defaultHeaders: { 'anthropic-version': '2023-06-01' }
})
```

## 📦 Development

**Q: Essential npm commands?**
A: Run from `/server` directory:
   • `npm run dev` - Start dev server (http://localhost:3000)
   • `npm run build` - Production build
   • `npm run start` - Start production server
   • `npm run lint` - Run ESLint

**Q: How is logging configured?**
A: Dev script uses tee for dual output:
   `next dev --turbopack 2>&1 | tee dev.log`
   Captures stdout/stderr to `/server/dev.log` while displaying in terminal

## 🔧 Troubleshooting

**Q: Terminal colors not showing in logs?**
A: Chalk disables colors when piped. Fix:
   • Code: `chalk.level = 3` (after import)
   • NPM script: `FORCE_COLOR=3 next dev 2>&1 | tee dev.log`
   • Level 3 = truecolor with full RGB

**Q: How to test MCP endpoints?**
A: Use curl with:
   ```bash
   curl -X POST http://localhost:3000/api/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","method":"tools/call","params":{},"id":1}'
   ```
   Response format: Server-Sent Events (SSE) or JSON

**Q: MCP request/response format?**
A: • Requests: JSON-RPC 2.0 format
   • Responses: JSON or SSE
   • Clients must accept both `application/json` and `text/event-stream`

## 🐛 Known Issues & Fixes

**Q: Why did duplicate detection fail initially?**
A: • Used unavailable model (claude-opus-4-1-20250805)
   • Complex JSON parsing prone to failure
   • Regex didn't escape special characters properly

**Q: How was it fixed?**
A: • Pre-index questions in normalized map (O(1) lookups)
   • Simple string normalization for exact matches
   • Switched to claude-3-5-sonnet-20241022
   • Added AI failure fallbacks
   • Improved regex: `/\*\*Q: ([^*]+)\*\*\nA: ([^]*?)(?=\n\n\*\*Q:|---|\n\n##|$)/gm`

**Q: Anthropic API 404 errors?**
A: Model deprecated. Update to current model and ensure version header:
   • Old: claude-3-opus-20240229 (deprecated)
   • Current: claude-3-5-sonnet-20241022
   • Required header: `'anthropic-version': '2023-06-01'`

## 🎨 Console Formatting

**Q: How to format MCP server logs?**
A: Best practices with chalk:
   • Section headers: `'='.repeat(60)`
   • Emojis: 📋 (lists), ✅ (success), ⏭️ (skip), 🔀 (merge)
   • Colors: cyan (questions), green (success), yellow (warnings), gray (details)
   • Helper function: `logSection()` for formatted headers

**Q: Handling NOT_FOUND responses?**
A: Use `answer.trim().startsWith('NOT_FOUND')` not exact equality
   Allows AI to provide context about why no answer was found

## 📚 Implementation Details

**Q: How is knowledge base indexed?**
A: In-memory indexing during appendToKnowledgeBase():
   • Reads current KNOWLEDGE.md content
   • Parses with regex: `/\*\*Q: ([^*]+)\*\*\nA: ([^]*?)(?=\n\n\*\*Q:|---|\n\n##|$)/gm`
   • Creates Map with normalized keys (lowercase, stripped punctuation)
   • Map values: `{original: string, answer: string, position: number}`
   • Enables O(1) exact duplicate detection
   • Also performs AI-based semantic similarity checks when API key present
   • Merges similar answers intelligently using Claude AI
**Q: Where should debugging start?**
A: Check `/server/dev.log` first for:
   • MCP server errors
   • API route errors at `/api/mcp`
   • Next.js build/runtime errors
   • Request/response logs for tool invocations

**Q: How do I use NIA MCP to index external documentation from a URL?**
A: Use the `mcp__nia__index_documentation` tool with the URL parameter. The tool will:
1. Accept a URL (e.g., 'https://example.com/docs.md')
2. Return a source_id for tracking
3. Process the documentation in the background
4. Use `check_documentation_status` with the source_id to monitor progress
5. Once complete, the documentation becomes searchable via `search_documentation`

Example: `mcp__nia__index_documentation({url: 'https://eb83bf694590.ngrok-free.app/KNOWLEDGE.md', only_main_content: true})` returns a source_id that can be monitored.


**Q: What NIA MCP tools are available for working with documentation?**
A: Key NIA MCP tools for documentation:
• `mcp__nia__index_documentation` - Index docs from URLs with crawling options
• `mcp__nia__search_documentation` - Search indexed docs using natural language
• `mcp__nia__list_documentation` - List all indexed documentation sources
• `mcp__nia__check_documentation_status` - Monitor indexing progress using source_id
• `mcp__nia__delete_documentation` - Remove indexed documentation
• `mcp__nia__rename_documentation` - Rename documentation sources

The workflow is: index → monitor status → search when complete.


---
**Q: How is the /api/check endpoint currently implemented and what is its purpose?**
A: The /api/check endpoint is located at `/server/app/api/check/route.tsx`. It serves as a GET endpoint that validates Q&A entries in the KNOWLEDGE.md file. The endpoint:
1. Accepts an optional `?random` query parameter to validate either all QA entries or just one random entry
2. Calls `checkAndUpdateKnowledgeBase()` from the update-knowledge flow
3. Returns JSON response with status, mode, and timestamp
4. Logs colorful progress updates to console using chalk
5. Purpose: Automatically validates and updates outdated knowledge base entries using Claude API


**Q: Are there any existing loading indicators or progress tracking patterns in the codebase?**
A: After implementation, the codebase now uses animated spinner loading indicators in two places:
1. **During Q&A extraction**: Shows a spinner while calling Anthropic API to parse KNOWLEDGE.md
2. **During validation**: Shows a spinner for each Q&A entry being validated

The spinner uses:
- Braille pattern characters: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
- `setInterval` with 80ms updates
- `process.stdout.write` with `\r` for in-place updates
- Clears with spaces before showing stream output
- Styled with chalk colors (cyan spinner, gray text)


**Q: How are API requests handled in the server flows, particularly for long-running operations?**
A: Long-running operations in the server flows are handled as follows:
1. **Streaming responses**: The `query()` function from @anthropic-ai/claude-code returns an async iterator stream
2. **Sequential processing**: Q&A validations run one at a time in a for loop
3. **Console feedback**: Extensive chalk-colored logging shows progress at each step
4. **Loading indicators**: Spinners show during API calls (extraction and validation)
5. **Error handling**: Try-catch blocks in the route handler return appropriate HTTP status codes
6. **No timeout limits**: The validation runs to completion without enforced timeouts
