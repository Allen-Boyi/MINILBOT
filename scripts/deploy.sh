#!/bin/bash

# CIARA-IV WhatsApp Bot Deployment Script
# Created by CraigeeX

echo "🚀 Starting CIARA-IV Bot Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on supported platform
check_platform() {
    print_status "Checking deployment platform..."
    
    if [ ! -z "$DYNO" ]; then
        echo "Platform: Heroku"
        PLATFORM="heroku"
    elif [ ! -z "$RENDER" ]; then
        echo "Platform: Render"
        PLATFORM="render"
    elif [ ! -z "$RAILWAY_ENVIRONMENT" ]; then
        echo "Platform: Railway"
        PLATFORM="railway"
    elif [ ! -z "$VERCEL" ]; then
        echo "Platform: Vercel"
        PLATFORM="vercel"
    else
        echo "Platform: VPS/Local"
        PLATFORM="vps"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        if [ $? -eq 0 ]; then
            print_success "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            exit 1
        fi
    else
        print_error "package.json not found"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    directories=("temp" "logs" "session" "data")
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        fi
    done
    
    # Create .gitkeep files
    for dir in "${directories[@]}"; do
        if [ ! -f "$dir/.gitkeep" ]; then
            touch "$dir/.gitkeep"
        fi
    done
}

# Set up environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found, creating template..."
        cat > .env << EOF
# CIARA-IV Bot Configuration
BOT_NAME=CIARA-IV
BOT_VERSION=4.0.0
CREATOR=CraigeeX
CREATOR_NUMBER=+27847826044

# Session Configuration
SESSION_ID=CIARA-IV~
PAIR_SITE_URL=https://ciara-iv-link.onrender.com

# API Keys (Replace with actual keys)
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_HERE
WEATHER_API_KEY=YOUR_WEATHER_API_KEY_HERE

# Database (Optional)
DATABASE_URL=

# Bot Settings
PREFIX=.
OWNER_NUMBERS=27847826044
AUTO_READ=true
AUTO_REPLY=false
BUTTON_MODE=true

# Group Settings
WELCOME_MESSAGE=true
ANTI_DELETE=false
AUTO_KICK_LINKS=false

# Development
NODE_ENV=production
PORT=3000
EOF
        print_warning "Please edit .env file with your actual API keys and configurations"
    fi
}

# Platform-specific setup
platform_setup() {
    print_status "Setting up platform-specific configurations..."
    
    case $PLATFORM in
        "heroku")
            print_status "Configuring for Heroku..."
            # Heroku-specific setup
            if [ ! -f "Procfile" ]; then
                echo "worker: node index.js" > Procfile
                print_success "Created Procfile for Heroku"
            fi
            ;;
            
        "render")
            print_status "Configuring for Render..."
            # Render-specific setup
            if [ ! -f "render.yaml" ]; then
                cat > render.yaml << EOF
services:
  - type: web
    name: ciara-iv-bot
    env: node
    buildCommand: npm install
    startCommand: node index.js
    plan: starter
    envVars:
      - key: NODE_ENV
        value: production
EOF
                print_success "Created render.yaml for Render"
            fi
            ;;
            
        "railway")
            print_status "Configuring for Railway..."
            # Railway-specific setup
            if [ ! -f "railway.json" ]; then
                cat > railway.json << EOF
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
                print_success "Created railway.json for Railway"
            fi
            ;;
            
        "vercel")
            print_status "Configuring for Vercel..."
            # Vercel-specific setup
            if [ ! -f "vercel.json" ]; then
                cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
EOF
                print_success "Created vercel.json for Vercel"
            fi
            ;;
            
        *)
            print_status "Setting up for VPS/Local deployment..."
            # Create systemd service file for VPS
            if [ "$EUID" -eq 0 ]; then
                cat > /etc/systemd/system/ciara-iv.service << EOF
[Unit]
Description=CIARA-IV WhatsApp Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
                print_success "Created systemd service file"
                systemctl daemon-reload
                print_success "Systemd daemon reloaded"
            fi
            ;;
    esac
}

# Install global dependencies if needed
install_global_deps() {
    print_status "Checking global dependencies..."
    
    # Check if PM2 is available (for VPS deployment)
    if [ "$PLATFORM" = "vps" ] && ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2 for process management..."
        npm install -g pm2
        if [ $? -eq 0 ]; then
            print_success "PM2 installed successfully"
        else
            print_warning "Failed to install PM2, continuing without it"
        fi
    fi
}

# Create PM2 ecosystem file
create_pm2_config() {
    if command -v pm2 &> /dev/null; then
        print_status "Creating PM2 ecosystem file..."
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ciara-iv-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
        print_success "Created PM2 ecosystem configuration"
    fi
}

# Set permissions
set_permissions() {
    print_status "Setting file permissions..."
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # Set proper permissions for directories
    chmod 755 temp logs session data
    
    print_success "File permissions set"
}

# Run pre-deployment tests
run_tests() {
    print_status "Running pre-deployment tests..."
    
    # Check if main file exists
    if [ ! -f "index.js" ]; then
        print_error "index.js not found"
        exit 1
    fi
    
    # Test Node.js syntax
    node -c index.js
    if [ $? -eq 0 ]; then
        print_success "Node.js syntax check passed"
    else
        print_error "Node.js syntax check failed"
        exit 1
    fi
    
    # Check package.json
    if [ -f "package.json" ]; then
        npm run test --if-present
        print_success "Package tests completed"
    fi
}

# Start deployment process
start_deployment() {
    print_status "Starting deployment process..."
    
    case $PLATFORM in
        "heroku")
            print_status "Deploying to Heroku..."
            if command -v heroku &> /dev/null; then
                heroku ps:scale worker=1
                print_success "Heroku deployment initiated"
            else
                print_warning "Heroku CLI not found, please deploy manually"
            fi
            ;;
            
        "render")
            print_success "Render will automatically deploy from Git push"
            ;;
            
        "railway")
            print_success "Railway will automatically deploy from Git push"
            ;;
            
        "vercel")
            if command -v vercel &> /dev/null; then
                vercel --prod
                print_success "Vercel deployment initiated"
            else
                print_warning "Vercel CLI not found, please deploy manually"
            fi
            ;;
            
        "vps")
            if command -v pm2 &> /dev/null; then
                print_status "Starting with PM2..."
                pm2 start ecosystem.config.js
                pm2 save
                pm2 startup
                print_success "Bot started with PM2"
            elif [ -f "/etc/systemd/system/ciara-iv.service" ]; then
                print_status "Starting with systemd..."
                systemctl enable ciara-iv
                systemctl start ciara-iv
                print_success "Bot started with systemd"
            else
                print_status "Starting with Node.js..."
                nohup node index.js > logs/bot.log 2>&1 &
                print_success "Bot started in background"
            fi
            ;;
    esac
}

# Display post-deployment information
show_post_deployment_info() {
    print_success "🎉 CIARA-IV Bot deployment completed!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "   Platform: $PLATFORM"
    echo "   Bot Name: CIARA-IV"
    echo "   Version: 4.0.0"
    echo "   Creator: CraigeeX"
    echo ""
    echo "🔧 Next Steps:"
    echo "   1. Edit .env file with your API keys"
    echo "   2. Generate session ID using the pair site"
    echo "   3. Monitor logs for any issues"
    echo ""
    echo "📁 Important Files:"
    echo "   • .env - Configuration file"
    echo "   • logs/ - Log files directory"
    echo "   • session/ - Session data directory"
    echo ""
    echo "🔗 Links:"
    echo "   • Repository: https://github.com/CraigeeX/CIARA-IV"
    echo "   • Pair Site: https://ciara-iv-link.onrender.com"
    echo ""
    echo "❤️  Created with love by CraigeeX"
}

# Main deployment function
main() {
    echo "╔══════════════════════════════════════╗"
    echo "║         CIARA-IV Bot Deployer        ║"
    echo "║            by CraigeeX               ║"
    echo "╚══════════════════════════════════════╝"
    echo ""
    
    check_platform
    install_dependencies
    create_directories
    setup_environment
    platform_setup
    install_global_deps
    create_pm2_config
    set_permissions
    run_tests
    start_deployment
    show_post_deployment_info
    
    echo ""
    print_success "✨ Deployment script completed successfully!"
}

# Run main function
main "$@"