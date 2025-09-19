import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAllRepositoryConfigs, upsertRepositoryConfig, getDefaultRepositoryConfig } from '@/lib/github/config';

export async function GET(request: NextRequest) {
  try {
    // Use service client for admin operations
    const supabase = await createServiceClient();
    
    // For now, skip authentication in development - in production you'd validate JWT tokens
    // TODO: Implement proper JWT token validation for admin API
    
    const configs = await getAllRepositoryConfigs(true); // Use service client
    return NextResponse.json({ configs });

  } catch (error) {
    console.error('Error fetching repository configs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use service client for admin operations
    const supabase = await createServiceClient();
    
    // For now, skip authentication in development - in production you'd validate JWT tokens
    // TODO: Implement proper JWT token validation for admin API

    const body = await request.json();
    const { repository_name, source_patterns, targets, rules, enabled, github_token } = body;

    if (!repository_name) {
      return NextResponse.json(
        { error: 'repository_name is required' },
        { status: 400 }
      );
    }

    const config = await upsertRepositoryConfig({
      repository_name,
      source_patterns: source_patterns || getDefaultRepositoryConfig(repository_name).source_patterns,
      targets: targets || getDefaultRepositoryConfig(repository_name).targets,
      rules: rules || getDefaultRepositoryConfig(repository_name).rules,
      enabled: enabled !== undefined ? enabled : true,
      github_token: github_token || undefined,
    }, true); // Use service client

    return NextResponse.json({ config });

  } catch (error) {
    console.error('Error creating/updating repository config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
