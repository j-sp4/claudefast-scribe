import { Octokit } from '@octokit/rest';
import { simpleGit, SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { RepositoryConfig, TargetConfig } from './config';
import { createClient } from '@/lib/supabase/server';

// Create GitHub client with appropriate authentication
function createGitHubClient(token?: string): Octokit {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    throw new Error('No GitHub token available. Set GITHUB_TOKEN environment variable or provide per-repository token.');
  }
  
  return new Octokit({
    auth: authToken,
  });
}

export interface DocumentUpdate {
  targetPath: string;
  updateType: 'create' | 'update' | 'append';
  content: string;
  reasoning: string;
}

export interface UpdateContext {
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  repository: string;
}

export interface UpdateResult {
  success: boolean;
  targetPath: string;
  action: string;
  commitSha?: string;
  pullRequestUrl?: string;
  error?: string;
}

/**
 * Update documentation based on PR analysis
 */
export async function updateDocumentation(
  config: RepositoryConfig,
  update: DocumentUpdate,
  context: UpdateContext
): Promise<UpdateResult> {
  console.log(`Updating documentation: ${update.targetPath}`);

  // Find the appropriate target for this update
  const target = findTargetForPath(config.targets, update.targetPath);
  if (!target) {
    throw new Error(`No target configuration found for path: ${update.targetPath}`);
  }

  // Use repository-specific token or target-specific token, fallback to global
  const githubToken = target.auth_token || config.github_token || process.env.GITHUB_TOKEN;

  switch (target.type) {
    case 'repository':
      return await updateTargetRepository(target, update, context, githubToken);
    case 'submodule':
      return await updateSubmodule(target, update, context, githubToken);
    case 'folder':
      return await updateLocalFolder(target, update, context, githubToken);
    default:
      throw new Error(`Unsupported target type: ${(target as any).type}`);
  }
}

/**
 * Find the best target configuration for a given path
 */
function findTargetForPath(targets: TargetConfig[], filePath: string): TargetConfig | null {
  // Find target where the file path starts with the target path
  return targets.find(target => filePath.startsWith(target.path)) || targets[0] || null;
}

/**
 * Update a separate GitHub repository
 */
async function updateTargetRepository(
  target: TargetConfig,
  update: DocumentUpdate,
  context: UpdateContext,
  githubToken?: string
): Promise<UpdateResult> {
  if (!target.owner || !target.repo) {
    throw new Error('Repository target must specify owner and repo');
  }

  const branch = target.branch || 'main';
  const filePath = path.join(target.path, update.targetPath);
  const octokit = createGitHubClient(githubToken);
  
  try {
    // Get current file content if it exists
    let currentContent = '';
    let currentSha: string | undefined;
    
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: target.owner,
        repo: target.repo,
        path: filePath,
        ref: branch,
      });
      
      if ('content' in data) {
        currentContent = Buffer.from(data.content, 'base64').toString();
        currentSha = data.sha;
      }
    } catch (error) {
      // File doesn't exist, which is fine for create operations
      if (update.updateType !== 'create') {
        console.log(`File ${filePath} doesn't exist, treating as create operation`);
      }
    }

    // Generate new content based on update type
    let newContent: string;
    switch (update.updateType) {
      case 'create':
        newContent = update.content;
        break;
      case 'update':
        newContent = update.content;
        break;
      case 'append':
        newContent = currentContent + '\n\n' + update.content;
        break;
      default:
        throw new Error(`Unsupported update type: ${update.updateType}`);
    }

    // Create commit message
    const commitMessage = `docs: ${update.updateType} ${update.targetPath}

Auto-generated from PR #${context.prNumber}: ${context.prTitle}
Author: ${context.prAuthor}
Repository: ${context.repository}

Reasoning: ${update.reasoning}`;

    // Create or update the file
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: target.owner,
      repo: target.repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(newContent).toString('base64'),
      branch,
      ...(currentSha && { sha: currentSha }),
    });

    // Log the update
    const supabase = await createServiceClient();
    await supabase.from('documentation_updates').insert({
      repository_name: context.repository,
      pr_number: context.prNumber,
      target_type: 'repository',
      target_path: filePath,
      update_type: update.updateType,
      commit_sha: data.commit.sha,
      success: true,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      targetPath: update.targetPath,
      action: `${update.updateType}d file in ${target.owner}/${target.repo}`,
      commitSha: data.commit.sha,
    };

  } catch (error) {
    console.error(`Failed to update repository ${target.owner}/${target.repo}:`, error);
    
    // Log the error
    const supabase = await createServiceClient();
    await supabase.from('documentation_updates').insert({
      repository_name: context.repository,
      pr_number: context.prNumber,
      target_type: 'repository',
      target_path: filePath,
      update_type: update.updateType,
      success: false,
      error_message: error.message,
      created_at: new Date().toISOString(),
    });

    return {
      success: false,
      targetPath: update.targetPath,
      action: `Failed to update ${target.owner}/${target.repo}`,
      error: error.message,
    };
  }
}

/**
 * Update a git submodule
 */
async function updateSubmodule(
  target: TargetConfig,
  update: DocumentUpdate,
  context: UpdateContext,
  githubToken?: string
): Promise<UpdateResult> {
  // For now, treat submodules similar to repositories
  // In a full implementation, you'd need to handle submodule-specific logic
  return await updateTargetRepository(target, update, context, githubToken);
}

/**
 * Update a local folder (create PR in same repo)
 */
async function updateLocalFolder(
  target: TargetConfig,
  update: DocumentUpdate,
  context: UpdateContext,
  githubToken?: string
): Promise<UpdateResult> {
  // This would typically create a new branch and PR in the same repository
  // For now, we'll implement a simplified version that updates directly
  
  const [owner, repo] = context.repository.split('/');
  const branch = target.branch || `docs-update-pr-${context.prNumber}`;
  const filePath = path.join(target.path, update.targetPath);
  const octokit = createGitHubClient(githubToken);
  
  try {
    // Create a new branch for the documentation update
    const { data: mainBranch } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: 'main',
    });

    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: mainBranch.commit.sha,
      });
    } catch (error) {
      // Branch might already exist, that's okay
      console.log(`Branch ${branch} might already exist`);
    }

    // Get current file content if it exists
    let currentContent = '';
    let currentSha: string | undefined;
    
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch,
      });
      
      if ('content' in data) {
        currentContent = Buffer.from(data.content, 'base64').toString();
        currentSha = data.sha;
      }
    } catch (error) {
      // File doesn't exist
    }

    // Generate new content
    let newContent: string;
    switch (update.updateType) {
      case 'create':
        newContent = update.content;
        break;
      case 'update':
        newContent = update.content;
        break;
      case 'append':
        newContent = currentContent + '\n\n' + update.content;
        break;
      default:
        throw new Error(`Unsupported update type: ${update.updateType}`);
    }

    // Create commit message
    const commitMessage = `docs: ${update.updateType} ${update.targetPath}

Auto-generated from PR #${context.prNumber}: ${context.prTitle}
Reasoning: ${update.reasoning}`;

    // Update the file
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(newContent).toString('base64'),
      branch,
      ...(currentSha && { sha: currentSha }),
    });

    // Create a pull request for the documentation update
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: `docs: Update documentation from PR #${context.prNumber}`,
      head: branch,
      base: 'main',
      body: `This PR automatically updates documentation based on changes in PR #${context.prNumber}.

**Original PR:** #${context.prNumber} - ${context.prTitle}
**Author:** ${context.prAuthor}

**Changes:**
- ${update.updateType} \`${update.targetPath}\`

**Reasoning:** ${update.reasoning}

---
*This PR was automatically generated by the documentation update system.*`,
    });

    // Log the update
    const supabase = await createServiceClient();
    await supabase.from('documentation_updates').insert({
      repository_name: context.repository,
      pr_number: context.prNumber,
      target_type: 'folder',
      target_path: filePath,
      update_type: update.updateType,
      commit_sha: data.commit.sha,
      pull_request_url: pr.html_url,
      success: true,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      targetPath: update.targetPath,
      action: `Created PR for documentation update`,
      commitSha: data.commit.sha,
      pullRequestUrl: pr.html_url,
    };

  } catch (error) {
    console.error(`Failed to update local folder:`, error);
    
    // Log the error
    const supabase = await createServiceClient();
    await supabase.from('documentation_updates').insert({
      repository_name: context.repository,
      pr_number: context.prNumber,
      target_type: 'folder',
      target_path: filePath,
      update_type: update.updateType,
      success: false,
      error_message: error.message,
      created_at: new Date().toISOString(),
    });

    return {
      success: false,
      targetPath: update.targetPath,
      action: `Failed to create documentation PR`,
      error: error.message,
    };
  }
}
