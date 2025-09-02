import ContentLayout from '@/components/ContentLayout';

export default function Installation() {
  return (
    <ContentLayout>
      <h1>Installation</h1>
      
      <p>
        This guide walks you through setting up Scribe for development and configuring it 
        with MCP clients like Claude Code or Cursor.
      </p>

      <h2>Prerequisites</h2>
      
      <ul>
        <li>Node.js 18+ (recommended: Node.js 20+)</li>
        <li>npm or pnpm package manager</li>
        <li>Anthropic API key (required for AI features)</li>
        <li>Git for version control</li>
      </ul>

      <h2>Project Setup</h2>

      <h3>1. Clone the Repository</h3>
      
      <pre><code>git clone &lt;repository-url&gt;
cd hackathon-scribe</code></pre>

      <h3>2. Install Dependencies</h3>
      
      <p>Navigate to the server directory and install dependencies:</p>
      
      <pre><code>cd server
npm install</code></pre>

      <p>Dependencies include:</p>
      <ul>
        <li><code>next@15.5.0</code> - React framework with App Router</li>
        <li><code>@anthropic-ai/sdk</code> - Anthropic Claude API client</li>
        <li><code>mcp-handler@1.0.1</code> - MCP protocol implementation</li>
        <li><code>zod</code> - Runtime schema validation</li>
        <li><code>chalk</code> - Terminal color output</li>
      </ul>

      <h3>3. Environment Configuration</h3>
      
      <p>Create a <code>.env.local</code> file in the server directory:</p>
      
      <pre><code>ANTHROPIC_API_KEY=your_anthropic_api_key_here</code></pre>

      <blockquote>
        <p>
          <strong>Note:</strong> The Anthropic API key is required for AI-powered search and 
          duplicate detection features. Without it, these features will be disabled.
        </p>
      </blockquote>

      <h2>Development Server</h2>

      <h3>Starting the Server</h3>
      
      <p>The development server uses Turbopack for faster builds:</p>
      
      <pre><code>npm run dev</code></pre>

      <p>This command:</p>
      <ul>
        <li>Starts Next.js dev server with Turbopack on <code>http://localhost:3000</code></li>
        <li>Enables colored output with <code>FORCE_COLOR=3</code></li>
        <li>Pipes logs to <code>dev.log</code> for debugging</li>
      </ul>

      <h3>Development Logs</h3>
      
      <p>
        All development server activities are automatically logged to <code>/server/dev.log</code>. 
        This includes:
      </p>
      
      <ul>
        <li>MCP server errors and debugging information</li>
        <li>API route errors at <code>/api/mcp</code></li>
        <li>Next.js build and runtime errors</li>
        <li>Request/response logs for MCP tool invocations</li>
      </ul>

      <blockquote>
        <p>
          <strong>Important:</strong> When debugging MCP server issues, always check 
          <code>/server/dev.log</code> first for detailed error messages and stack traces.
        </p>
      </blockquote>

      <h2>MCP Client Configuration</h2>

      <h3>Claude Code Integration</h3>
      
      <p>To use Scribe with Claude Code:</p>
      
      <ol>
        <li>Ensure the development server is running on <code>http://localhost:3000</code></li>
        <li>Configure your MCP client to connect to <code>http://localhost:3000/api/mcp</code></li>
        <li>The server exposes tools via the mcp-handler library with basePath <code>/api</code></li>
      </ol>

      <h3>Cursor Integration</h3>
      
      <p>For Cursor IDE integration:</p>
      
      <ol>
        <li>Add the MCP server configuration to your Cursor settings</li>
        <li>Point to <code>http://localhost:3000/api/mcp</code></li>
        <li>Ensure the server accepts both <code>application/json</code> and <code>text/event-stream</code> requests</li>
      </ol>

      <h2>Verification</h2>

      <p>To verify your installation:</p>
      
      <ol>
        <li>Visit <code>http://localhost:3000</code> to see the Next.js application</li>
        <li>Check that <code>http://localhost:3000/api/mcp</code> responds to MCP requests</li>
        <li>Verify the <code>KNOWLEDGE.md</code> file exists in the project root</li>
        <li>Test MCP tools through your configured client</li>
      </ol>

      <h2>Production Build</h2>

      <p>For production deployment:</p>
      
      <pre><code># Build the application
npm run build

# Start production server
npm run start</code></pre>

      <p>
        The production build uses Turbopack for optimized performance and should be deployed 
        to a service that supports Node.js applications.
      </p>
    </ContentLayout>
  );
}