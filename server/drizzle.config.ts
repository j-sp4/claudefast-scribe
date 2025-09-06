import { defineConfig } from 'drizzle-kit';

// Validate DATABASE_URL for drizzle-kit commands
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please configure your Neon database connection string. ' +
    'See DATABASE_SETUP.md for instructions.'
  );
}

export default defineConfig({
  schema: './server/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});