import { logger } from './logger';

// Log startup information
logger.info('==================================================');
logger.info('🚀 Scribe MCP Server Starting...');
logger.info('==================================================');
logger.info('Environment:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Configured' : 'Not configured',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Not configured',
});

// Export empty object to make this a module
export {};