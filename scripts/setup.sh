#!/bin/bash

# CIARA-IV WhatsApp Bot Setup Script
# Created by CraigeeX

echo "🤖 Setting up CIARA-IV WhatsApp Bot..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ Node.js version 16 or higher is required.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version check passed${NC}"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data session temp logs plugins commands utils

# Install dependencies
echo "📦 Installing dependencies..."
if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi

# Set up environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file..."
    cat > .env << EOL
# CIARA-IV Bot Configuration
SESSION_ID=CIARA-IV~
PREFIX=.
BOT_NAME=CIARA-IV
BOT_NUMBER=
OWNER_NUMBER=+27847826044
OWNER_NAME=CraigeeX

# API Keys (Replace with real keys)
CHATGPT_API_KEY=your_chatgpt_api_key_here
MEGA_EMAIL=your_mega_email_here
MEGA_PASSWORD=your_mega_password_here

# Bot Settings
AUTO_READ_MESSAGES=true
AUTO_REPLY_AI=false
GROUP_MODE=true
INBOX_MODE=true
BUTTON_MODE=false

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Database (if using)
DATABASE_URL=

# Additional APIs
WEATHER_API_KEY=your_weather_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
EOL
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️ .env file already exists${NC}"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << EOL
# Dependencies
node_modules/
package-lock.json

# Environment variables
.env

# Session files
session/*
!session/.gitkeep

# Temporary files
temp/*
!temp/.gitkeep

# Log files
logs/*.log
!logs/.gitkeep

# Database
*.db
*.sqlite

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Build files
dist/
build/
EOL
    echo -e "${GREEN}✅ .gitignore file created${NC}"
fi

# Set executable permissions
chmod +x scripts/*.sh 2>/dev/null || true

echo -e "${GREEN}🎉 CIARA-IV Bot setup completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Edit the .env file with your API keys and configuration"
echo "2. Add your session ID (must start with CIARA-IV~)"
echo "3. Run 'npm start' to start the bot"
echo ""
echo -e "${YELLOW}📚 For more information:${NC}"
echo "- Repository: https://github.com/CraigeeX/CIARA-IV"
echo "- Pair site: https://ciara-iv-link.onrender.com"
echo "- Creator: CraigeeX (@CraigeeX on GitHub)"
echo ""
echo -e "${GREEN}Happy botting! 🚀${NC}"