#!/usr/bin/env node

import { config } from 'dotenv';
import path from 'path';

// Load .env.local file BEFORE importing anything else
config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import database after env vars are loaded
async function checkDatabase() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('Loading database module...');
    
    const { db } = await import('../lib/db');
    const { sql } = await import('drizzle-orm');
    
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('✅ Database connected successfully');
    console.log('Current time from database:', result[0]);
    
    // Check if users table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const tableExists = tableCheck[0].exists;
    
    if (tableExists) {
      console.log('✅ Users table exists');
      
      // Count users
      const countResult = await db.execute(sql`SELECT COUNT(*) FROM users`);
      console.log(`Total users in database: ${countResult[0].count}`);
    } else {
      console.log('❌ Users table does not exist. Run migrations with: npm run db:push');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

checkDatabase();