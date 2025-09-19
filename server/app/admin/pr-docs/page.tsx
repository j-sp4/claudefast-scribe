'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RepositoryConfig {
  id: string;
  repository_name: string;
  source_patterns: string[];
  targets: Array<{
    type: 'repository' | 'submodule' | 'folder';
    repository?: string;
    owner?: string;
    repo?: string;
    branch?: string;
    path: string;
  }>;
  rules: Array<{
    patterns: string[];
    doc_path: string;
    update_type: 'api_docs' | 'user_docs' | 'changelog' | 'readme';
  }>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface PRLog {
  id: string;
  repository_name: string;
  pr_number: number;
  pr_title: string;
  pr_author: string;
  status: 'processing' | 'completed' | 'failed' | 'error' | 'skipped';
  started_at: string;
  completed_at?: string;
  analysis?: any;
  results?: any;
  error_message?: string;
  created_at: string;
}

export default function PRDocsAdminPage() {
  const { user, isAdmin } = useAuth();
  const [configs, setConfigs] = useState<RepositoryConfig[]>([]);
  const [prLogs, setPRLogs] = useState<PRLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'configs' | 'logs'>('configs');
  const [newRepoName, setNewRepoName] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch repository configs
      const configsResponse = await fetch('/api/admin/repository-configs');
      if (configsResponse.ok) {
        const configsData = await configsResponse.json();
        setConfigs(configsData.configs);
      }

      // Fetch PR logs
      const logsResponse = await fetch('/api/admin/pr-logs?limit=20');
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setPRLogs(logsData.logs);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultConfig = async () => {
    if (!newRepoName.trim()) return;

    try {
      const response = await fetch('/api/admin/repository-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository_name: newRepoName.trim(),
        }),
      });

      if (response.ok) {
        setNewRepoName('');
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating config:', error);
      alert('Error creating configuration');
    }
  };

  const toggleConfig = async (configId: string, enabled: boolean) => {
    try {
      const config = configs.find(c => c.id === configId);
      if (!config) return;

      const response = await fetch('/api/admin/repository-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          enabled,
        }),
      });

      if (response.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin access required to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PR Documentation System Admin</h1>
          <p className="mt-2 text-gray-600">Manage GitHub PR documentation update configurations</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('configs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Repository Configurations ({configs.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              PR Processing Logs ({prLogs.length})
            </button>
          </nav>
        </div>

        {/* Repository Configurations Tab */}
        {activeTab === 'configs' && (
          <div className="space-y-6">
            {/* Add New Repository */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Add New Repository</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="owner/repository-name"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={createDefaultConfig}
                  disabled={!newRepoName.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Repository
                </button>
              </div>
            </div>

            {/* Repository Configurations List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium">Repository Configurations</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {configs.map((config) => (
                  <div key={config.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{config.repository_name}</h3>
                        <p className="text-sm text-gray-500">
                          Last updated: {new Date(config.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          config.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          onClick={() => toggleConfig(config.id, !config.enabled)}
                          className={`px-3 py-1 text-sm rounded-md ${
                            config.enabled
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {config.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Source Patterns</h4>
                        <ul className="text-gray-600 space-y-1">
                          {config.source_patterns.map((pattern, idx) => (
                            <li key={idx} className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {pattern}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Targets</h4>
                        <ul className="text-gray-600 space-y-1">
                          {config.targets.map((target, idx) => (
                            <li key={idx} className="text-xs">
                              <span className="font-medium">{target.type}:</span> {target.path}
                              {target.branch && <span className="text-gray-500"> ({target.branch})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Rules</h4>
                        <ul className="text-gray-600 space-y-1">
                          {config.rules.map((rule, idx) => (
                            <li key={idx} className="text-xs">
                              <span className="font-medium">{rule.update_type}:</span> {rule.doc_path}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}

                {configs.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    No repository configurations found. Add one above to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PR Processing Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">PR Processing Logs</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {prLogs.map((log) => (
                <div key={log.id} className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        PR #{log.pr_number}: {log.pr_title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {log.repository_name} • by {log.pr_author}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      log.status === 'completed' ? 'bg-green-100 text-green-800' :
                      log.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      log.status === 'skipped' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Started: {new Date(log.started_at).toLocaleString()}</p>
                    {log.completed_at && (
                      <p>Completed: {new Date(log.completed_at).toLocaleString()}</p>
                    )}
                    {log.error_message && (
                      <p className="text-red-600">Error: {log.error_message}</p>
                    )}
                    {log.results && (
                      <p>Updates: {JSON.stringify(log.results).substring(0, 100)}...</p>
                    )}
                  </div>
                </div>
              ))}

              {prLogs.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  No PR processing logs found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
