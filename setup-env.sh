#!/bin/bash

# Claude Code UI Environment Setup Script
# This script helps you configure environment variables for Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Claude Code UI Docker Environment Setup${NC}"
echo "=============================================="

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists. Do you want to overwrite it? (y/N)${NC}"
    read -r overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✅ Using existing .env file${NC}"
        echo -e "${BLUE}💡 You can manually edit .env file to update configuration${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}📝 Setting up environment configuration...${NC}"

# Copy from example
cp .env.example .env

echo -e "${GREEN}✅ Created .env file from template${NC}"
echo ""
echo -e "${YELLOW}📋 Current Anthropic API Configuration:${NC}"
echo "   Base URL: https://api.moonshot.cn/anthropic/"
echo "   API Key: sk-toI8fOMosDSoSi2Lh4OuemjZ3eNURfzduplkLZXCZcoDwEi5"
echo ""
echo -e "${BLUE}🔧 To customize the configuration:${NC}"
echo "   1. Edit the .env file: ${YELLOW}nano .env${NC}"
echo "   2. Update ANTHROPIC_BASE_URL if needed"
echo "   3. Update ANTHROPIC_API_KEY with your key"
echo "   4. Adjust other settings as needed"
echo ""
echo -e "${GREEN}🚀 Ready to start! Run:${NC}"
echo "   ${YELLOW}docker-compose up -d${NC}     # Start in background"
echo "   ${YELLOW}docker-compose logs -f${NC}   # View logs"
echo "   ${YELLOW}docker-compose down${NC}      # Stop services"
echo ""
echo -e "${BLUE}📱 Access the application at: http://localhost:3008${NC}"

# Create necessary directories
echo -e "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p workspace data sessions
echo -e "${GREEN}✅ Directories created: workspace, data, sessions${NC}"

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
