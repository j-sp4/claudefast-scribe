import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Get connection string and remove pgbouncer parameter
const rawConnectionString = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL

if (!rawConnectionString) {
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env.local file.')
}

// Remove pgbouncer parameter from connection string as it's not recognized by postgres.js
const connectionString = rawConnectionString.replace('?pgbouncer=true', '')

const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
})

export const db = drizzle(client, { schema })

export * from './schema'