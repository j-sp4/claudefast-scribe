import ContentLayout from '@/components/ContentLayout';

export default function McpTools() {
  return (
    <ContentLayout>
      <h1>MCP Tools Reference</h1>
      
      <p>
        Detailed reference for all Model Context Protocol tools provided by Scribe. 
        These tools enable AI assistants to interact with the crowd-sourced knowledge base.
      </p>

      <h2>ask_questions</h2>

      <p>
        The primary tool for searching and retrieving information from the knowledge base 
        using AI-powered semantic search.
      </p>

      <h3>Description</h3>
      <p>
        "Asks questions about the codebase or on how to solve a particular problem. They will 
        be answered by an expert. You should make use of this tool as much as possible, as the 
        expert is a senior developer with 10+ years of experience in this codebase."
      </p>

      <h3>Parameters</h3>
      
      <div className="border border-border rounded-lg p-4 mb-4">
        <h4 className="font-semibold mb-2">questions</h4>
        <ul>
          <li><strong>Type:</strong> <code>string[]</code></li>
          <li><strong>Required:</strong> Yes</li>
          <li><strong>Description:</strong> Array of questions you want to ask about the codebase or problems you're trying to solve</li>
        </ul>
      </div>

      <h3>Behavior</h3>
      
      <ol>
        <li><strong>Knowledge Base Reading:</strong> Reads the entire KNOWLEDGE.md file</li>
        <li><strong>Parallel Processing:</strong> Processes all questions simultaneously using Promise.all</li>
        <li><strong>AI Search:</strong> Uses Claude Opus (claude-opus-4-1-20250805) for semantic search</li>
        <li><strong>Response Formatting:</strong> Returns formatted Q&A pairs with clear separation</li>
      </ol>

      <h3>AI Search Process</h3>
      
      <div className="bg-muted/50 p-4 rounded-lg border border-border mb-4">
        <p><strong>System Prompt:</strong></p>
        <p className="text-sm font-mono">"You are an expert at searching through a knowledge base. Your job is to find relevant Q&A pairs that answer the given question. If you find relevant information, quote it exactly. If the answer is not in the knowledge base, say 'NOT_FOUND'."</p>
      </div>

      <h3>Response Format</h3>
      
      <p>Returns a formatted string with question-answer pairs:</p>
      
      <pre><code>**Question:** How does the MCP protocol work?

**Answer:** [Relevant information from knowledge base]

---

**Question:** What is the duplicate detection algorithm?

**Answer:** [Answer or "NOT_FOUND" message]</code></pre>

      <h3>Error Handling</h3>
      
      <ul>
        <li><strong>No API Key:</strong> Returns null, triggering "NOT_FOUND" response</li>
        <li><strong>File Read Errors:</strong> Creates initial knowledge base if missing</li>
        <li><strong>AI Service Errors:</strong> Falls back to "NOT_FOUND" message</li>
        <li><strong>Empty Knowledge Base:</strong> Returns appropriate not found messages</li>
      </ul>

      <h3>Example Usage</h3>
      
      <pre><code>{JSON.stringify({
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
          "name": "ask_questions",
          "arguments": {
            "questions": [
              "How is the knowledge base structured?",
              "What AI models are used for search?",
              "How does error handling work?"
            ]
          }
        },
        "id": "ask_example"
      }, null, 2)}</code></pre>

      <hr className="my-8" />

      <h2>create_qa</h2>

      <p>
        Tool for adding new question-answer pairs to the knowledge base with advanced 
        duplicate detection and intelligent answer merging.
      </p>

      <h3>Description</h3>
      <p>
        "Create new question and answer pairs in the knowledge base. Use this tool after you've 
        learned something new about the codebase... Write the Q&A in such a way that it would be 
        the MOST useful for future readers & developers."
      </p>

      <h3>Parameters</h3>
      
      <div className="border border-border rounded-lg p-4 mb-4">
        <h4 className="font-semibold mb-2">qa_entries</h4>
        <ul>
          <li><strong>Type:</strong> <code>QAEntry[]</code></li>
          <li><strong>Required:</strong> Yes</li>
          <li><strong>Description:</strong> Array of question-answer pairs to add</li>
        </ul>
        
        <h5 className="font-semibold mt-3 mb-2">QAEntry Object</h5>
        <ul>
          <li><code>question: string</code> - The question that you're answering</li>
          <li><code>answer: string</code> - The answer to the question</li>
        </ul>
      </div>

      <h3>Processing Pipeline</h3>

      <h4>Stage 1: Exact Match Detection</h4>
      <ul>
        <li>Creates normalized map with lowercase, no punctuation keys</li>
        <li>O(1) lookup for exact duplicate detection</li>
        <li>Skips if answer already included in existing entry</li>
      </ul>

      <h4>Stage 2: Answer Merging (Exact Matches)</h4>
      <ul>
        <li>Uses Claude Sonnet (claude-3-5-sonnet-20241022) for intelligent merging</li>
        <li>Combines existing and new answers comprehensively</li>
        <li>Falls back to simple concatenation if AI unavailable</li>
      </ul>

      <h4>Stage 3: Semantic Similarity Detection</h4>
      <ul>
        <li>Compares new question against all existing questions</li>
        <li>Uses AI to identify semantically identical questions</li>
        <li>Returns question number for matches or "NONE"</li>
      </ul>

      <h4>Stage 4: Semantic Answer Merging</h4>
      <ul>
        <li>Merges answers for semantically similar questions</li>
        <li>Uses advanced prompting for context-aware merging</li>
        <li>Updates existing entries with enhanced information</li>
      </ul>

      <h3>Response Statistics</h3>
      
      <p>Returns detailed statistics about the operation:</p>
      
      <pre><code>Processed 3 Q&A pair(s):
- Added 2 new question(s)
- Merged 1 answer(s) with similar questions
- Skipped 0 duplicate question(s)</code></pre>

      <h3>Duplicate Detection AI Prompts</h3>

      <h4>Semantic Similarity Prompt</h4>
      <div className="bg-muted/50 p-3 rounded mb-4">
        <p className="text-sm"><strong>System:</strong> "You are an expert at finding semantically similar questions. Given a new question and a list of existing questions, identify if any are asking essentially the same thing even if phrased differently."</p>
      </div>

      <h4>Answer Merging Prompt</h4>
      <div className="bg-muted/50 p-3 rounded mb-4">
        <p className="text-sm"><strong>System:</strong> "You are an expert at merging knowledge base answers. When given an existing Q&A pair and a new answer, intelligently combine them into a single comprehensive answer. Keep the merged answer concise and well-structured."</p>
      </div>

      <h3>File Format</h3>
      
      <p>New entries are added in the standard format before the final <code>---</code> marker:</p>
      
      <pre><code>**Q: Your new question**
A: Your comprehensive answer with all relevant details

**Q: Another question** 
A: Another detailed answer

---</code></pre>

      <h3>Error Handling</h3>
      
      <ul>
        <li><strong>Schema Validation:</strong> Zod validation for all input parameters</li>
        <li><strong>File Write Errors:</strong> Detailed error reporting if file operations fail</li>
        <li><strong>AI Service Failures:</strong> Graceful degradation to simpler operations</li>
        <li><strong>Parsing Errors:</strong> Regex fallback for malformed knowledge base</li>
      </ul>

      <h3>Example Usage</h3>
      
      <pre><code>{JSON.stringify({
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
          "name": "create_qa",
          "arguments": {
            "qa_entries": [
              {
                "question": "What is the recommended way to handle API errors?",
                "answer": "Use try-catch blocks with specific error types and provide fallback responses. Log errors for debugging but don't expose sensitive information to clients."
              },
              {
                "question": "How should environment variables be configured?",
                "answer": "Create a .env.local file in the server directory with ANTHROPIC_API_KEY and any other required environment variables. Never commit API keys to version control."
              }
            ]
          }
        },
        "id": "create_example"
      }, null, 2)}</code></pre>

      <h2>Tool Integration</h2>

      <h3>MCP Handler Configuration</h3>
      
      <p>Both tools are configured through the mcp-handler library:</p>
      
      <ul>
        <li><strong>Base Path:</strong> <code>/api</code></li>
        <li><strong>HTTP Methods:</strong> GET, POST, DELETE supported</li>
        <li><strong>Content Types:</strong> JSON and event-stream responses</li>
        <li><strong>Validation:</strong> Zod schema validation for all parameters</li>
      </ul>

      <h3>Development Logging</h3>
      
      <p>Both tools provide comprehensive logging with colored output:</p>
      
      <ul>
        <li><strong>ask_questions:</strong> Cyan background with question listing</li>
        <li><strong>create_qa:</strong> Green background with operation statistics</li>
        <li><strong>Operations:</strong> Color-coded add/merge/skip indicators</li>
        <li><strong>Errors:</strong> Red error messages with stack traces</li>
      </ul>

      <blockquote>
        <p>
          <strong>Best Practice:</strong> Use ask_questions frequently to build context, then use 
          create_qa to document new discoveries. The AI-powered duplicate detection ensures 
          information stays organized and comprehensive.
        </p>
      </blockquote>
    </ContentLayout>
  );
}