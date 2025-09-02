import ContentLayout from '@/components/ContentLayout';

export default function McpProtocol() {
  return (
    <ContentLayout>
      <h1>MCP Protocol Implementation</h1>
      
      <p>
        This page details how Scribe implements the Model Context Protocol (MCP) to enable 
        seamless integration with AI coding assistants.
      </p>

      <h2>Protocol Overview</h2>

      <p>
        The Model Context Protocol is a standardized way for AI applications to connect 
        with external data sources and tools. Scribe implements MCP to provide AI assistants 
        with direct access to crowd-sourced documentation.
      </p>

      <h3>Protocol Specifications</h3>
      
      <ul>
        <li><strong>Version:</strong> JSON-RPC 2.0</li>
        <li><strong>Transport:</strong> HTTP with POST method</li>
        <li><strong>Content Types:</strong> <code>application/json</code>, <code>text/event-stream</code></li>
        <li><strong>Base Path:</strong> <code>/api</code></li>
        <li><strong>Handler Library:</strong> mcp-handler v1.0.1</li>
      </ul>

      <h2>Implementation Architecture</h2>

      <h3>Handler Configuration</h3>
      
      <p>The MCP handler is configured in <code>server/app/api/mcp/route.tsx</code>:</p>
      
      <pre><code>{`const handler = createMcpHandler(
  (server) => {
    // Tool definitions here
  },
  {}, // Server options
  {
    basePath: '/api'
  }
);

export { handler as GET, handler as POST, handler as DELETE };`}</code></pre>

      <h3>Tool Registration</h3>
      
      <p>Tools are registered using the server.tool() method:</p>
      
      <pre><code>{`server.tool(
  'tool_name',
  'Tool description for AI assistants',
  {
    parameter_name: z.type().describe("Parameter description")
  },
  async (args) => {
    // Tool implementation
    return {
      content: [{ type: 'text', text: 'Response' }]
    };
  }
);`}</code></pre>

      <h2>Request/Response Flow</h2>

      <h3>Incoming Request Processing</h3>
      
      <div className="bg-muted/50 p-4 rounded-lg border border-border mb-6">
        <pre><code>1. HTTP Request → Next.js API Route
2. JSON-RPC Parsing → mcp-handler
3. Tool Identification → Registered tools
4. Parameter Validation → Zod schemas
5. Tool Execution → Business logic
6. Response Formatting → JSON-RPC 2.0</code></pre>
      </div>

      <h3>Response Formats</h3>

      <h4>Successful Tool Call</h4>
      <pre><code>{JSON.stringify({
        "jsonrpc": "2.0",
        "result": {
          "content": [
            {
              "type": "text", 
              "text": "Tool response content"
            }
          ]
        },
        "id": "client_request_id"
      }, null, 2)}</code></pre>

      <h4>Error Response</h4>
      <pre><code>{JSON.stringify({
        "jsonrpc": "2.0",
        "error": {
          "code": -32602,
          "message": "Invalid params",
          "data": "Detailed error information"
        },
        "id": "client_request_id"
      }, null, 2)}</code></pre>

      <h2>Tool Implementation Details</h2>

      <h3>ask_questions Tool</h3>

      <pre><code>{`server.tool(
  'ask_questions',
  'Asks questions about the codebase...',
  {
    questions: z.array(z.string()).describe("Array of questions...")
  },
  async ({ questions }) => {
    // 1. Read knowledge base
    const knowledgeContent = await readKnowledgeBase();
    
    // 2. Process questions in parallel
    const responses = await Promise.all(
      questions.map(async (question) => {
        const answer = await searchKnowledgeBaseWithAI(
          knowledgeContent, 
          question
        );
        return { question, answer: answer || "NOT_FOUND" };
      })
    );
    
    // 3. Format and return response
    const formattedResponse = responses
      .map(r => \`**Question:** \${r.question}\\n\\n**Answer:** \${r.answer}\`)
      .join('\\n\\n---\\n\\n');
    
    return {
      content: [{ type: 'text', text: formattedResponse }]
    };
  }
);`}</code></pre>

      <h3>create_qa Tool</h3>

      <pre><code>server.tool(
  'create_qa',
  'Create new question and answer pairs...',
  {
    qa_entries: z.array(z.object({
      question: z.string().describe("The question..."),
      answer: z.string().describe("The answer...")
    })).describe("The question and answer pairs...")
  },
  async ({ qa_entries }) => {
    // 1. Process entries with duplicate detection
    const stats = await appendToKnowledgeBase(qa_entries);
    
    // 2. Format response with statistics
    let message = `Processed ${qa_entries.length} Q&A pair(s):\n`;
    if (stats.added > 0) message += `- Added ${stats.added} new question(s)\n`;
    if (stats.merged > 0) message += `- Merged ${stats.merged} answer(s)\n`;
    if (stats.skipped > 0) message += `- Skipped ${stats.skipped} duplicate(s)\n`;
    
    return {
      content: [{ type: 'text', text: message.trim() }]
    };
  }
);</code></pre>

      <h2>Parameter Validation</h2>

      <h3>Zod Schema Validation</h3>
      
      <p>All tool parameters are validated using Zod schemas:</p>
      
      <pre><code>// String array validation
z.array(z.string()).describe("Array description")

// Object validation  
z.object({
  question: z.string().describe("Question description"),
  answer: z.string().describe("Answer description")
})

// Array of objects
z.array(z.object({
  // object properties
})).describe("Array of objects description")</code></pre>

      <h3>Validation Error Handling</h3>
      
      <p>Invalid parameters automatically return JSON-RPC error responses:</p>
      
      <pre><code>{JSON.stringify({
        "jsonrpc": "2.0",
        "error": {
          "code": -32602,
          "message": "Invalid params",
          "data": "Expected array, received string"
        },
        "id": "request_id"
      }, null, 2)}</code></pre>

      <h2>Streaming Responses</h2>

      <h3>Server-Sent Events</h3>
      
      <p>
        The MCP handler supports streaming responses for real-time updates. 
        While not currently implemented in Scribe's tools, the infrastructure supports:
      </p>
      
      <ul>
        <li><strong>Content-Type:</strong> <code>text/event-stream</code></li>
        <li><strong>Real-time Updates:</strong> Progressive response streaming</li>
        <li><strong>Error Handling:</strong> Mid-stream error recovery</li>
        <li><strong>Client Compatibility:</strong> Automatic format detection</li>
      </ul>

      <h2>Client Integration</h2>

      <h3>Claude Code Integration</h3>
      
      <p>Configuration for Claude Code MCP client:</p>
      
      <ul>
        <li><strong>Server URL:</strong> <code>http://localhost:3000/api/mcp</code></li>
        <li><strong>Transport:</strong> HTTP with JSON-RPC 2.0</li>
        <li><strong>Authentication:</strong> None (localhost development)</li>
        <li><strong>Tools:</strong> Auto-discovered from server capabilities</li>
      </ul>

      <h3>Custom MCP Clients</h3>
      
      <p>For implementing custom MCP clients:</p>
      
      <pre><code>// Example MCP client request
const response = await fetch('http://localhost:3000/api/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'ask_questions',
      arguments: {
        questions: ['How does this work?']
      }
    },
    id: 'client_generated_id'
  })
});

const result = await response.json();</code></pre>

      <h2>Error Handling</h2>

      <h3>JSON-RPC Error Codes</h3>
      
      <table className="w-full border-collapse border border-border">
        <thead>
          <tr className="bg-muted/50">
            <th className="border border-border p-2 text-left">Code</th>
            <th className="border border-border p-2 text-left">Message</th>
            <th className="border border-border p-2 text-left">Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-border p-2">-32700</td>
            <td className="border border-border p-2">Parse error</td>
            <td className="border border-border p-2">Invalid JSON</td>
          </tr>
          <tr>
            <td className="border border-border p-2">-32600</td>
            <td className="border border-border p-2">Invalid Request</td>
            <td className="border border-border p-2">Invalid JSON-RPC</td>
          </tr>
          <tr>
            <td className="border border-border p-2">-32601</td>
            <td className="border border-border p-2">Method not found</td>
            <td className="border border-border p-2">Unknown tool</td>
          </tr>
          <tr>
            <td className="border border-border p-2">-32602</td>
            <td className="border border-border p-2">Invalid params</td>
            <td className="border border-border p-2">Parameter validation failed</td>
          </tr>
          <tr>
            <td className="border border-border p-2">-32603</td>
            <td className="border border-border p-2">Internal error</td>
            <td className="border border-border p-2">Server-side error</td>
          </tr>
        </tbody>
      </table>

      <h3>Custom Error Handling</h3>
      
      <p>Tools can return custom errors with additional context:</p>
      
      <pre><code>// In tool implementation
try {
  // Tool logic
} catch (error) {
  return {
    error: {
      code: -32603,
      message: "Internal error",
      data: `Operation failed: ${error.message}`
    }
  };
}</code></pre>

      <h2>Development and Debugging</h2>

      <h3>Logging Integration</h3>
      
      <p>MCP requests and responses are logged with colored output:</p>
      
      <pre><code>console.log(chalk.bgCyan.black.bold(' MCP TOOL: ASK_QUESTIONS '));
console.log(chalk.magentaBright.bold('🔍 Questions Received:'));
questions.forEach((q, i) => {
  console.log(
    chalk.bgMagenta.white.bold(` ${i + 1} `),
    chalk.yellowBright('▶'),
    chalk.cyanBright.bold(q)
  );
});</code></pre>

      <h3>Development Tools</h3>
      
      <ul>
        <li><strong>curl Testing:</strong> Direct HTTP requests to test tools</li>
        <li><strong>Browser DevTools:</strong> Network tab for request inspection</li>
        <li><strong>Log Monitoring:</strong> <code>tail -f dev.log</code> for real-time logs</li>
        <li><strong>JSON-RPC Validators:</strong> Online tools for request format validation</li>
      </ul>

      <blockquote>
        <p>
          <strong>Protocol Adherence:</strong> Scribe strictly follows JSON-RPC 2.0 specifications 
          to ensure compatibility with all MCP clients and maximize interoperability.
        </p>
      </blockquote>
    </ContentLayout>
  );
}