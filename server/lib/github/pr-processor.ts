import { Anthropic } from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';
import { createServiceClient } from '@/lib/supabase/server';
import { updateDocumentation } from './doc-updater';
import { getRepositoryConfig } from './config';
import { createAuthenticatedGitHubClient } from './app-auth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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

export interface PRAnalysis {
  shouldUpdateDocs: boolean;
  changes: Array<{
    file: string;
    type: 'added' | 'modified' | 'removed';
    content?: string;
    summary: string;
  }>;
  suggestedUpdates: Array<{
    targetPath: string;
    updateType: 'create' | 'update' | 'append';
    content: string;
    reasoning: string;
  }>;
}

export async function processPullRequestEvent(payload: any) {
  const { pull_request, repository } = payload;
  const supabase = await createServiceClient();

  try {
    console.log(`Processing PR #${pull_request.number} in ${repository.full_name}`);

    // Get repository configuration
    const config = await getRepositoryConfig(repository.full_name, true); // Use service client
    if (!config) {
      console.log(`No configuration found for repository ${repository.full_name}`);
      return;
    }

    // Get GitHub client with App authentication or fallback to token
    const githubToken = config.github_token || process.env.GITHUB_TOKEN;
    const octokit = createAuthenticatedGitHubClient(githubToken);

    // Log the processing event
    await supabase.from('pr_processing_logs').insert({
      repository_name: repository.full_name,
      pr_number: pull_request.number,
      pr_title: pull_request.title,
      pr_author: pull_request.user.login,
      status: 'processing',
      started_at: new Date().toISOString(),
    });

    // Analyze the PR
    const analysis = await analyzePullRequest(payload, octokit);
    
    if (!analysis.shouldUpdateDocs) {
      console.log(`PR #${pull_request.number} doesn't require documentation updates`);
      await supabase.from('pr_processing_logs')
        .update({ 
          status: 'skipped', 
          completed_at: new Date().toISOString(),
          result: 'No documentation updates needed'
        })
        .eq('repository_name', repository.full_name)
        .eq('pr_number', pull_request.number);
      return;
    }

    console.log(`PR #${pull_request.number} requires ${analysis.suggestedUpdates.length} documentation updates`);

    // Process each suggested update
    const results = [];
    for (const update of analysis.suggestedUpdates) {
      try {
        const result = await updateDocumentation(config, update, {
          prNumber: pull_request.number,
          prTitle: pull_request.title,
          prAuthor: pull_request.user.login,
          repository: repository.full_name,
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to apply update to ${update.targetPath}:`, error);
        results.push({
          success: false,
          error: error.message,
          targetPath: update.targetPath,
        });
      }
    }

    // Update processing log
    const successCount = results.filter(r => r.success).length;
    await supabase.from('pr_processing_logs')
      .update({ 
        status: successCount > 0 ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        result: `${successCount}/${results.length} updates applied successfully`,
        analysis: analysis,
        results: results,
      })
      .eq('repository_name', repository.full_name)
      .eq('pr_number', pull_request.number);

    console.log(`PR #${pull_request.number} processing completed: ${successCount}/${results.length} updates successful`);

  } catch (error) {
    console.error(`Error processing PR #${pull_request.number}:`, error);
    
    // Log the error
    await supabase.from('pr_processing_logs')
      .update({ 
        status: 'error',
        completed_at: new Date().toISOString(),
        error_message: error.message,
      })
      .eq('repository_name', repository.full_name)
      .eq('pr_number', pull_request.number);
  }
}

async function analyzePullRequest(payload: any, octokit: Octokit): Promise<PRAnalysis> {
  const { pull_request, repository } = payload;

  // Get PR files
  const files = await octokit.rest.pulls.listFiles({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: pull_request.number,
  });

  // Get diff content for analysis
  const changes = [];
  for (const file of files.data) {
    let content = '';
    if (file.status !== 'removed' && file.patch) {
      content = file.patch;
    }

    changes.push({
      file: file.filename,
      type: file.status as 'added' | 'modified' | 'removed',
      content,
      summary: `${file.status} ${file.filename} (+${file.additions} -${file.deletions})`,
    });
  }

  // Analyze with Claude
  const analysisPrompt = `
Analyze this GitHub Pull Request to determine if documentation updates are needed:

**PR Title:** ${pull_request.title}
**PR Description:** ${pull_request.body || 'No description provided'}

**Files Changed:**
${changes.map(c => `- ${c.summary}`).join('\n')}

**Code Changes:**
${changes.map(c => c.content ? `\n### ${c.file}\n\`\`\`diff\n${c.content}\`\`\`` : `\n### ${c.file}\n(${c.type})`).join('\n')}

Please analyze whether this PR requires documentation updates and suggest specific changes. Consider:
1. New features that need documentation
2. API changes that affect existing docs
3. Configuration changes
4. Breaking changes
5. New dependencies or setup requirements

Respond with JSON in this format:
{
  "shouldUpdateDocs": boolean,
  "reasoning": "explanation of decision",
  "suggestedUpdates": [
    {
      "targetPath": "path/to/doc/file.md",
      "updateType": "create|update|append",
      "content": "markdown content to add/update",
      "reasoning": "why this update is needed"
    }
  ]
}
`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: analysisPrompt,
    }],
  });

  try {
    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      shouldUpdateDocs: analysis.shouldUpdateDocs,
      changes,
      suggestedUpdates: analysis.suggestedUpdates || [],
    };
  } catch (error) {
    console.error('Failed to parse Claude analysis:', error);
    return {
      shouldUpdateDocs: false,
      changes,
      suggestedUpdates: [],
    };
  }
}
