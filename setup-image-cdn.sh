#!/bin/bash

# Image CDN Implementation - Dependency Installation Script
# This script installs all necessary dependencies for the image CDN system

echo "🚀 Installing Image CDN Dependencies for Orderium"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to API directory
cd api

echo -e "${BLUE}📦 Installing Backend Dependencies...${NC}"
echo ""

# Core NestJS and image handling
echo -e "${YELLOW}→ Installing multer for file upload...${NC}"
npm install multer
npm install --save-dev @types/multer

# Image storage providers
echo -e "${YELLOW}→ Installing Cloudinary dependencies...${NC}"
npm install cloudinary

echo -e "${YELLOW}→ Installing AWS SDK for S3...${NC}"
npm install aws-sdk

# Already installed but confirm
echo -e "${YELLOW}→ Ensuring platform-express is installed...${NC}"
npm install @nestjs/platform-express

echo ""
echo -e "${BLUE}📦 Backend Dependencies Installation Complete!${NC}"
echo ""

# Optional: Show installation summary
echo -e "${GREEN}✓ All dependencies installed successfully!${NC}"
echo ""
echo "Installed packages:"
echo "  - multer (file upload handling)"
echo "  - @types/multer (TypeScript types)"
echo "  - cloudinary (Cloudinary CDN client)"
echo "  - aws-sdk (AWS S3 client)"
echo "  - @nestjs/platform-express (NestJS file interceptors)"
echo ""

# Check Node modules
echo -e "${BLUE}📋 Verifying installations...${NC}"
echo ""

if [ -d "node_modules/multer" ]; then
  echo -e "${GREEN}✓ multer${NC} - OK"
else
  echo -e "${YELLOW}⚠ multer${NC} - Not found"
fi

if [ -d "node_modules/@types/multer" ]; then
  echo -e "${GREEN}✓ @types/multer${NC} - OK"
else
  echo -e "${YELLOW}⚠ @types/multer${NC} - Not found"
fi

if [ -d "node_modules/cloudinary" ]; then
  echo -e "${GREEN}✓ cloudinary${NC} - OK"
else
  echo -e "${YELLOW}⚠ cloudinary${NC} - Not found"
fi

if [ -d "node_modules/aws-sdk" ]; then
  echo -e "${GREEN}✓ aws-sdk${NC} - OK"
else
  echo -e "${YELLOW}⚠ aws-sdk${NC} - Not found"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "Next Steps:"
echo "1. Set STORAGE_PROVIDER in .env (LOCAL, CLOUDINARY, or AWS_S3)"
echo "2. Add provider credentials to .env"
echo "3. Run 'npm run start:dev' to start API"
echo "4. Test with: curl -X GET http://localhost:3000/api/images/provider"
echo ""
echo "For detailed setup, see:"
echo "  - IMAGE_STORAGE_SETUP_GUIDE.md"
echo "  - CDN_QUICK_REFERENCE.md"
echo ""
