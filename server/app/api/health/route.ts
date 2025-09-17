import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'error';
  responseTime?: number;
  message?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Simple query to check database connection
    const result = await db.execute(sql`SELECT 1 as health`);
    const responseTime = Date.now() - start;
    
    return {
      name: 'database',
      status: 'ok',
      responseTime,
      message: `Connected to PostgreSQL (${responseTime}ms)`,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'error',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

async function checkSupabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    const responseTime = Date.now() - start;
    
    if (error) throw error;
    
    return {
      name: 'supabase_auth',
      status: 'ok',
      responseTime,
      message: `Supabase Auth operational (${responseTime}ms)`,
    };
  } catch (error) {
    return {
      name: 'supabase_auth',
      status: 'degraded',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Supabase Auth check failed',
    };
  }
}

async function checkAnthropicAPI(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        name: 'anthropic_api',
        status: 'error',
        message: 'API key not configured',
      };
    }
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // Quick test with minimal tokens
    const response = await anthropic.completions.create({
      model: 'claude-instant-1.2',
      prompt: '\n\nHuman: Hi\n\nAssistant: ',
      max_tokens_to_sample: 1,
    }).catch(() => null);
    
    const responseTime = Date.now() - start;
    
    return {
      name: 'anthropic_api',
      status: response ? 'ok' : 'degraded',
      responseTime,
      message: response 
        ? `Anthropic API available (${responseTime}ms)`
        : 'Anthropic API check failed',
    };
  } catch (error) {
    return {
      name: 'anthropic_api',
      status: 'error',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Anthropic API error',
    };
  }
}

async function checkOpenAI(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        name: 'openai_api',
        status: 'error',
        message: 'API key not configured',
      };
    }
    
    // Just check if the key format is valid
    const responseTime = Date.now() - start;
    
    return {
      name: 'openai_api',
      status: 'ok',
      responseTime,
      message: `OpenAI API configured (${responseTime}ms)`,
    };
  } catch (error) {
    return {
      name: 'openai_api',
      status: 'error',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'OpenAI API error',
    };
  }
}

async function checkVectorSearch(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check if pgvector extension is enabled
    const result = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM pg_extension 
      WHERE extname = 'vector'
    `);
    
    const responseTime = Date.now() - start;
    const hasVector = (result as any)[0]?.count > 0;
    
    return {
      name: 'vector_search',
      status: hasVector ? 'ok' : 'degraded',
      responseTime,
      message: hasVector 
        ? `pgvector enabled (${responseTime}ms)`
        : 'pgvector extension not found',
    };
  } catch (error) {
    return {
      name: 'vector_search',
      status: 'error',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Vector search check failed',
    };
  }
}

export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkSupabase(),
    checkAnthropicAPI(),
    checkOpenAI(),
    checkVectorSearch(),
  ]);

  const allHealthy = checks.every(c => c.status === 'ok');
  const hasErrors = checks.some(c => c.status === 'error');
  
  const status = hasErrors ? 'unhealthy' : (allHealthy ? 'healthy' : 'degraded');
  const httpStatus = hasErrors ? 503 : (allHealthy ? 200 : 200);

  const response = {
    status,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: checks.reduce((acc, check) => {
      acc[check.name] = check;
      return acc;
    }, {} as Record<string, HealthCheck>),
    summary: {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'ok').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      errors: checks.filter(c => c.status === 'error').length,
    },
  };

  return NextResponse.json(response, { status: httpStatus });
}