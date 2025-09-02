import ContentLayout from '@/components/ContentLayout';

export default function GettingStarted() {
  return (
    <ContentLayout>
      <h1>Getting Started with Scribe</h1>
      
      <p>
        Scribe is a crowd-sourced documentation system that provides MCP (Model Context Protocol) tools 
        for reading, searching, and improving documentation directly from AI coding assistants.
      </p>

      <h2>Overview</h2>
      
      <p>
        The system consists of a Next.js server that exposes MCP tools through HTTP endpoints, 
        allowing AI assistants to interact with a knowledge base stored in markdown format.
      </p>

      <h3>Key Components</h3>
      
      <ul>
        <li><strong>MCP Server:</strong> HTTP endpoint at <code>/api/mcp</code> that handles tool requests</li>
        <li><strong>Knowledge Base:</strong> Markdown file containing Q&A pairs at <code>KNOWLEDGE.md</code></li>
        <li><strong>AI Integration:</strong> Uses Anthropic's Claude AI for search and duplicate detection</li>
        <li><strong>Validation System:</strong> Automated checking and updating of knowledge base entries</li>
      </ul>

      <h3>Technology Stack</h3>
      
      <ul>
        <li><strong>Framework:</strong> Next.js 15.5.0 with App Router and Turbopack</li>
        <li><strong>MCP Handler:</strong> mcp-handler v1.0.1 for MCP protocol implementation</li>
        <li><strong>Language:</strong> TypeScript with strict type checking</li>
        <li><strong>AI Service:</strong> Anthropic Claude API</li>
        <li><strong>Validation:</strong> Zod for runtime schema validation</li>
      </ul>

      <h2>Core Features</h2>

      <h3>MCP Tools</h3>
      
      <p>Scribe currently provides two main MCP tools:</p>
      
      <ul>
        <li><code>ask_questions</code> - Search the knowledge base using AI-powered semantic search</li>
        <li><code>create_qa</code> - Add new Q&A pairs with intelligent duplicate detection</li>
      </ul>

      <h3>AI-Powered Search</h3>
      
      <p>
        The search functionality uses Claude Opus AI to intelligently find relevant information 
        from the knowledge base, providing contextual answers to development questions.
      </p>

      <h3>Duplicate Detection</h3>
      
      <p>
        Advanced multi-step duplicate detection system that includes:
      </p>
      
      <ul>
        <li>Normalized text comparison for exact matches</li>
        <li>AI-powered semantic similarity detection</li>
        <li>Intelligent answer merging for related questions</li>
      </ul>

      <h2>Development Workflow</h2>
      
      <p>
        The development server runs on port 3000 and automatically logs all activities to 
        <code>/server/dev.log</code> for debugging and monitoring purposes.
      </p>

      <blockquote>
        <p>
          <strong>Important:</strong> The development server is already running by default. 
          Never run <code>pnpm run dev</code> manually as it's handled automatically.
        </p>
      </blockquote>
    </ContentLayout>
  );
}