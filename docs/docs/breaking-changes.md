# Breaking Changes - v2.0

## File to Database Migration

- KNOWLEDGE.md file format deprecated
- All data now stored in PostgreSQL
- New environment variables required
- New setup steps needed

## API Changes

- Knowledge base operations now use database queries
- Duplicate detection uses normalized questions
- No more file system operations

## Migration Steps

1. Backup existing KNOWLEDGE.md
2. Follow new setup instructions
3. Run database migration
4. Verify data in Neon dashboard
