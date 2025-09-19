'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  title: string;
  project: string;
  category: string;
  excerpt: string;
  author: string;
  updatedAt: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Implement actual search API call
      console.log('Searching for:', { searchQuery, selectedCategory, selectedProject });
      
      // Mock results for now
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: 'Getting Started with Next.js App Router',
          project: 'Next.js',
          category: 'Getting Started',
          excerpt: 'Learn how to set up and use the Next.js App Router for modern React applications...',
          author: 'Community',
          updatedAt: '2024-01-15',
        },
        {
          id: '2',
          title: 'Authentication Best Practices',
          project: 'React',
          category: 'Best Practices',
          excerpt: 'Comprehensive guide on implementing secure authentication in React applications...',
          author: 'Community',
          updatedAt: '2024-01-14',
        },
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Documentation</h1>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label htmlFor="search" className="sr-only">Search</label>
              <input
                type="text"
                id="search"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="category" className="sr-only">Category</label>
              <select
                id="category"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="getting-started">Getting Started</option>
                <option value="api-reference">API Reference</option>
                <option value="guides">Guides & Tutorials</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="best-practices">Best Practices</option>
                <option value="examples">Code Examples</option>
              </select>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {/* Popular Topics */}
        {results.length === 0 && !loading && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Topics</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {['React Hooks', 'Next.js Routing', 'State Management', 'API Integration', 
                'Authentication', 'Testing', 'Deployment', 'Performance'].map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSearchQuery(topic)}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-900">{topic}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {results.length} {results.length === 1 ? 'Result' : 'Results'}
            </h2>
            
            {results.map((result) => (
              <div
                key={result.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/docs/${result.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{result.title}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {result.category}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{result.excerpt}</p>
                
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{result.project}</span>
                    <span>By {result.author}</span>
                  </div>
                  <span>Updated {result.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {results.length === 0 && searchQuery && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No results found for "{searchQuery}"</p>
            <p className="text-sm text-gray-400 mt-2">
              Try different keywords or browse by category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}