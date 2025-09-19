import { createClient, createServiceClient } from '@/lib/supabase/server';

export interface RepositoryConfig {
  id: string;
  repository_name: string;
  source_patterns: string[]; // File patterns to watch for changes
  targets: TargetConfig[];
  rules: UpdateRule[];
  enabled: boolean;
  github_token?: string; // Optional repository-specific GitHub token
}

export interface TargetConfig {
  type: 'repository' | 'submodule' | 'folder';
  repository?: string; // For repository/submodule targets
  owner?: string;
  repo?: string;
  branch?: string;
  path: string;
  auth_token?: string; // Optional separate token for this target
}

export interface UpdateRule {
  patterns: string[]; // File patterns that trigger this rule
  doc_path: string; // Target documentation path
  update_type: 'api_docs' | 'user_docs' | 'changelog' | 'readme';
  template?: string; // Optional template for generating content
}

/**
 * Get repository configuration for documentation updates
 */
export async function getRepositoryConfig(repositoryName: string, useServiceClient = false): Promise<RepositoryConfig | null> {
  const supabase = useServiceClient ? await createServiceClient() : await createClient();
  
  const { data, error } = await supabase
    .from('repository_configs')
    .select('*')
    .eq('repository_name', repositoryName)
    .eq('enabled', true)
    .single();

  if (error || !data) {
    console.log(`No configuration found for repository ${repositoryName}`);
    return null;
  }

  return data as RepositoryConfig;
}

/**
 * Create or update repository configuration
 */
export async function upsertRepositoryConfig(config: Omit<RepositoryConfig, 'id'>, useServiceClient = false): Promise<RepositoryConfig> {
  const supabase = useServiceClient ? await createServiceClient() : await createClient();
  
  const { data, error } = await supabase
    .from('repository_configs')
    .upsert({
      repository_name: config.repository_name,
      source_patterns: config.source_patterns,
      targets: config.targets,
      rules: config.rules,
      enabled: config.enabled,
      github_token: config.github_token,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert repository config: ${error.message}`);
  }

  return data as RepositoryConfig;
}

/**
 * Get all repository configurations
 */
export async function getAllRepositoryConfigs(useServiceClient = false): Promise<RepositoryConfig[]> {
  const supabase = useServiceClient ? await createServiceClient() : await createClient();
  
  const { data, error } = await supabase
    .from('repository_configs')
    .select('*')
    .eq('enabled', true)
    .order('repository_name');

  if (error) {
    throw new Error(`Failed to fetch repository configs: ${error.message}`);
  }

  return data as RepositoryConfig[];
}

/**
 * Check if a file matches any of the configured patterns
 */
export function matchesPatterns(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  });
}

/**
 * Default configuration for new repositories
 */
export function getDefaultRepositoryConfig(repositoryName: string): Omit<RepositoryConfig, 'id'> {
  return {
    repository_name: repositoryName,
    source_patterns: [
      'src/**/*.ts',
      'src/**/*.js',
      'lib/**/*.ts',
      'lib/**/*.js',
      'README.md',
      'docs/**/*.md',
      'api/**/*',
      'package.json',
    ],
    targets: [
      {
        type: 'folder',
        path: './docs/',
        branch: 'docs-updates',
      }
    ],
    rules: [
      {
        patterns: ['src/**/*.ts', 'lib/**/*.ts', 'api/**/*'],
        doc_path: 'api/',
        update_type: 'api_docs',
      },
      {
        patterns: ['README.md', 'docs/**/*.md'],
        doc_path: 'guides/',
        update_type: 'user_docs',
      },
      {
        patterns: ['package.json', 'CHANGELOG.md'],
        doc_path: '',
        update_type: 'changelog',
      },
    ],
    enabled: true,
    // github_token is optional - will use global GITHUB_TOKEN if not provided
  };
}
