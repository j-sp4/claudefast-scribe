import ContentLayout from '@/components/ContentLayout';

export default function Features() {
  return (
    <ContentLayout>
      <h1>Features Overview</h1>
      
      <p>
        Scribe provides advanced AI-powered features for building and maintaining crowd-sourced 
        documentation. These features work together to create a seamless experience for both 
        contributors and consumers of documentation.
      </p>

      <h2>Core Features</h2>

      <div className="grid gap-6 mb-8">
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            🔍 AI-Powered Search
          </h3>
          <p className="text-muted-foreground mb-4">
            Intelligent knowledge base search using Claude AI for semantic understanding 
            and contextual responses to development questions.
          </p>
          <ul className="space-y-1">
            <li>• <strong>Model:</strong> Claude Opus for advanced reasoning</li>
            <li>• <strong>Processing:</strong> Parallel question processing</li>
            <li>• <strong>Context:</strong> Full knowledge base context for each query</li>
            <li>• <strong>Fallback:</strong> Graceful handling when information isn't found</li>
          </ul>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            🔀 Intelligent Duplicate Detection
          </h3>
          <p className="text-muted-foreground mb-4">
            Advanced multi-stage duplicate detection system that prevents redundant 
            information while intelligently merging related content.
          </p>
          <ul className="space-y-1">
            <li>• <strong>Stage 1:</strong> Exact normalized text matching (O(1) lookup)</li>
            <li>• <strong>Stage 2:</strong> Semantic similarity detection using AI</li>
            <li>• <strong>Stage 3:</strong> Intelligent answer merging and consolidation</li>
            <li>• <strong>Fallback:</strong> Simple concatenation when AI is unavailable</li>
          </ul>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            ✅ Knowledge Validation
          </h3>
          <p className="text-muted-foreground mb-4">
            Automated system for validating and updating knowledge base entries 
            to ensure accuracy and relevance over time.
          </p>
          <ul className="space-y-1">
            <li>• <strong>Git Worktrees:</strong> Isolated validation environments</li>
            <li>• <strong>AI Verification:</strong> Claude Code agents verify accuracy</li>
            <li>• <strong>Batch Processing:</strong> Validate all or random entries</li>
            <li>• <strong>Safe Updates:</strong> In-place updates with error handling</li>
          </ul>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            🔄 Real-time Updates
          </h3>
          <p className="text-muted-foreground mb-4">
            Live streaming updates and comprehensive logging provide real-time 
            visibility into system operations and knowledge base changes.
          </p>
          <ul className="space-y-1">
            <li>• <strong>Live Logs:</strong> Colored console output with operation status</li>
            <li>• <strong>File Logging:</strong> Persistent logs in dev.log</li>
            <li>• <strong>Operation Tracking:</strong> Visual indicators for add/merge/skip</li>
            <li>• <strong>Error Handling:</strong> Detailed error reporting and recovery</li>
          </ul>
        </div>
      </div>

      <h2>Advanced Features</h2>

      <h3>MCP Integration</h3>
      
      <p>
        Seamless integration with Model Context Protocol enables AI assistants to directly 
        interact with the documentation system:
      </p>
      
      <ul>
        <li><strong>Protocol Support:</strong> Full JSON-RPC 2.0 over HTTP</li>
        <li><strong>Streaming:</strong> Supports both JSON and event-stream responses</li>
        <li><strong>Tool Discovery:</strong> Automatic tool registration and discovery</li>
        <li><strong>Error Handling:</strong> Comprehensive error reporting and recovery</li>
      </ul>

      <h3>Development Experience</h3>
      
      <p>
        Enhanced developer experience with modern tooling and comprehensive observability:
      </p>
      
      <ul>
        <li><strong>Hot Reloading:</strong> Next.js with Turbopack for fast development</li>
        <li><strong>TypeScript:</strong> Full type safety with strict mode</li>
        <li><strong>Schema Validation:</strong> Zod for runtime input validation</li>
        <li><strong>Comprehensive Logging:</strong> Detailed operation logs with colors</li>
      </ul>

      <h2>Performance Features</h2>

      <h3>Efficient Indexing</h3>
      
      <p>
        In-memory indexing system provides fast duplicate detection and search operations:
      </p>
      
      <ul>
        <li><strong>O(1) Lookups:</strong> Normalized key mapping for instant exact matches</li>
        <li><strong>Regex Parsing:</strong> Efficient Q&A extraction from markdown</li>
        <li><strong>Parallel Processing:</strong> Concurrent AI operations where possible</li>
        <li><strong>Lazy Loading:</strong> Index built only when needed</li>
      </ul>

      <h3>AI Optimization</h3>
      
      <p>
        Optimized AI usage to balance performance with accuracy:
      </p>
      
      <ul>
        <li><strong>Model Selection:</strong> Appropriate models for different tasks</li>
        <li><strong>Prompt Optimization:</strong> Carefully crafted prompts for reliability</li>
        <li><strong>Fallback Strategies:</strong> Local processing when AI is unavailable</li>
        <li><strong>Error Recovery:</strong> Graceful degradation of AI features</li>
      </ul>

      <h2>Security Features</h2>

      <h3>API Key Protection</h3>
      
      <ul>
        <li><strong>Environment Variables:</strong> Secure API key storage</li>
        <li><strong>No Key Exposure:</strong> Keys never logged or exposed in responses</li>
        <li><strong>Graceful Degradation:</strong> System works without API keys (limited features)</li>
      </ul>

      <h3>Input Validation</h3>
      
      <ul>
        <li><strong>Schema Validation:</strong> Zod schemas for all inputs</li>
        <li><strong>Sanitization:</strong> Safe handling of user-provided content</li>
        <li><strong>Error Boundaries:</strong> Contained error handling</li>
      </ul>

      <h2>Future Features</h2>

      <p>
        Based on the MVP specification, planned enhancements include:
      </p>

      <h3>Database Integration</h3>
      
      <ul>
        <li><strong>PostgreSQL:</strong> Scalable storage with pgvector for embeddings</li>
        <li><strong>Full-text Search:</strong> Native PostgreSQL search capabilities</li>
        <li><strong>Versioning:</strong> Complete revision history for all content</li>
        <li><strong>Multi-project:</strong> Support for multiple documentation projects</li>
      </ul>

      <h3>Collaboration Features</h3>
      
      <ul>
        <li><strong>User Management:</strong> GitHub OAuth with role-based access</li>
        <li><strong>Proposal System:</strong> Review workflows for documentation changes</li>
        <li><strong>Version Control:</strong> Document versioning with approval workflows</li>
        <li><strong>Team Features:</strong> Multi-user collaboration and conflict resolution</li>
      </ul>

      <h3>Production Features</h3>
      
      <ul>
        <li><strong>Rate Limiting:</strong> Per-user and per-IP request limiting</li>
        <li><strong>Monitoring:</strong> Comprehensive metrics and alerting</li>
        <li><strong>Background Jobs:</strong> Async processing for heavy operations</li>
        <li><strong>API Versioning:</strong> Stable API contracts for clients</li>
      </ul>

      <blockquote>
        <p>
          <strong>Current Focus:</strong> The current implementation prioritizes core functionality 
          and developer experience. Production features will be added as the system matures and 
          user adoption grows.
        </p>
      </blockquote>
    </ContentLayout>
  );
}