import { config } from 'dotenv';
import { resolve } from 'path';
import fs from 'fs/promises';
import { db } from '../lib/db';
import { knowledgeEntries } from '../lib/db/schema';
import { parseQAEntries } from '../lib/utils/knowledge-parser';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function migrateKnowledge() {
  console.log('🚀 Starting migration from KNOWLEDGE.md to PostgreSQL...');
  
  try {
    // Read KNOWLEDGE.md file
    const knowledgePath = resolve(process.cwd(), '..', 'KNOWLEDGE.md');
    const content = await fs.readFile(knowledgePath, 'utf-8');
    
    // Parse Q&A entries using shared utility
    const entries = parseQAEntries(content);
    
    console.log(`📋 Found ${entries.length} Q&A entries to migrate`);
    
    if (entries.length === 0) {
      console.log('⚠️  No entries found in KNOWLEDGE.md');
      return;
    }
    
    // Bulk insert into database
    const insertedRows = await db.insert(knowledgeEntries).values(entries).returning();
    
    console.log(`✅ Successfully migrated ${insertedRows.length} entries to PostgreSQL`);
    
    // Verify by counting rows in database
    const allEntries = await db.select().from(knowledgeEntries);
    console.log(`📊 Total entries in database: ${allEntries.length}`);
    
    // Spot check - show first 3 entries
    console.log('\n🔍 Spot check - First 3 entries:');
    allEntries.slice(0, 3).forEach((entry, i) => {
      console.log(`\n${i + 1}. Question: ${entry.question}`);
      console.log(`   Answer: ${entry.answer.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateKnowledge().then(() => {
  console.log('\n🎉 Migration completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Migration error:', error);
  process.exit(1);
});