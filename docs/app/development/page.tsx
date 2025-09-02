import ContentLayout from '@/components/ContentLayout';

export default function Development() {
  return (
    <ContentLayout>
      <h1>Development Guide</h1>
      
      <p>
        This guide covers setting up a development environment, contributing to Scribe, 
        and understanding the development workflow.
      </p>

      <h2>Development Setup</h2>

      <h3>Prerequisites</h3>
      
      <ul>
        <li>Node.js 18+ (recommended: Node.js 20+)</li>
        <li>npm or pnpm package manager</li>
        <li>Git for version control</li>
        <li>Anthropic API key (optional, for AI features)</li>
        <li>Code editor with TypeScript support</li>
      </ul>

      <h3>Local Development</h3>
      
      <p>Clone and set up the development environment:</p>
      
      <pre><code>{`# Clone the repository
git clone <repository-url>
cd hackathon-scribe

# Install dependencies
cd server
npm install

# Set up environment variables
echo "ANTHROPIC_API_KEY=your_key_here" > .env.local

# Start development server
npm run dev`}</code></pre>

      <p>The development server will:</p>
      <ul>
        <li>Start on <code>http://localhost:3000</code></li>
        <li>Use Turbopack for fast builds and hot reloading</li>
        <li>Log all output to <code>dev.log</code> with colors</li>
        <li>Automatically restart on file changes</li>
      </ul>

      <h2>Project Structure</h2>

      <div className="bg-muted/50 p-4 rounded-lg border border-border mb-6">
        <pre><code>hackathon-scribe/
├── server/                     # Next.js application
│   ├── app/
│   │   ├── api/
│   │   │   ├── mcp/
│   │   │   │   └── route.tsx  # Main MCP handler
│   │   │   └── check/
│   │   │       └── route.tsx  # Validation endpoint
│   │   └── layout.tsx         # Root layout
│   ├── flows/
│   │   └── update-knowledge.ts # Knowledge validation logic
│   ├── package.json           # Dependencies and scripts
│   ├── tsconfig.json          # TypeScript configuration
│   └── dev.log               # Development logs (git-ignored)
├── docs/                      # Documentation site (this project)
├── KNOWLEDGE.md              # Knowledge base file
├── CLAUDE.md                 # Development instructions
├── mvp.md                    # MVP specification
└── mcp-crowd-docs-plan.md    # Full implementation plan</code></pre>
      </div>

      <h2>Key Development Files</h2>

      <h3>MCP Handler (route.tsx)</h3>
      
      <p>
        The main MCP implementation at <code>server/app/api/mcp/route.tsx</code> contains:
      </p>
      
      <ul>
        <li><strong>Tool Definitions:</strong> ask_questions and create_qa tools</li>
        <li><strong>AI Integration:</strong> Anthropic Claude API client setup</li>
        <li><strong>Knowledge Base Logic:</strong> File reading, parsing, and updating</li>
        <li><strong>Duplicate Detection:</strong> Multi-stage similarity checking</li>
      </ul>

      <h3>Knowledge Validation (update-knowledge.ts)</h3>
      
      <p>
        The validation system at <code>server/flows/update-knowledge.ts</code> provides:
      </p>
      
      <ul>
        <li><strong>Git Worktree Management:</strong> Isolated validation environments</li>
        <li><strong>Q&A Extraction:</strong> Parsing and validation of knowledge entries</li>
        <li><strong>Claude Code Integration:</strong> AI agent-based validation</li>
        <li><strong>Batch Processing:</strong> Full or random validation modes</li>
      </ul>

      <h2>Development Workflow</h2>

      <h3>Making Changes</h3>
      
      <ol>
        <li><strong>Start Development Server:</strong> <code>npm run dev</code></li>
        <li><strong>Make Changes:</strong> Edit TypeScript files</li>
        <li><strong>Test Changes:</strong> Use MCP client or curl to test endpoints</li>
        <li><strong>Check Logs:</strong> Monitor <code>dev.log</code> for errors</li>
        <li><strong>Commit:</strong> Use git for version control</li>
      </ol>

      <h3>Testing MCP Tools</h3>
      
      <p>Test the ask_questions tool:</p>
      
      <pre><code>curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "ask_questions",
      "arguments": {
        "questions": ["How does the system work?"]
      }
    },
    "id": "test"
  }'</code></pre>

      <p>Test the create_qa tool:</p>
      
      <pre><code>curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_qa",
      "arguments": {
        "qa_entries": [{
          "question": "What is this test?",
          "answer": "This is a test Q&A entry"
        }]
      }
    },
    "id": "test"
  }'</code></pre>

      <h2>Code Style and Standards</h2>

      <h3>TypeScript Configuration</h3>
      
      <ul>
        <li><strong>Strict Mode:</strong> All strict type checking enabled</li>
        <li><strong>Target:</strong> ES2017 for broad compatibility</li>
        <li><strong>Module System:</strong> ESNext with bundler resolution</li>
        <li><strong>Path Mapping:</strong> <code>@/*</code> aliases for clean imports</li>
      </ul>

      <h3>Code Conventions</h3>
      
      <ul>
        <li><strong>Async/Await:</strong> Preferred over Promises for readability</li>
        <li><strong>Error Handling:</strong> Comprehensive try-catch blocks</li>
        <li><strong>Logging:</strong> Use chalk for colored console output</li>
        <li><strong>Validation:</strong> Zod schemas for all external inputs</li>
      </ul>

      <h3>File Naming</h3>
      
      <ul>
        <li><strong>Components:</strong> PascalCase (e.g., <code>route.tsx</code>)</li>
        <li><strong>Utilities:</strong> camelCase (e.g., <code>update-knowledge.ts</code>)</li>
        <li><strong>Constants:</strong> UPPER_CASE for environment variables</li>
      </ul>

      <h2>Debugging</h2>

      <h3>Development Logs</h3>
      
      <p>
        The <code>dev.log</code> file contains comprehensive logging:
      </p>
      
      <pre><code># Watch logs in real-time
tail -f server/dev.log

# Search for specific operations
grep "ASK_QUESTIONS" server/dev.log
grep "ERROR" server/dev.log</code></pre>

      <h3>Common Issues</h3>
      
      <ul>
        <li><strong>Missing API Key:</strong> AI features disabled, check <code>.env.local</code></li>
        <li><strong>Port Conflicts:</strong> Ensure port 3000 is available</li>
        <li><strong>Knowledge Base Errors:</strong> Check <code>KNOWLEDGE.md</code> format</li>
        <li><strong>MCP Parsing:</strong> Validate JSON-RPC 2.0 request format</li>
      </ul>

      <h3>Debug Tools</h3>
      
      <ul>
        <li><strong>Browser DevTools:</strong> Network tab for HTTP requests</li>
        <li><strong>VS Code Debugger:</strong> Attach to Node.js process</li>
        <li><strong>Console Logging:</strong> Strategic console.log statements</li>
        <li><strong>Postman/curl:</strong> Direct API testing</li>
      </ul>

      <h2>Testing Strategy</h2>

      <h3>Manual Testing</h3>
      
      <p>Current testing approach focuses on manual verification:</p>
      
      <ul>
        <li><strong>MCP Tools:</strong> Test through Claude Code or curl</li>
        <li><strong>Knowledge Base:</strong> Verify Q&A additions and merging</li>
        <li><strong>AI Features:</strong> Test search and duplicate detection</li>
        <li><strong>Error Handling:</strong> Test with invalid inputs</li>
      </ul>

      <h3>Future Testing</h3>
      
      <p>Planned testing improvements:</p>
      
      <ul>
        <li><strong>Unit Tests:</strong> Jest for individual functions</li>
        <li><strong>Integration Tests:</strong> Full MCP request/response cycles</li>
        <li><strong>AI Testing:</strong> Mocked Claude responses for consistency</li>
        <li><strong>Performance Tests:</strong> Knowledge base scaling tests</li>
      </ul>

      <h2>Contributing Guidelines</h2>

      <h3>Before Contributing</h3>
      
      <ul>
        <li>Read the MVP specification in <code>mvp.md</code></li>
        <li>Understand the current architecture</li>
        <li>Set up the development environment</li>
        <li>Test the existing functionality</li>
      </ul>

      <h3>Contribution Process</h3>
      
      <ol>
        <li><strong>Fork:</strong> Create a fork of the repository</li>
        <li><strong>Branch:</strong> Create a feature branch from main</li>
        <li><strong>Develop:</strong> Make changes following code standards</li>
        <li><strong>Test:</strong> Verify functionality manually</li>
        <li><strong>Commit:</strong> Use descriptive commit messages</li>
        <li><strong>Pull Request:</strong> Submit with detailed description</li>
      </ol>

      <h3>Areas for Contribution</h3>
      
      <ul>
        <li><strong>Database Integration:</strong> PostgreSQL with pgvector</li>
        <li><strong>Authentication:</strong> GitHub OAuth implementation</li>
        <li><strong>UI Development:</strong> Web interface for knowledge management</li>
        <li><strong>Testing:</strong> Automated test suite</li>
        <li><strong>Documentation:</strong> API documentation and guides</li>
        <li><strong>Performance:</strong> Optimization and scaling improvements</li>
      </ul>

      <blockquote>
        <p>
          <strong>Important:</strong> Never run <code>pnpm run dev</code> as the development server 
          is managed automatically. There is no lint command configured for this project.
        </p>
      </blockquote>
    </ContentLayout>
  );
}