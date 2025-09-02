import ContentLayout from '@/components/ContentLayout';

export default function RestEndpoints() {
  return (
    <ContentLayout>
      <h1>REST Endpoints</h1>
      
      <p>
        In addition to MCP tools, Scribe provides REST API endpoints for direct HTTP access 
        to various system functions. These endpoints complement the MCP interface and provide 
        alternative access methods for different use cases.
      </p>

      <h2>Available Endpoints</h2>

      <div className="space-y-8">
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">/api/mcp</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded text-sm">GET</div>
            <div className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded text-sm">POST</div>
            <div className="bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded text-sm">DELETE</div>
          </div>
          
          <p className="text-muted-foreground mb-4">
            Primary MCP protocol endpoint for all tool interactions. Handles JSON-RPC 2.0 requests 
            and provides both JSON and Server-Sent Events responses.
          </p>
          
          <h4 className="font-semibold mb-2">Request Format</h4>
          <pre className="text-sm mb-4"><code>Content-Type: application/json

{JSON.stringify({
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": { /* tool arguments */ }
  },
  "id": "request_id"
}, null, 2)}</code></pre>

          <h4 className="font-semibold mb-2">Response Format</h4>
          <pre className="text-sm mb-4"><code>{JSON.stringify({
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Response content..."
      }
    ]
  },
  "id": "request_id"
}, null, 2)}</code></pre>

          <h4 className="font-semibold mb-2">Supported Tools</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><code>ask_questions</code> - Search knowledge base with AI</li>
            <li><code>create_qa</code> - Add new Q&A pairs with duplicate detection</li>
          </ul>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">/api/check</h3>
          
          <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded text-sm inline-block mb-4">GET</div>
          
          <p className="text-muted-foreground mb-4">
            Knowledge base validation endpoint that checks and updates outdated Q&A entries 
            using Claude Code agents in isolated Git worktrees.
          </p>
          
          <h4 className="font-semibold mb-2">Query Parameters</h4>
          <div className="bg-muted/50 p-3 rounded mb-4">
            <code>?random</code> - Optional parameter to validate only one random Q&A entry instead of all entries
          </div>

          <h4 className="font-semibold mb-2">Usage Examples</h4>
          <pre className="text-sm mb-4"><code># Validate all Q&A entries
GET /api/check

# Validate one random entry
GET /api/check?random</code></pre>

          <h4 className="font-semibold mb-2">Response Format</h4>
          <pre className="text-sm mb-4"><code>{JSON.stringify({
  "status": "success",
  "mode": "full", // or "random"
  "timestamp": "2024-01-15T10:30:00Z",
  "processed": 5,
  "updated": 2
}, null, 2)}</code></pre>

          <h4 className="font-semibold mb-2">Validation Process</h4>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Creates isolated Git worktree for safe validation</li>
            <li>Extracts Q&A pairs using Claude AI or regex fallback</li>
            <li>Validates each entry using Claude Code agents with file access</li>
            <li>Updates knowledge base in-place if corrections needed</li>
            <li>Returns validation statistics and results</li>
          </ol>

          <h4 className="font-semibold mb-2">Error Responses</h4>
          <pre className="text-sm mb-4"><code>{JSON.stringify({
  "error": "Validation failed",
  "details": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00Z"
}, null, 2)}</code></pre>
        </div>
      </div>

      <h2>HTTP Status Codes</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">Success Codes</h3>
          <ul className="space-y-2">
            <li><code>200 OK</code> - Request successful</li>
            <li><code>201 Created</code> - Resource created successfully</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">Error Codes</h3>
          <ul className="space-y-2">
            <li><code>400 Bad Request</code> - Invalid request format</li>
            <li><code>500 Internal Server Error</code> - Server error</li>
            <li><code>503 Service Unavailable</code> - AI service unavailable</li>
          </ul>
        </div>
      </div>

      <h2>Content Types</h2>

      <h3>Request Content Types</h3>
      <ul className="list-disc pl-6 mb-4">
        <li><code>application/json</code> - Standard JSON requests</li>
        <li><code>text/plain</code> - Simple text requests (limited support)</li>
      </ul>

      <h3>Response Content Types</h3>
      <ul className="list-disc pl-6 mb-6">
        <li><code>application/json</code> - Standard JSON responses</li>
        <li><code>text/event-stream</code> - Server-Sent Events for streaming</li>
        <li><code>text/plain</code> - Error messages and simple responses</li>
      </ul>

      <h2>Rate Limiting</h2>
      
      <p className="mb-4">
        Current implementation does not enforce explicit rate limiting, but requests are subject to:
      </p>
      
      <ul className="list-disc pl-6 mb-6">
        <li><strong>Anthropic API Limits:</strong> Subject to Claude API rate limits and quotas</li>
        <li><strong>File System Performance:</strong> Limited by disk I/O for knowledge base operations</li>
        <li><strong>Memory Constraints:</strong> In-memory indexing scales with knowledge base size</li>
        <li><strong>Concurrent Requests:</strong> Node.js event loop handles multiple requests</li>
      </ul>

      <h2>Authentication</h2>
      
      <p className="mb-4">
        Current implementation does not require authentication for REST endpoints:
      </p>
      
      <ul className="list-disc pl-6 mb-6">
        <li><strong>Local Development:</strong> Assumes localhost access with trusted environment</li>
        <li><strong>API Key Security:</strong> Anthropic API key secured via environment variables</li>
        <li><strong>Future Plans:</strong> GitHub OAuth planned for production deployments</li>
      </ul>

      <h2>Error Handling</h2>

      <h3>Common Error Responses</h3>

      <h4>Invalid JSON-RPC Request</h4>
      <pre className="text-sm mb-4"><code>{JSON.stringify({
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": "Request must be valid JSON-RPC 2.0"
  },
  "id": null
}, null, 2)}</code></pre>

      <h4>Unknown Tool</h4>
      <pre className="text-sm mb-4"><code>{JSON.stringify({
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": "Unknown tool: invalid_tool_name"
  },
  "id": "request_id"
}, null, 2)}</code></pre>

      <h4>Invalid Parameters</h4>
      <pre className="text-sm mb-4"><code>{JSON.stringify({
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": "Required parameter 'questions' is missing"
  },
  "id": "request_id"
}, null, 2)}</code></pre>

      <h2>Monitoring and Logging</h2>

      <h3>Request Logging</h3>
      <p className="mb-4">
        All REST endpoint requests are logged to <code>dev.log</code> with detailed information:
      </p>
      
      <ul className="list-disc pl-6 mb-6">
        <li><strong>Request Details:</strong> Method, path, parameters, timestamp</li>
        <li><strong>Response Status:</strong> HTTP status codes and response times</li>
        <li><strong>Error Details:</strong> Stack traces and error context</li>
        <li><strong>AI Operations:</strong> Claude API calls and responses</li>
      </ul>

      <h3>Performance Metrics</h3>
      <p className="mb-4">
        Development logs include performance information:
      </p>
      
      <ul className="list-disc pl-6 mb-6">
        <li><strong>Response Times:</strong> End-to-end request processing time</li>
        <li><strong>AI Latency:</strong> Claude API response times</li>
        <li><strong>File Operations:</strong> Knowledge base read/write performance</li>
        <li><strong>Memory Usage:</strong> In-memory indexing overhead</li>
      </ul>

      <blockquote>
        <p>
          <strong>Development Tip:</strong> Monitor <code>dev.log</code> in real-time with 
          <code>tail -f server/dev.log</code> to see detailed request processing and error information.
        </p>
      </blockquote>
    </ContentLayout>
  );
}