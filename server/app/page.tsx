'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to <span className="text-indigo-600">Scribe MCP</span>
          </h1>
          <p className="mt-3 text-xl text-gray-500 sm:mt-4">
            Crowd-sourced documentation that integrates directly with your AI coding assistant
          </p>
          
          <div className="mt-10 flex justify-center space-x-6">
            <Link
              href="/auth/signup"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Get Started
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">Smart Search</h3>
              <p className="text-gray-600">
                Find documentation instantly with hybrid search combining full-text and semantic understanding
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl mb-4">✏️</div>
              <h3 className="text-lg font-semibold mb-2">Collaborative Updates</h3>
              <p className="text-gray-600">
                Propose improvements that get reviewed and merged by the community
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold mb-2">AI Integration</h3>
              <p className="text-gray-600">
                Works seamlessly with Claude Code and Cursor through MCP protocol
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back!
          </h1>
          <p className="mt-2 text-gray-600">
            Ready to explore and improve documentation?
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/docs"
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">📚</span>
              <h2 className="text-lg font-semibold">Browse Documentation</h2>
            </div>
            <p className="text-gray-600">
              Explore the complete documentation library organized by topics
            </p>
          </Link>

          <Link
            href="/search"
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🔍</span>
              <h2 className="text-lg font-semibold">Search</h2>
            </div>
            <p className="text-gray-600">
              Find what you need with powerful full-text and semantic search
            </p>
          </Link>

          <Link
            href="/propose"
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">✏️</span>
              <h2 className="text-lg font-semibold">Propose Changes</h2>
            </div>
            <p className="text-gray-600">
              Submit improvements to existing documentation or add new content
            </p>
          </Link>

          <Link
            href="/api-docs"
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🔌</span>
              <h2 className="text-lg font-semibold">API Documentation</h2>
            </div>
            <p className="text-gray-600">
              Learn how to integrate Scribe MCP with your AI coding assistant
            </p>
          </Link>

          <Link
            href="/my-proposals"
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">📝</span>
              <h2 className="text-lg font-semibold">My Proposals</h2>
            </div>
            <p className="text-gray-600">
              Track the status of your documentation contributions
            </p>
          </Link>

          <Link
            href="/profile"
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">👤</span>
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>
            <p className="text-gray-600">
              View your reputation, settings, and contribution history
            </p>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Platform Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-indigo-600">1,234</div>
              <div className="text-sm text-gray-600">Documents</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">567</div>
              <div className="text-sm text-gray-600">Contributors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">89</div>
              <div className="text-sm text-gray-600">Pending Reviews</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">12,345</div>
              <div className="text-sm text-gray-600">API Calls Today</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}