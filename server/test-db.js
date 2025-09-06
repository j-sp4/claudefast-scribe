const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);

// Test database connection
const postgres = require('postgres');

async function testConnection() {
  const cleanUrl = process.env.DATABASE_URL.replace('?pgbouncer=true', '');
  const sql = postgres(cleanUrl);
  
  try {
    const result = await sql`SELECT NOW()`;
    console.log('✅ Database connected:', result[0].now);
    
    const projects = await sql`SELECT * FROM projects`;
    console.log('✅ Projects found:', projects.length);
    projects.forEach(p => {
      console.log(`  - ${p.slug}: ${p.name}`);
    });
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await sql.end();
  }
}

testConnection();