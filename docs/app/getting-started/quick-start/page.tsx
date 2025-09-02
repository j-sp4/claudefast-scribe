import ContentLayout from '@/components/ContentLayout';

export default function QuickStart() {
  return (
    <ContentLayout>
      <h1>Quick Start Guide</h1>
      
      <p>
        Get up and running with Scribe in minutes. This guide assumes you've completed the 
        installation steps and have a working development environment.
      </p>

      <h2>Step 1: Verify Installation</h2>
      
      <p>First, ensure your development server is running:</p>
      
      <pre><code>cd server
npm run dev</code></pre>

      <p>You should see output indicating the server started on <code>http://localhost:3000</code>.</p>

      <h2>Step 2: Test MCP Tools</h2>

      <h3>Using ask_questions Tool</h3>
      
      <p>
        The <code>ask_questions</code> tool searches the knowledge base for answers to your questions. 
        Here's how to use it via MCP:
      </p>
      
      <pre><code>{`# Example MCP request
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "ask_questions",
    "arguments": {
      "questions": ["What is the MCP tool interface for Scribe?"]
    }
  },
  "id": "1"
}`}</code></pre>

      <h3>Using create_qa Tool</h3>
      
      <p>
        The <code>create_qa</code> tool adds new question-answer pairs to the knowledge base:
      </p>
      
      <pre><code>{`# Example MCP request
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_qa",
    "arguments": {
      "qa_entries": [{
        "question": "How do I configure environment variables?",
        "answer": "Create a .env.local file with ANTHROPIC_API_KEY=your_key"
      }]
    }
  },
  "id": "2"
}`}</code></pre>

      <h2>Step 3: Configure Your IDE</h2>

      <h3>Claude Code Configuration</h3>
      
      <p>If using Claude Code, the MCP server should be automatically detected. Verify by:</p>
      
      <ol>
        <li>Opening Claude Code in your project directory</li>
        <li>Testing the <code>ask_questions</code> tool with a sample question</li>
        <li>Checking the <code>/server/dev.log</code> for MCP requests</li>
      </ol>

      <h3>Manual MCP Client Setup</h3>
      
      <p>For other MCP clients, configure:</p>
      
      <ul>
        <li><strong>Server URL:</strong> <code>http://localhost:3000/api/mcp</code></li>
        <li><strong>Content Types:</strong> Accept both <code>application/json</code> and <code>text/event-stream</code></li>
        <li><strong>Base Path:</strong> <code>/api</code></li>
      </ul>

      <h2>Step 4: Explore the Knowledge Base</h2>

      <p>
        Open <code>KNOWLEDGE.md</code> in the project root to see the current knowledge base. 
        This file contains Q&A pairs in the format:
      </p>
      
      <pre><code>**Q: Your question here**
A: Your answer here

**Q: Another question**
A: Another answer</code></pre>

      <h2>Step 5: Test AI Features</h2>

      <p>
        If you've configured your Anthropic API key, test the AI-powered features:
      </p>

      <h3>AI Search</h3>
      
      <p>Ask a question that requires semantic understanding:</p>
      
      <pre><code>ask_questions(["How does duplicate detection work?"])</code></pre>

      <p>The system will use Claude AI to search for relevant information.</p>

      <h3>Duplicate Detection</h3>
      
      <p>Try adding a similar question to test duplicate detection:</p>
      
      <pre><code>create_qa({
  "qa_entries": [{
    "question": "How does the system detect duplicate questions?",
    "answer": "Uses AI-powered semantic similarity detection"
  }]
})</code></pre>

      <p>The system will detect if this is similar to existing questions and merge appropriately.</p>

      <h2>Step 6: Monitor Development Logs</h2>

      <p>
        Watch the development logs in real-time to understand how the system works:
      </p>
      
      <pre><code>tail -f server/dev.log</code></pre>

      <p>You'll see colored output showing:</p>
      <ul>
        <li>🔍 Search operations</li>
        <li>✅ New Q&A additions</li>
        <li>🔀 Answer merging</li>
        <li>⏭️ Duplicate skipping</li>
      </ul>

      <h2>Common Use Cases</h2>

      <h3>Building Project Documentation</h3>
      
      <p>Use Scribe to build comprehensive project documentation:</p>
      
      <ol>
        <li>Ask questions about your codebase using <code>ask_questions</code></li>
        <li>Add new discoveries using <code>create_qa</code></li>
        <li>Let the AI merge related information automatically</li>
      </ol>

      <h3>Team Knowledge Sharing</h3>
      
      <p>Create a shared knowledge base for your team:</p>
      
      <ol>
        <li>Document solutions to common problems</li>
        <li>Share architectural decisions and reasoning</li>
        <li>Build searchable troubleshooting guides</li>
      </ol>

      <h2>Next Steps</h2>
      
      <ul>
        <li>Explore the <a href="/architecture">Architecture</a> section to understand the system design</li>
        <li>Check the <a href="/api">API Reference</a> for detailed tool specifications</li>
        <li>Review <a href="/features">Features</a> to learn about advanced capabilities</li>
        <li>See <a href="/development">Development</a> for contribution guidelines</li>
      </ul>

      <blockquote>
        <p>
          <strong>Tip:</strong> The more you use Scribe, the more valuable your knowledge base becomes. 
          The AI-powered search and duplicate detection ensure information stays organized and accessible.
        </p>
      </blockquote>
    </ContentLayout>
  );
}