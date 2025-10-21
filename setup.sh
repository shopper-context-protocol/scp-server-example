#!/bin/bash

# SCP Demo Server Setup Script
# Installs dependencies, creates Cloudflare resources, and configures the project

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════╗"
echo "║       SCP Demo Server - Setup Script                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found:${NC} $(node --version)"
echo ""

# Step 0: Copy example files if needed
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "0️⃣  Setting up configuration files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Copy .dev.vars.example if .dev.vars doesn't exist
if [ ! -f .dev.vars ]; then
    if [ -f .dev.vars.example ]; then
        echo "Copying .dev.vars.example to .dev.vars..."
        cp .dev.vars.example .dev.vars
        echo -e "${GREEN}✓ .dev.vars created${NC}"
        echo -e "${YELLOW}⚠️  Please update .dev.vars with your actual values${NC}"
    else
        echo -e "${YELLOW}⚠️  .dev.vars.example not found, creating default .dev.vars${NC}"
        cat > .dev.vars << EOF
JWT_SECRET=local-test-secret-change-in-production-12345
PUBLIC_URL=http://localhost:8787
RESEND_API_KEY=your-resend-api-key-here
EMAIL_FROM=auth@yourdomain.com
EOF
        echo -e "${GREEN}✓ .dev.vars created with defaults${NC}"
    fi
else
    echo -e "${GREEN}✓ .dev.vars already exists${NC}"
fi

# Copy wrangler.toml.example if wrangler.toml doesn't exist
if [ ! -f wrangler.toml ]; then
    if [ -f wrangler.toml.example ]; then
        echo "Copying wrangler.toml.example to wrangler.toml..."
        cp wrangler.toml.example wrangler.toml
        echo -e "${GREEN}✓ wrangler.toml created${NC}"
        echo -e "${YELLOW}⚠️  Database and KV namespace IDs will be added automatically${NC}"
    else
        echo -e "${RED}✗ Error: wrangler.toml.example not found${NC}"
        echo "Please ensure wrangler.toml.example exists in the project root"
        exit 1
    fi
else
    echo -e "${GREEN}✓ wrangler.toml already exists${NC}"
fi
echo ""

# Step 1: Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Check if user is logged into Cloudflare
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Checking Cloudflare authentication..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! npx wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Cloudflare${NC}"
    echo ""
    echo "Please log in to Cloudflare to continue:"
    npx wrangler login
    echo ""
fi

echo -e "${GREEN}✓ Cloudflare authentication verified${NC}"
echo ""

# Step 3: Create D1 Database
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Creating D1 Database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if database already exists in wrangler.toml
if grep -q "database_id = \"ce6530c0-0ca2-4469-8d83-b9b396c5ee84\"" wrangler.toml 2>/dev/null; then
    echo -e "${YELLOW}⚠️  D1 database configuration found in wrangler.toml${NC}"
    echo ""
    read -p "Do you want to create a NEW database? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  Skipping database creation${NC}"
    else
        DB_OUTPUT=$(npx wrangler d1 create scp-oauth-local 2>&1)
        echo "$DB_OUTPUT"
        
        DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | sed -n 's/.*database_id = "\([^"]*\)".*/\1/p')
        
        if [ -n "$DB_ID" ]; then
            echo ""
            echo -e "${GREEN}✓ Database created with ID: $DB_ID${NC}"
            echo ""
            echo -e "${YELLOW}📝 Please update wrangler.toml with this database_id${NC}"
        fi
    fi
else
    DB_OUTPUT=$(npx wrangler d1 create scp-oauth-local 2>&1)
    echo "$DB_OUTPUT"
    
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | sed -n 's/.*database_id = "\([^"]*\)".*/\1/p')
    
    if [ -n "$DB_ID" ]; then
        echo ""
        echo -e "${GREEN}✓ Database created with ID: $DB_ID${NC}"
        echo ""
        echo -e "${YELLOW}📝 Updating wrangler.toml with database ID...${NC}"
        
        # Update wrangler.toml with the new database_id (only the first occurrence)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS - update only the first occurrence
            sed -i '' "0,/database_id = \".*\"/s//database_id = \"$DB_ID\"/" wrangler.toml
        else
            # Linux - update only the first occurrence
            sed -i "0,/database_id = \".*\"/s//database_id = \"$DB_ID\"/" wrangler.toml
        fi
        echo -e "${GREEN}✓ wrangler.toml updated${NC}"
        
        # Verify the update
        CURRENT_DB_ID=$(grep -m 1 "database_id = " wrangler.toml | sed -n 's/.*database_id = "\([^"]*\)".*/\1/p')
        if [ "$CURRENT_DB_ID" = "$DB_ID" ]; then
            echo -e "${GREEN}✓ Database ID verified in wrangler.toml${NC}"
        else
            echo -e "${RED}✗ Warning: Database ID mismatch in wrangler.toml${NC}"
            echo -e "${YELLOW}  Expected: $DB_ID${NC}"
            echo -e "${YELLOW}  Found: $CURRENT_DB_ID${NC}"
            echo ""
            echo -e "${YELLOW}⚠️  Please manually update wrangler.toml before continuing${NC}"
            exit 1
        fi
    fi
fi
echo ""

# Pause before migrations to let user verify
echo -e "${BLUE}ℹ️  About to run database migrations...${NC}"
echo -e "${YELLOW}Please verify that wrangler.toml has the correct database_id${NC}"
echo ""
read -p "Press Enter to continue with migrations (or Ctrl+C to cancel)..."
echo ""

# Step 4: Run database migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Running database migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify database_id exists in wrangler.toml
DB_ID_CHECK=$(grep -m 1 "database_id = " wrangler.toml | grep -v "TODO" | sed -n 's/.*database_id = "\([^"]*\)".*/\1/p')

if [ -z "$DB_ID_CHECK" ]; then
    echo -e "${RED}✗ Error: No valid database_id found in wrangler.toml${NC}"
    echo ""
    echo "Please ensure wrangler.toml has a valid database_id before running migrations."
    echo "You can manually set it by editing wrangler.toml:"
    echo ""
    echo "  [[d1_databases]]"
    echo "  binding = \"DB\""
    echo "  database_name = \"scp-oauth-local\""
    echo "  database_id = \"YOUR_DATABASE_ID_HERE\""
    echo ""
    exit 1
fi

echo -e "${BLUE}Using database: $DB_ID_CHECK${NC}"
echo ""

# Run migrations
if npx wrangler d1 migrations apply scp-oauth-local --local 2>&1 | tee /tmp/migration_output.txt; then
    echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    echo ""
    echo "This might happen if:"
    echo "  1. The database_id in wrangler.toml is incorrect"
    echo "  2. The database hasn't been created yet"
    echo "  3. Migrations have already been applied"
    echo ""
    echo "You can try:"
    echo "  1. Run the migration fix script: ${YELLOW}./fix-migrations.sh${NC}"
    echo "  2. Or manually: ${YELLOW}npx wrangler d1 migrations apply scp-oauth-local --local${NC}"
    echo ""
    
    # Don't exit - let the user continue if they want
    read -p "Continue setup anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 5: Create KV Namespaces
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Creating KV Namespaces..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if KV namespaces need to be created
if grep -q "id = \"TODO_ADD_AFTER_CREATION\"" wrangler.toml 2>/dev/null; then
    echo -e "${YELLOW}⚠️  KV namespaces need to be configured${NC}"
    echo ""
    
    # Create AUTH_REQUESTS namespace
    echo "Creating AUTH_REQUESTS namespace..."
    AUTH_KV_OUTPUT=$(npx wrangler kv:namespace create AUTH_REQUESTS 2>&1)
    echo "$AUTH_KV_OUTPUT"
    AUTH_KV_ID=$(echo "$AUTH_KV_OUTPUT" | grep "id = " | sed -n 's/.*id = "\([^"]*\)".*/\1/p' | head -1)
    
    if [ -n "$AUTH_KV_ID" ]; then
        echo -e "${GREEN}✓ AUTH_REQUESTS namespace created: $AUTH_KV_ID${NC}"
    fi
    echo ""
    
    # Create MAGIC_LINK_TOKENS namespace
    echo "Creating MAGIC_LINK_TOKENS namespace..."
    MAGIC_KV_OUTPUT=$(npx wrangler kv:namespace create MAGIC_LINK_TOKENS 2>&1)
    echo "$MAGIC_KV_OUTPUT"
    MAGIC_KV_ID=$(echo "$MAGIC_KV_OUTPUT" | grep "id = " | sed -n 's/.*id = "\([^"]*\)".*/\1/p' | head -1)
    
    if [ -n "$MAGIC_KV_ID" ]; then
        echo -e "${GREEN}✓ MAGIC_LINK_TOKENS namespace created: $MAGIC_KV_ID${NC}"
    fi
    echo ""
    
    if [ -n "$AUTH_KV_ID" ] && [ -n "$MAGIC_KV_ID" ]; then
        echo -e "${YELLOW}📝 Updating wrangler.toml with KV namespace IDs...${NC}"
        
        # Create a backup
        cp wrangler.toml wrangler.toml.backup
        
        # Update wrangler.toml with KV IDs
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS - update first occurrence of TODO for AUTH_REQUESTS
            sed -i '' "0,/id = \"TODO_ADD_AFTER_CREATION\"/s//id = \"$AUTH_KV_ID\"/" wrangler.toml
            # Update second occurrence for MAGIC_LINK_TOKENS
            sed -i '' "0,/id = \"TODO_ADD_AFTER_CREATION\"/s//id = \"$MAGIC_KV_ID\"/" wrangler.toml
        else
            # Linux
            sed -i "0,/id = \"TODO_ADD_AFTER_CREATION\"/s//id = \"$AUTH_KV_ID\"/" wrangler.toml
            sed -i "0,/id = \"TODO_ADD_AFTER_CREATION\"/s//id = \"$MAGIC_KV_ID\"/" wrangler.toml
        fi
        echo -e "${GREEN}✓ wrangler.toml updated with KV namespace IDs${NC}"
        
        # Verify the updates
        AUTH_KV_CHECK=$(grep -A 1 "binding = \"AUTH_REQUESTS\"" wrangler.toml | grep "id = " | head -1 | sed -n 's/.*id = "\([^"]*\)".*/\1/p')
        MAGIC_KV_CHECK=$(grep -A 1 "binding = \"MAGIC_LINK_TOKENS\"" wrangler.toml | grep "id = " | head -1 | sed -n 's/.*id = "\([^"]*\)".*/\1/p')
        
        if [ "$AUTH_KV_CHECK" = "$AUTH_KV_ID" ] && [ "$MAGIC_KV_CHECK" = "$MAGIC_KV_ID" ]; then
            echo -e "${GREEN}✓ KV namespace IDs verified in wrangler.toml${NC}"
            rm wrangler.toml.backup
        else
            echo -e "${YELLOW}⚠️  Warning: KV namespace IDs may not have updated correctly${NC}"
            echo "  Restoring backup..."
            mv wrangler.toml.backup wrangler.toml
            echo ""
            echo "Please manually update wrangler.toml with these IDs:"
            echo "  AUTH_REQUESTS: $AUTH_KV_ID"
            echo "  MAGIC_LINK_TOKENS: $MAGIC_KV_ID"
        fi
    fi
else
    echo -e "${GREEN}✓ KV namespaces already configured${NC}"
fi
echo ""

# Step 6: Review environment variables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${GREEN}✓ .dev.vars configured${NC}"
echo ""
echo -e "${BLUE}ℹ️  Local development will use .dev.vars${NC}"
echo -e "${YELLOW}⚠️  Update .dev.vars if you want to send real magic link emails${NC}"
echo ""
echo "For production deployment, you'll need to set secrets:"
echo "  ${YELLOW}npx wrangler secret put JWT_SECRET${NC}"
echo "  ${YELLOW}npx wrangler secret put RESEND_API_KEY${NC} (optional)"
echo ""

# Step 7: Verify setup
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Verifying setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ISSUES=0

# Check if wrangler.toml has been updated
if grep -q "TODO_ADD_AFTER_CREATION" wrangler.toml; then
    echo -e "${YELLOW}⚠️  Some KV namespace IDs still need to be configured in wrangler.toml${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All setup steps completed successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Setup completed with $ISSUES warning(s)${NC}"
fi
echo ""

# Final instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "  1. Start the development server:"
echo "     ${GREEN}npm run dev${NC}"
echo ""
echo "  2. Test the OAuth flow:"
echo "     ${GREEN}cd test-utils && ./test-oauth-flow.sh${NC}"
echo ""
echo "  3. Test all SCP methods:"
echo "     ${GREEN}cd test-utils && ./test-tools.sh${NC}"
echo ""
echo "  4. Deploy to production:"
echo "     ${GREEN}npx wrangler secret put JWT_SECRET${NC}"
echo "     ${GREEN}npm run deploy:production${NC}"
echo ""
echo "📚 Testing:"
echo "  • Works with ANY email address"
echo "  • Same email = same customer profile"
echo "  • Try: demo@example.com, test@example.com, or your.email@domain.com"
echo ""
echo "🔗 Server will run at: http://localhost:8787"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

