#!/usr/bin/env tsx

/**
 * Test script for the PR Documentation Update System
 * Run with: npx tsx scripts/test-pr-system.ts
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServiceClient } from '@/lib/supabase/server';
import { getRepositoryConfig, upsertRepositoryConfig, getDefaultRepositoryConfig } from '@/lib/github/config';
import { verifyGitHubWebhook } from '@/lib/github/webhook-verifier';

async function testSystem() {
  console.log('🧪 Testing PR Documentation Update System...\n');

  // Test 1: Database Connection
  console.log('1. Testing database connection...');
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.from('repository_configs').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return;
  }

  // Test 2: Repository Configuration
  console.log('2. Testing repository configuration...');
  try {
    const testRepo = 'test/example-repo';
    const defaultConfig = getDefaultRepositoryConfig(testRepo);
    const config = await upsertRepositoryConfig(defaultConfig, true); // Use service client
    console.log('✅ Repository configuration created:', config.id);
    
    const retrievedConfig = await getRepositoryConfig(testRepo, true); // Use service client
    console.log('✅ Repository configuration retrieved:', retrievedConfig?.repository_name);
    console.log('');
  } catch (error) {
    console.error('❌ Repository configuration test failed:', error.message);
  }

  // Test 3: Webhook Verification
  console.log('3. Testing webhook verification...');
  try {
    const testPayload = JSON.stringify({ test: 'data' });
    const testSignature = 'sha256=invalid';
    
    // This should return false (invalid signature)
    const isValid = verifyGitHubWebhook(testPayload, testSignature);
    if (!isValid) {
      console.log('✅ Webhook verification correctly rejected invalid signature');
    } else {
      console.log('⚠️ Webhook verification should have rejected invalid signature');
    }
    console.log('');
  } catch (error) {
    console.error('❌ Webhook verification test failed:', error.message);
  }

  // Test 4: Environment Variables
  console.log('4. Checking environment variables...');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'ANTHROPIC_API_KEY',
    'GITHUB_TOKEN',
  ];

  const optionalEnvVars = [
    'GITHUB_WEBHOOK_SECRET',
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set`);
    } else {
      console.log(`❌ ${envVar} is missing (required)`);
    }
  }

  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set`);
    } else {
      console.log(`⚠️ ${envVar} is missing (optional, but recommended for production)`);
    }
  }

  console.log('\n🎉 System test completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Set up missing environment variables');
  console.log('2. Configure GitHub webhook: POST /api/github/webhook');
  console.log('3. Add repository configurations via admin panel: /admin/pr-docs');
  console.log('4. Test with a real PR to verify end-to-end functionality');
}

// Handle both direct execution and import
if (require.main === module) {
  testSystem().catch(console.error);
}

export { testSystem };
