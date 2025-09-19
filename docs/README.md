## Prerequisites

- PostgreSQL database (via Neon.tech)
- Node.js 16+

## Setup

1. Create a Neon database at [neon.tech](https://neon.tech)
2. Copy your database connection string
3. Create `.env.local` in the server directory:
```bash
DATABASE_URL=your-neon-connection-string
ANTHROPIC_API_KEY=your-api-key
```
4. Install dependencies:
```bash
npm install
```
5. Initialize database:
```bash
npm run db:push
```
