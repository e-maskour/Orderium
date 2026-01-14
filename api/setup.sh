#!/bin/bash

# Orderium API Setup Script
# This script helps set up the NestJS API for the first time

set -e

echo "🚀 Orderium API Setup Script"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the api/ directory"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking Node.js version${NC}"
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be >= 18. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version OK: $(node -v)${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking PostgreSQL${NC}"
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL is installed${NC}"
    psql_version=$(psql --version | awk '{print $3}')
    echo "   Version: $psql_version"
else
    echo -e "${RED}❌ PostgreSQL not found${NC}"
    echo "   Please install PostgreSQL >= 14.x"
    echo "   macOS: brew install postgresql@14"
    echo "   Ubuntu: sudo apt-get install postgresql-14"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 3: Installing dependencies${NC}"
if [ -d "node_modules" ]; then
    echo "   node_modules already exists, skipping..."
else
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi
echo ""

echo -e "${YELLOW}Step 4: Setting up environment file${NC}"
if [ -f ".env" ]; then
    echo "   .env file already exists"
    read -p "   Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created from template${NC}"
    fi
else
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created from template${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Database configuration${NC}"
read -p "   Enter PostgreSQL username (default: postgres): " db_user
db_user=${db_user:-postgres}

read -sp "   Enter PostgreSQL password: " db_password
echo ""

read -p "   Enter database name (default: orderium_db): " db_name
db_name=${db_name:-orderium_db}

# Update .env file
sed -i.bak "s/DB_USERNAME=.*/DB_USERNAME=$db_user/" .env
sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$db_password/" .env
sed -i.bak "s/DB_NAME=.*/DB_NAME=$db_name/" .env
rm .env.bak

echo -e "${GREEN}✅ Database configuration updated${NC}"
echo ""

echo -e "${YELLOW}Step 6: Creating database${NC}"
if PGPASSWORD=$db_password psql -U $db_user -lqt | cut -d \| -f 1 | grep -qw $db_name; then
    echo "   Database '$db_name' already exists"
else
    PGPASSWORD=$db_password createdb -U $db_user $db_name
    echo -e "${GREEN}✅ Database '$db_name' created${NC}"
fi
echo ""

echo -e "${YELLOW}Step 7: Running migrations${NC}"
npm run migration:run
echo -e "${GREEN}✅ Migrations completed${NC}"
echo ""

echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review and update .env file if needed"
echo "  2. Start the development server: npm run start:dev"
echo "  3. Visit http://localhost:3000/health to verify"
echo ""
echo "For more information, see README.md"
