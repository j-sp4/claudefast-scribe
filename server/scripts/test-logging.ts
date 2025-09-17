#!/usr/bin/env node

import { logger } from '../lib/logger';

console.log('\n=== Testing Logger Output ===\n');

// Test different log levels
logger.debug('This is a DEBUG message - only shown in development');
logger.info('This is an INFO message', { userId: '123', action: 'login' });
logger.warn('This is a WARNING message', { attempts: 3 });
logger.error('This is an ERROR message', new Error('Something went wrong'));

console.log('\n=== Logger test complete ===\n');
console.log('Note: All logs are written to stderr to bypass Next.js filtering');
console.log('You should see colored output above with timestamps and structured data');

process.exit(0);