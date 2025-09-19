## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL database (via Neon.tech)

### Environment Setup
1. Create a free database at [neon.tech](https://neon.tech)
2. Copy your database connection string
3. Create `.env.local` with:
```bash
DATABASE_URL=your_neon_connection_string
ANTHROPIC_API_KEY=your_api_key
```

### Installation
```bash
npm install
npm run db:push  # Initialize database schema
npm run dev
```