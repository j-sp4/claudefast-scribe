import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../drizzle/schema';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL not configured - database features will be disabled');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Supabase not configured - auth features will be disabled');
}

// Create database client for Drizzle (if configured)
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (DATABASE_URL) {
  // Remove pgbouncer parameter which causes issues with postgres driver
  const cleanUrl = DATABASE_URL.replace('?pgbouncer=true', '');
  
  const client = postgres(cleanUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });
  
  db = drizzle(client, { schema });
}

// Create Supabase client for auth (if configured)
let supabase: ReturnType<typeof createClient> | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Configuration
export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
  },
  context: {
    maxTokens: parseInt(process.env.CONTEXT_BUDGET || '100000'),
    maxProjectSize: parseInt(process.env.MAX_PROJECT_SIZE || '150000'),
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.CACHE_TTL || '3600')
  }
};

export { db, supabase, schema };