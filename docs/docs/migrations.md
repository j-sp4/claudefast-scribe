# Database Migrations

## Initial Setup

1. Run database setup:
```bash
npm run db:push
```

## Schema Changes

Schema changes are managed through Drizzle ORM. To modify the schema:

1. Update `server/lib/db/schema.ts`
2. Run `npm run db:push`

## Troubleshooting

- Error 'No database connection': Check DATABASE_URL in .env.local
- Schema sync issues: Run db:push again
- Connection timeout: Check Neon dashboard status
