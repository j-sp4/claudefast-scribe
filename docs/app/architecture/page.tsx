import ContentLayout from '@/components/ContentLayout';

export default function Architecture() {
  return (
    <ContentLayout>
      <h1>Architecture Overview</h1>
      
      <p>
        Scribe is built as a modular system that bridges AI coding assistants with a crowd-sourced 
        documentation platform through the Model Context Protocol (MCP).
      </p>

      <h2>System Architecture</h2>

      <h3>High-Level Components</h3>
      
      <div className="bg-muted/50 p-6 rounded-lg border border-border mb-6">
        <pre><code>┌─────────────────┐    MCP Protocol    ┌─────────────────┐
│   AI Assistant  │ ◄─────────────────► │  Scribe Server  │
│ (Claude Code)   │                     │   (Next.js)     │
└─────────────────┘                     └─────────────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ Knowledge Base  │
                                        │ (KNOWLEDGE.md)  │
                                        └─────────────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │   Claude AI     │
                                        │ (Search & NLP)  │
                                        └─────────────────┘</code></pre>
      </div>

      <h3>Core Components</h3>

      <h4>1. MCP Server Layer</h4>
      <ul>
        <li><strong>Location:</strong> <code>/server/app/api/mcp/route.tsx</code></li>
        <li><strong>Purpose:</strong> Handles MCP protocol communication with AI assistants</li>
        <li><strong>Framework:</strong> Next.js 15.5.0 API routes with mcp-handler</li>
        <li><strong>Endpoint:</strong> <code>http://localhost:3000/api/mcp</code></li>
      </ul>

      <h4>2. Knowledge Base</h4>
      <ul>
        <li><strong>Location:</strong> <code>/KNOWLEDGE.md</code> (project root)</li>
        <li><strong>Format:</strong> Structured markdown with Q&A pairs</li>
        <li><strong>Storage:</strong> File-based with in-memory indexing</li>
        <li><strong>Access:</strong> Read/write through Node.js fs operations</li>
      </ul>

      <h4>3. AI Integration Layer</h4>
      <ul>
        <li><strong>Service:</strong> Anthropic Claude API</li>
        <li><strong>Models:</strong> Claude Opus for search, Claude Sonnet for merging</li>
        <li><strong>Features:</strong> Semantic search, duplicate detection, answer merging</li>
        <li><strong>Configuration:</strong> API key via environment variables</li>
      </ul>

      <h4>4. Validation System</h4>
      <ul>
        <li><strong>Location:</strong> <code>/server/flows/update-knowledge.ts</code></li>
        <li><strong>Purpose:</strong> Validates and updates knowledge base entries</li>
        <li><strong>Features:</strong> Git worktree isolation, automated verification</li>
        <li><strong>Endpoint:</strong> <code>/api/check</code> for manual validation</li>
      </ul>

      <h2>Request Flow</h2>

      <h3>ask_questions Flow</h3>
      
      <div className="bg-muted/50 p-4 rounded-lg border border-border mb-6">
        <pre><code>1. AI Assistant → MCP Request → Scribe Server
2. Scribe Server → Read KNOWLEDGE.md → File System
3. Scribe Server → Search Query → Claude AI
4. Claude AI → Semantic Analysis → Relevant Q&As
5. Scribe Server → Formatted Response → AI Assistant</code></pre>
      </div>

      <h3>create_qa Flow</h3>
      
      <div className="bg-muted/50 p-4 rounded-lg border border-border mb-6">
        <pre><code>1. AI Assistant → New Q&A → Scribe Server
2. Scribe Server → Parse Existing → KNOWLEDGE.md
3. Scribe Server → Duplicate Check → Normalized Map
4. Scribe Server → Semantic Check → Claude AI (if API key)
5. Scribe Server → Merge/Add → Update KNOWLEDGE.md
6. Scribe Server → Status Response → AI Assistant</code></pre>
      </div>

      <h2>Data Structures</h2>

      <h3>Knowledge Base Format</h3>
      
      <p>The knowledge base uses a standardized markdown format:</p>
      
      <pre><code># Knowledge Base

## Q&A Entries

**Q: How does the system work?**
A: The system uses MCP protocol to connect AI assistants...

**Q: What technologies are used?**
A: Next.js 15.5.0, TypeScript, Anthropic AI, mcp-handler...

---</code></pre>

      <h3>In-Memory Index Structure</h3>
      
      <p>For efficient duplicate detection:</p>
      
      <pre><code>{`Map<string, {
  original: string,    // Original question text
  answer: string,      // Current answer
  position: number     // Position in file
}>`}</code></pre>

      <p>Where the key is normalized (lowercase, no punctuation) for O(1) lookups.</p>

      <h2>AI Integration Architecture</h2>

      <h3>Model Selection</h3>
      
      <ul>
        <li><strong>Claude Opus (claude-3-5-sonnet-20240620):</strong> Primary search model</li>
        <li><strong>Claude Sonnet (claude-3-5-sonnet-20241022):</strong> Duplicate detection and merging</li>
        <li><strong>Fallback:</strong> Local parsing when AI is unavailable</li>
      </ul>

      <h3>AI Prompting Strategy</h3>
      
      <h4>Search Prompts</h4>
      <ul>
        <li>System: Expert knowledge base searcher</li>
        <li>Task: Quote relevant Q&A pairs exactly</li>
        <li>Fallback: Return "NOT_FOUND" if no matches</li>
      </ul>

      <h4>Duplicate Detection Prompts</h4>
      <ul>
        <li>System: Expert at finding semantically similar questions</li>
        <li>Task: Identify if questions ask the same thing</li>
        <li>Output: Question number or "NONE"</li>
      </ul>

      <h4>Merging Prompts</h4>
      <ul>
        <li>System: Expert at merging knowledge base answers</li>
        <li>Task: Combine information comprehensively</li>
        <li>Output: Clean merged answer without explanation</li>
      </ul>

      <h2>Scalability Considerations</h2>

      <h3>Current Limitations</h3>
      
      <ul>
        <li>File-based storage (single KNOWLEDGE.md file)</li>
        <li>In-memory indexing (rebuilt on each request)</li>
        <li>Synchronous processing (no background jobs)</li>
        <li>Single-server deployment model</li>
      </ul>

      <h3>Future Enhancements</h3>
      
      <p>Based on the MVP specification (<code>mvp.md</code>), planned improvements include:</p>
      
      <ul>
        <li><strong>Database Storage:</strong> PostgreSQL with pgvector for semantic search</li>
        <li><strong>Multi-project Support:</strong> Project/topic organization</li>
        <li><strong>Version Control:</strong> Document revisions and approval workflows</li>
        <li><strong>User Management:</strong> Authentication and role-based access</li>
        <li><strong>Background Processing:</strong> Async re-indexing and validation</li>
      </ul>

      <h2>Error Handling</h2>

      <h3>AI Service Failures</h3>
      
      <ul>
        <li><strong>Search:</strong> Falls back to "NOT_FOUND" response</li>
        <li><strong>Duplicate Detection:</strong> Skips semantic analysis, uses exact matching</li>
        <li><strong>Merging:</strong> Falls back to simple concatenation</li>
      </ul>

      <h3>File System Errors</h3>
      
      <ul>
        <li><strong>Missing KNOWLEDGE.md:</strong> Creates initial file with template</li>
        <li><strong>Write Failures:</strong> Returns error to client with details</li>
        <li><strong>Parsing Errors:</strong> Uses regex fallback for Q&A extraction</li>
      </ul>

      <h2>Development Architecture</h2>

      <h3>Hot Reloading</h3>
      
      <p>
        Next.js with Turbopack enables fast development cycles with automatic reloading 
        of changes to the MCP handlers and API routes.
      </p>

      <h3>Logging Architecture</h3>
      
      <p>
        Comprehensive logging system with color-coded output:
      </p>
      
      <ul>
        <li><strong>Console:</strong> Real-time colored output using chalk</li>
        <li><strong>File:</strong> All output teed to <code>dev.log</code></li>
        <li><strong>Levels:</strong> Different colors for operations (add, merge, skip, search)</li>
      </ul>

      <h3>Git Integration</h3>
      
      <p>
        The validation system uses Git worktrees for safe testing:
      </p>
      
      <ul>
        <li>Creates isolated worktrees for validation</li>
        <li>Prevents conflicts with main development</li>
        <li>Enables safe testing of knowledge base updates</li>
      </ul>

      <blockquote>
        <p>
          This architecture provides a solid foundation for a crowd-sourced documentation system 
          while maintaining simplicity and reliability for the current use case.
        </p>
      </blockquote>
</ContentLayout>
  );
}