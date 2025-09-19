#!/usr/bin/env tsx

/**
 * Test script for GitHub App authentication
 * Run with: npx tsx scripts/test-github-app.ts
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAuthenticatedGitHubClient, getGitHubAppConfig, getInstallationId } from '@/lib/github/app-auth';

async function testGitHubApp() {
  console.log('🧪 Testing GitHub App Authentication...\n');

  // Test 1: Check GitHub App Configuration
  console.log('1. Checking GitHub App configuration...');
  const appConfig = getGitHubAppConfig();
  
  if (appConfig) {
    console.log('✅ GitHub App configured');
    console.log('   App ID:', appConfig.appId);
    console.log('   Private Key:', appConfig.privateKey ? 'Present' : 'Missing');
    console.log('   Installation ID:', appConfig.installationId || 'Not set');
  } else {
    console.log('⚠️ GitHub App not configured - will use token fallback');
  }
  console.log('');

  // Test 2: Create authenticated client
  console.log('2. Creating authenticated GitHub client...');
  try {
    const octokit = createAuthenticatedGitHubClient();
    
    // Test authentication by getting user info
    const { data: authUser } = await octokit.rest.users.getAuthenticated();
    console.log('✅ Authentication successful');
    console.log('   Authenticated as:', authUser.login);
    console.log('   Type:', authUser.type); // Should be "Bot" for GitHub Apps
    console.log('');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return;
  }

  // Test 3: Test repository access
  console.log('3. Testing repository access...');
  try {
    const octokit = createAuthenticatedGitHubClient();
    const { data: repo } = await octokit.rest.repos.get({
      owner: 'j-sp4',
      repo: 'claudefast-scribe'
    });
    
    console.log('✅ Repository access successful');
    console.log('   Repository:', repo.full_name);
    console.log('   Permissions:', {
      admin: repo.permissions?.admin || false,
      push: repo.permissions?.push || false,
      pull: repo.permissions?.pull || false
    });
    console.log('');
  } catch (error) {
    console.error('❌ Repository access failed:', error.message);
    console.log('   Make sure the GitHub App is installed on the repository');
  }

  // Test 4: Test installation ID lookup
  if (appConfig && !appConfig.installationId) {
    console.log('4. Looking up installation ID...');
    try {
      const installationId = await getInstallationId('j-sp4/claudefast-scribe');
      if (installationId) {
        console.log('✅ Installation ID found:', installationId);
        console.log('   Add this to your .env.local: GITHUB_APP_INSTALLATION_ID=' + installationId);
      } else {
        console.log('❌ Installation ID not found');
        console.log('   Make sure the app is installed on the repository');
      }
    } catch (error) {
      console.error('❌ Installation ID lookup failed:', error.message);
    }
  }

  console.log('\n🎉 GitHub App test completed!');
  console.log('\n📋 Next Steps:');
  if (!appConfig) {
    console.log('1. Set up GitHub App following GITHUB_APP_SETUP.md');
    console.log('2. Add app credentials to .env.local');
    console.log('3. Install the app on your repository');
  } else {
    console.log('1. Set up webhook URL (use ngrok for local testing)');
    console.log('2. Create a test PR to verify end-to-end functionality');
    console.log('3. Monitor the admin panel for processing results');
  }
}

// Handle both direct execution and import
if (require.main === module) {
  testGitHubApp().catch(console.error);
}

export { testGitHubApp };
