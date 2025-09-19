'use client';

import { useState } from 'react';

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState('mcp');

  const mcpTools = [
    {
      name: 'ask_questions',
      description: 'AI-powered search through knowledge base',
      params: [
        { name: 'questions', type: 'string[]', description: 'Array of questions to search for' }
      ],
      example: `{
  "questions": [
    "How do I implement authentication?",
    "What are React hooks?"
  ]
}`
    },
    {
      name: 'create_qa',
      description: 'Add Q&A pairs with intelligent duplicate detection and merging',
      params: [
        { name: 'question', type: 'string', description: 'The question to add' },
        { name: 'answer', type: 'string', description: 'The answer to the question' }
      ],
      example: `{
  "question": "How do I use useState in React?",
  "answer": "useState is a Hook that lets you add state to functional components..."
}`
    },
    {
      name: 'list_topics',
      description: 'List all available documentation topics',
      params: [],
      example: '{}'
    },
    {
      name: 'search_docs',
      description: 'Search documentation with filters',
      params: [
        { name: 'query', type: 'string', description: 'Search query' },
        { name: 'filters', type: 'object', description: 'Optional filters (project, category, etc.)' }
      ],
      example: `{
  "query": "authentication",
  "filters": {
    "project": "next.js",
    "category": "guides"
  }
}`
    }
  ];

  const restEndpoints = [
    {
      method: 'GET',
      path: '/api/docs',
      description: 'List all documentation',
      params: 'Query params: ?project=xxx&category=xxx&limit=10&offset=0'
    },
    {
      method: 'GET',
      path: '/api/docs/:id',
      description: 'Get specific documentation by ID',
      params: 'Path param: id'
    },
    {
      method: 'POST',
      path: '/api/docs',
      description: 'Create new documentation',
      params: 'Body: { title, content, project, category, tags }'
    },
    {
      method: 'PUT',
      path: '/api/docs/:id',
      description: 'Update existing documentation',
      params: 'Body: { title, content, category, tags }'
    },
    {
      method: 'GET',
      path: '/api/search',
      description: 'Search documentation',
      params: 'Query params: ?q=search_term&category=xxx'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">API Documentation</h1>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('mcp')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'mcp'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                MCP Tools
              </button>
              <button
                onClick={() => setActiveTab('rest')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rest'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                REST API
              </button>
              <button
                onClick={() => setActiveTab('integration')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'integration'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Integration Guide
              </button>
            </nav>
          </div>

          {/* MCP Tools Tab */}
          {activeTab === 'mcp' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">MCP Server Endpoint</h2>
                <div className="bg-gray-100 rounded-md p-3">
                  <code className="text-sm">http://localhost:3000/api/mcp</code>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Available Tools</h2>
                {mcpTools.map((tool) => (
                  <div key={tool.name} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <h3 className="text-md font-medium text-gray-900 mb-2">
                      <code className="bg-gray-100 px-2 py-1 rounded">{tool.name}</code>
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
                    
                    {tool.params.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Parameters:</h4>
                        <ul className="space-y-1">
                          {tool.params.map((param) => (
                            <li key={param.name} className="text-sm">
                              <code className="bg-gray-100 px-1 rounded">{param.name}</code>
                              <span className="text-gray-500"> ({param.type})</span>
                              <span className="text-gray-600"> - {param.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Example:</h4>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                        {tool.example}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REST API Tab */}
          {activeTab === 'rest' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Base URL</h2>
                <div className="bg-gray-100 rounded-md p-3">
                  <code className="text-sm">http://localhost:3000/api</code>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Endpoints</h2>
                {restEndpoints.map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium mr-2 ${
                        endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                        endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                        endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-medium">{endpoint.path}</code>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                    <p className="text-xs text-gray-500">{endpoint.params}</p>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Authentication</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    All REST API endpoints require authentication via Bearer token in the Authorization header:
                  </p>
                  <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded-md text-xs">
                    Authorization: Bearer YOUR_API_KEY
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Integration Guide Tab */}
          {activeTab === 'integration' && (
            <div className="prose prose-sm max-w-none">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">MCP Integration with Claude</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">1. Configure Claude Code</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Add the Scribe MCP server to your Claude Code configuration:
                  </p>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "scribe": {
      "command": "node",
      "args": ["/path/to/scribe/server"],
      "env": {
        "SCRIBE_API_URL": "http://localhost:3000/api/mcp"
      }
    }
  }
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">2. Using with Cursor</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Configure Cursor to use the Scribe MCP server in your settings:
                  </p>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto">
{`// .cursor/settings.json
{
  "mcp": {
    "servers": {
      "scribe": "http://localhost:3000/api/mcp"
    }
  }
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">3. Direct API Usage</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    You can also interact with the API directly using any HTTP client:
                  </p>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto">
{`// JavaScript Example
const response = await fetch('http://localhost:3000/api/search?q=react+hooks', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const docs = await response.json();`}
                  </pre>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                  <h3 className="text-sm font-medium text-blue-900">Need Help?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Check out our GitHub repository for more examples and detailed integration guides.
                    Join our community Discord for support and discussions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}