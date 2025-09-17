'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export function Navigation() {
  const { user, loading, isReviewer } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-gray-400">Loading...</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">📚</span>
              <span className="text-xl font-bold text-gray-900">Scribe MCP</span>
            </Link>
            
            {user && (
              <div className="hidden sm:flex space-x-6">
                <Link 
                  href="/docs" 
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Browse Docs
                </Link>
                <Link 
                  href="/search" 
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Search
                </Link>
                <Link 
                  href="/propose" 
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Propose Change
                </Link>
                {isReviewer && (
                  <>
                    <Link 
                      href="/review" 
                      className="text-indigo-600 hover:text-indigo-900 px-3 py-2 text-sm font-medium border-l pl-6"
                    >
                      Review Queue
                    </Link>
                    <Link 
                      href="/admin" 
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                    >
                      Admin
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                    {isReviewer && (
                      <div className="text-xs text-indigo-600">
                        Reviewer
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
                  >
                    Sign Out
                  </button>
                </div>
                
                {/* Mobile menu button */}
                <div className="sm:hidden">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                  >
                    <span className="sr-only">Open main menu</span>
                    {showMenu ? (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex space-x-3">
                <Link
                  href="/auth/login"
                  className="text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {showMenu && user && (
          <div className="sm:hidden pb-3 space-y-1">
            <Link 
              href="/docs" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Browse Docs
            </Link>
            <Link 
              href="/search" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Search
            </Link>
            <Link 
              href="/propose" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Propose Change
            </Link>
            {isReviewer && (
              <>
                <Link 
                  href="/review" 
                  className="block px-3 py-2 text-base font-medium text-indigo-600 hover:text-indigo-900 hover:bg-gray-50 border-t pt-3"
                >
                  Review Queue
                </Link>
                <Link 
                  href="/admin" 
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  Admin
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}