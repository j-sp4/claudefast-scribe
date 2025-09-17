'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProposePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    projectName: '',
    category: '',
    title: '',
    content: '',
    tags: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setSubmitting(true);
    
    try {
      // TODO: Implement API call to submit proposal
      console.log('Submitting proposal:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to success or review page
      router.push('/review');
    } catch (error) {
      console.error('Error submitting proposal:', error);
      alert('Failed to submit proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Propose Documentation</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              id="projectName"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              placeholder="e.g., React, Next.js, Express"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Select a category</option>
              <option value="getting-started">Getting Started</option>
              <option value="api-reference">API Reference</option>
              <option value="guides">Guides & Tutorials</option>
              <option value="troubleshooting">Troubleshooting</option>
              <option value="best-practices">Best Practices</option>
              <option value="examples">Code Examples</option>
              <option value="configuration">Configuration</option>
              <option value="deployment">Deployment</option>
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Documentation Title
            </label>
            <input
              type="text"
              id="title"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., How to implement authentication with JWT"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Documentation Content
            </label>
            <textarea
              id="content"
              required
              rows={12}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your documentation here. You can use Markdown for formatting."
            />
            <p className="mt-2 text-sm text-gray-500">
              Supports Markdown formatting. Be clear, concise, and include code examples where appropriate.
            </p>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., authentication, security, jwt, nodejs (comma-separated)"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-yellow-50 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">Guidelines for Good Documentation</h3>
          <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
            <li>Be clear and concise - avoid unnecessary jargon</li>
            <li>Include practical examples and code snippets</li>
            <li>Structure content with clear headings and sections</li>
            <li>Explain the "why" not just the "how"</li>
            <li>Include common pitfalls and how to avoid them</li>
            <li>Add links to related resources when relevant</li>
          </ul>
        </div>
      </div>
    </div>
  );
}