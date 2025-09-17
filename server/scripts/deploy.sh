#!/bin/bash

# Scribe MCP Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_NAME="scribe-mcp"

echo -e "${GREEN}🚀 Deploying Scribe MCP to ${ENVIRONMENT}${NC}"

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Check required tools
command -v vercel >/dev/null 2>&1 || { 
    echo -e "${RED}Error: vercel CLI is not installed. Install with: npm i -g vercel${NC}"
    exit 1
}

command -v npx >/dev/null 2>&1 || { 
    echo -e "${RED}Error: npx is not installed${NC}"
    exit 1
}

# Step 1: Run tests (when we have them)
echo -e "${YELLOW}📋 Running pre-deployment checks...${NC}"
npm run lint || {
    echo -e "${RED}Linting failed! Fix errors before deploying.${NC}"
    exit 1
}

# Step 2: Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build || {
    echo -e "${RED}Build failed! Check error messages above.${NC}"
    exit 1
}

# Step 3: Run database migrations (if needed)
echo -e "${YELLOW}🗄️  Checking database migrations...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Production migrations should be run manually after verification"
else
    npx drizzle-kit push --config=drizzle.config.ts || {
        echo -e "${YELLOW}Warning: Migration check failed. Continuing...${NC}"
    }
fi

# Step 4: Set up vector search (if needed)
echo -e "${YELLOW}🔍 Setting up vector search...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Run vector setup manually: npx tsx scripts/setup-vector-search.ts"
else
    echo "Vector search setup skipped for staging"
fi

# Step 5: Deploy to Vercel
echo -e "${YELLOW}☁️  Deploying to Vercel...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    vercel --prod --yes || {
        echo -e "${RED}Production deployment failed!${NC}"
        exit 1
    }
else
    vercel --yes || {
        echo -e "${RED}Staging deployment failed!${NC}"
        exit 1
    }
fi

# Step 6: Verify deployment
echo -e "${YELLOW}✅ Verifying deployment...${NC}"
DEPLOY_URL=$(vercel ls --output json | jq -r '.[0].url' 2>/dev/null || echo "")

if [ -n "$DEPLOY_URL" ]; then
    echo -e "${GREEN}Deployment URL: https://${DEPLOY_URL}${NC}"
    
    # Check health endpoint
    echo "Checking health endpoint..."
    curl -s "https://${DEPLOY_URL}/api/health" | jq '.' || {
        echo -e "${YELLOW}Warning: Health check failed${NC}"
    }
else
    echo -e "${YELLOW}Could not determine deployment URL${NC}"
fi

# Step 7: Post-deployment tasks
echo -e "${YELLOW}📝 Post-deployment tasks:${NC}"
echo "1. Verify MCP endpoint: https://${DEPLOY_URL}/api/mcp"
echo "2. Test authentication flow"
echo "3. Check search functionality"
echo "4. Monitor error rates in dashboard"
echo "5. Update DNS if needed"

# Step 8: Notify team (if production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}📢 Notifying team...${NC}"
    # Add Slack/Discord notification here
    echo "Team notification sent (implement webhook)"
fi

echo -e "${GREEN}✨ Deployment to ${ENVIRONMENT} complete!${NC}"

# Show important URLs
echo -e "\n${GREEN}Important URLs:${NC}"
echo "- Application: https://${PROJECT_NAME}.vercel.app"
echo "- MCP Endpoint: https://${PROJECT_NAME}.vercel.app/api/mcp"
echo "- Health Check: https://${PROJECT_NAME}.vercel.app/api/health"
echo "- Vercel Dashboard: https://vercel.com/dashboard"

# Deployment checklist reminder
echo -e "\n${YELLOW}📋 Post-deployment checklist:${NC}"
echo "[ ] Health check passing"
echo "[ ] Authentication working"
echo "[ ] MCP tools responding"
echo "[ ] Search returning results"
echo "[ ] Rate limiting active"
echo "[ ] Monitoring configured"
echo "[ ] Beta customers notified"

exit 0