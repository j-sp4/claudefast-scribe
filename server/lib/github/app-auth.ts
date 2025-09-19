import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

/**
 * GitHub App Authentication utilities
 */

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId?: string;
}

/**
 * Create an authenticated Octokit instance using GitHub App
 */
export function createGitHubAppClient(config: GitHubAppConfig): Octokit {
  const { appId, privateKey, installationId } = config;

  if (!appId || !privateKey) {
    throw new Error('GitHub App ID and private key are required');
  }

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: parseInt(appId),
      privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
      installationId: installationId ? parseInt(installationId) : undefined,
    },
  });

  return octokit;
}

/**
 * Get GitHub App configuration from environment variables
 */
export function getGitHubAppConfig(): GitHubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;

  if (!appId || !privateKey) {
    console.log('GitHub App not configured - falling back to token auth');
    return null;
  }

  return {
    appId,
    privateKey,
    installationId,
  };
}

/**
 * Create GitHub client with App authentication if available, otherwise use token
 */
export function createAuthenticatedGitHubClient(fallbackToken?: string): Octokit {
  const appConfig = getGitHubAppConfig();
  
  if (appConfig) {
    console.log('Using GitHub App authentication');
    return createGitHubAppClient(appConfig);
  }

  // Fallback to token authentication
  const token = fallbackToken || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('No GitHub authentication available. Set up GitHub App or provide GITHUB_TOKEN');
  }

  console.log('Using token authentication');
  return new Octokit({ auth: token });
}

/**
 * Get installation ID for a repository (needed for GitHub App auth)
 */
export async function getInstallationId(repositoryFullName: string): Promise<number | null> {
  const appConfig = getGitHubAppConfig();
  if (!appConfig) return null;

  try {
    // Create app-level client (not installation-level)
    const appClient = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: parseInt(appConfig.appId),
        privateKey: appConfig.privateKey.replace(/\\n/g, '\n'),
      },
    });

    const [owner, repo] = repositoryFullName.split('/');
    const { data: installation } = await appClient.rest.apps.getRepoInstallation({
      owner,
      repo,
    });

    return installation.id;
  } catch (error) {
    console.error('Failed to get installation ID:', error);
    return null;
  }
}
