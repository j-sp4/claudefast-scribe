import ContentLayout from '@/components/ContentLayout';

export default function ApiReference() {
  return (
    <ContentLayout>
      <h1>API Reference</h1>
      
      <p>
        Scribe exposes its functionality through MCP tools and REST endpoints. This section 
        provides comprehensive documentation for all available APIs.
      </p>

      <h2>MCP Tools Overview</h2>

      <p>
        Scribe implements the Model Context Protocol (MCP) to provide tools that AI assistants 
        can use to interact with the knowledge base. All MCP tools are accessible through the 
        <code>/api/mcp</code> endpoint.
      </p>

      <h3>Protocol Details</h3>
      
      <ul>
        <li><strong>Protocol:</strong> JSON-RPC 2.0 over HTTP</li>
        <li><strong>Base Path:</strong> <code>/api</code></li>
        <li><strong>Endpoint:</strong> <code>http://localhost:3000/api/mcp</code></li>
        <li><strong>Content Types:</strong> <code>application/json</code>, <code>text/event-stream</code></li>
        <li><strong>Methods:</strong> GET, POST, DELETE</li>
      </ul>

      <h2>Available Tools</h2>

      <div className="grid gap-6 mb-8">
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">ask_questions</h3>
          <p className="text-muted-foreground mb-4">
            Search the knowledge base using AI-powered semantic search. Accepts an array of questions 
            and returns relevant answers from the knowledge base.
          </p>
          
          <h4 className="font-semibold mb-2">Parameters</h4>
          <div className="bg-muted/50 p-3 rounded mb-4">
            <code>questions: string[]</code> - Array of questions to search for
          </div>

          <h4 className="font-semibold mb-2">Example Request</h4>
          <pre className="text-sm"><code>{JSON.stringify({
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
              "name": "ask_questions",
              "arguments": {
                "questions": ["How does MCP work?", "What is the knowledge base format?"]
              }
            },
            "id": "1"
          }, null, 2)}</code></pre>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">create_qa</h3>
          <p className="text-muted-foreground mb-4">
            Add new question-answer pairs to the knowledge base with intelligent duplicate detection 
            and answer merging capabilities.
          </p>
          
          <h4 className="font-semibold mb-2">Parameters</h4>
          <div className="bg-muted/50 p-3 rounded mb-4">
            <code>qa_entries: QAEntry[]</code><br/>
            Where <code>QAEntry</code> is:
            <ul className="mt-2 ml-4">
              <li><code>question: string</code> - The question to add</li>
              <li><code>answer: string</code> - The answer to the question</li>
            </ul>
          </div>

          <h4 className="font-semibold mb-2">Example Request</h4>
          <pre className="text-sm"><code>{JSON.stringify({
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
              "name": "create_qa",
              "arguments": {
                "qa_entries": [{
                  "question": "How do I configure the API key?",
                  "answer": "Set ANTHROPIC_API_KEY in your .env.local file"
                }]
              }
            },
            "id": "2"
          }, null, 2)}</code></pre>
        </div>
      </div>

      <h2>Response Formats</h2>

      <h3>Successful Response</h3>
      
      <p>All successful tool calls return a content array:</p>
      
      <pre><code>{JSON.stringify({
        "jsonrpc": "2.0",
        "result": {
          "content": [
            {
              "type": "text",
              "text": "Response content here..."
            }
          ]
        },
        "id": "1"
      }, null, 2)}</code></pre>

      <h3>Error Response</h3>
      
      <p>Errors follow JSON-RPC 2.0 error format:</p>
      
      <pre><code>{JSON.stringify({
        "jsonrpc": "2.0",
        "error": {
          "code": -32600,
          "message": "Invalid Request",
          "data": "Additional error details"
        },
        "id": "1"
      }, null, 2)}</code></pre>

      <h2>Tool Behaviors</h2>

      <h3>ask_questions Behavior</h3>
      
      <ul>
        <li><strong>AI Search:</strong> Uses Claude Opus for intelligent semantic search</li>
        <li><strong>Parallel Processing:</strong> Processes multiple questions simultaneously</li>
        <li><strong>Fallback:</strong> Returns "NOT_FOUND" message for unanswered questions</li>
        <li><strong>Format:</strong> Returns formatted responses with questions and answers</li>
      </ul>

      <h3>create_qa Behavior</h3>
      
      <ul>
        <li><strong>Duplicate Detection:</strong> Three-stage process (exact, normalized, semantic)</li>
        <li><strong>Answer Merging:</strong> AI-powered intelligent merging of related answers</li>
        <li><strong>Statistics:</strong> Returns counts of added, merged, and skipped entries</li>
        <li><strong>Validation:</strong> Zod schema validation for all inputs</li>
      </ul>

      <h2>Authentication</h2>
      
      <p>
        Currently, Scribe does not implement authentication for MCP tools. The system relies on:
      </p>
      
      <ul>
        <li><strong>Local Access:</strong> Server typically runs on localhost</li>
        <li><strong>Environment Security:</strong> API keys secured via environment variables</li>
        <li><strong>Future Plans:</strong> GitHub OAuth planned for production deployments</li>
      </ul>

      <h2>Rate Limits</h2>
      
      <p>
        Current implementation has no explicit rate limiting, but is subject to:
      </p>
      
      <ul>
        <li><strong>Anthropic API Limits:</strong> Subject to Claude API rate limits</li>
        <li><strong>File I/O Limits:</strong> Limited by filesystem performance</li>
        <li><strong>Memory Constraints:</strong> In-memory indexing scales with knowledge base size</li>
      </ul>

      <blockquote>
        <p>
          <strong>Future Enhancement:</strong> The MVP specification includes plans for proper rate limiting, 
          authentication, and multi-project support with PostgreSQL storage.
        </p>
      </blockquote>
    </ContentLayout>
  );
}