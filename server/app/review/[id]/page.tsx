'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface ProposalDetail {
  id: string;
  title: string;
  changeKind: 'replace' | 'append' | 'prepend';
  status: string;
  createdAt: string;
  rationale: string;
  contentMd: string;
  baseDocVersion: number;
  reviewNotes?: string;
  reviewedAt?: string;
  targetDocId: string;
  authorId: string;
}

interface Document {
  id: string;
  title: string;
  contentMd: string;
  version: number;
  topicId: string;
}

interface Author {
  id: string;
  name: string;
  email: string;
  githubUsername?: string;
  reputation: number;
}

export default function ProposalReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: authLoading, isReviewer } = useAuth();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [targetDoc, setTargetDoc] = useState<Document | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDiff, setShowDiff] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!authLoading && user && !isReviewer) {
      setError('You need reviewer permissions to access this page');
      setLoading(false);
      return;
    }

    if (user && isReviewer) {
      fetchProposalDetails();
    }
  }, [params.id, user, authLoading, isReviewer, router]);

  const fetchProposalDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Fetch proposal
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', params.id)
        .single();

      if (proposalError) throw proposalError;
      setProposal(proposalData);

      // Fetch target document
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', proposalData.targetDocId)
        .single();

      if (docError) throw docError;
      setTargetDoc(docData);

      // Fetch author
      const { data: authorData, error: authorError } = await supabase
        .from('users')
        .select('*')
        .eq('id', proposalData.authorId)
        .single();

      if (authorError) throw authorError;
      setAuthor(authorData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!proposal) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposal.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await createClient().auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'approve',
          reviewNotes: reviewNotes || 'Approved',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve proposal');
      }

      router.push('/review?approved=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!proposal || !reviewNotes.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposal.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await createClient().auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'reject',
          reviewNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject proposal');
      }

      router.push('/review?rejected=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDiff = () => {
    if (!proposal || !targetDoc) return null;

    let previewContent = '';
    switch (proposal.changeKind) {
      case 'replace':
        previewContent = proposal.contentMd;
        break;
      case 'append':
        previewContent = targetDoc.contentMd + '\n\n' + proposal.contentMd;
        break;
      case 'prepend':
        previewContent = proposal.contentMd + '\n\n' + targetDoc.contentMd;
        break;
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Current Version (v{targetDoc.version})</h4>
          <div className="bg-red-50 p-4 rounded-md border border-red-200 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">{targetDoc.contentMd}</pre>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">
            Proposed Version ({proposal.changeKind})
          </h4>
          <div className="bg-green-50 p-4 rounded-md border border-green-200 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">{previewContent}</pre>
          </div>
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading proposal details...</div>
      </div>
    );
  }

  if (error && !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <Link href="/review" className="text-blue-600 hover:underline">
            Back to review queue
          </Link>
        </div>
      </div>
    );
  }

  if (!proposal || !targetDoc || !author) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-lg mb-4">Proposal not found</div>
          <Link href="/review" className="text-blue-600 hover:underline">
            Back to review queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/review" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
                ← Back to review queue
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{proposal.title}</h1>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span className={`px-2 py-1 font-medium rounded-full ${
                  proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  proposal.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {proposal.status}
                </span>
                <span>Change type: <strong>{proposal.changeKind}</strong></span>
                <span>Target: <strong>{targetDoc.title}</strong></span>
                <span>Version: <strong>v{targetDoc.version}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Author Info */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <h3 className="text-lg font-semibold mb-3">Author Information</h3>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-gray-600">
                  {author.name?.[0] || author.email[0]}
                </span>
              </div>
            </div>
            <div>
              <p className="font-medium">{author.name || 'Unknown'}</p>
              <p className="text-sm text-gray-500">{author.email}</p>
              {author.githubUsername && (
                <p className="text-sm text-gray-500">GitHub: @{author.githubUsername}</p>
              )}
            </div>
            <div className="ml-auto">
              <p className="text-sm text-gray-500">Reputation</p>
              <p className="text-lg font-semibold">{author.reputation || 0} points</p>
            </div>
          </div>
        </div>

        {/* Rationale */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <h3 className="text-lg font-semibold mb-3">Rationale</h3>
          <p className="text-gray-700">{proposal.rationale}</p>
        </div>

        {/* Content Diff */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Content Changes</h3>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showDiff ? 'Show proposed only' : 'Show diff'}
            </button>
          </div>
          
          {showDiff ? (
            renderDiff()
          ) : (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">{proposal.contentMd}</pre>
            </div>
          )}
        </div>

        {/* Review Actions */}
        {proposal.status === 'pending' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Review Decision</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="reviewNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Review Notes {proposal.status === 'pending' && '(required for rejection)'}
              </label>
              <textarea
                id="reviewNotes"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Add your review comments..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Approve & Merge'}
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !reviewNotes.trim()}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Reject'}
              </button>
              <Link
                href="/review"
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}

        {/* Already Reviewed */}
        {proposal.status !== 'pending' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Review Decision</h3>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="font-medium">
                Status: <span className={
                  proposal.status === 'approved' ? 'text-green-600' : 'text-red-600'
                }>{proposal.status}</span>
              </p>
              {proposal.reviewNotes && (
                <p className="mt-2 text-gray-700">
                  <strong>Review Notes:</strong> {proposal.reviewNotes}
                </p>
              )}
              {proposal.reviewedAt && (
                <p className="mt-2 text-sm text-gray-500">
                  Reviewed on: {new Date(proposal.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}