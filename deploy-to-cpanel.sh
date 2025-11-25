#!/bin/bash

# Deployment Script for Germ-in-Game cPanel Hosting
# Save this as deploy-to-cpanel.sh and make it executable with: chmod +x deploy-to-cpanel.sh

# Configuration - Update these values
CPANEL_USER="your_cpanel_username"
CPANEL_HOST="yourdomain.com"
REMOTE_DIR="/home/$CPANEL_USER/public_html"
LOCAL_DIR="./dist"
BACKEND_DIR="./php-backend"
DATABASE_NAME="your_database_name"
DATABASE_USER="your_database_user"
DATABASE_PASS="your_database_password"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Germ-in-Game Deployment to cPanel...${NC}"

# Step 1: Build Frontend
echo -e "\n${YELLOW}🔧 Building Frontend...${NC}"
npm install
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

# Step 2: Prepare Backend
echo -e "\n${YELLOW}🔧 Preparing Backend...${NC}"
cd $BACKEND_DIR

# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# Generate application key
php artisan key:generate --force

# Set file permissions
chmod -R 755 storage bootstrap/cache
chmod -R 775 storage

# Create storage symlink
php artisan storage:link

cd ..

# Step 3: Upload Files to cPanel
echo -e "\n${YELLOW}📤 Uploading Files to cPanel...${NC}"

# Upload frontend files
echo "Uploading frontend files..."
rsync -avz --delete $LOCAL_DIR/ $CPANEL_USER@$CPANEL_HOST:$REMOTE_DIR/

# Upload backend files
echo "Uploading backend files..."
rsync -avz --exclude='.env' --exclude='.git' --exclude='node_modules' --exclude='vendor' $BACKEND_DIR/ $CPANEL_USER@$CPANEL_HOST:${REMOTE_DIR}/api

# Upload .env file
echo "Uploading .env file..."
scp .env.production $CPANEL_USER@$CPANEL_HOST:${REMOTE_DIR}/api/.env

# Step 4: Run Migrations and Seeders
echo -e "\n${YELLOW}🔄 Running Database Migrations...${NC}"
ssh $CPANEL_USER@$CPANEL_HOST "cd $REMOTE_DIR/api && php artisan migrate --force"

# Step 5: Clear Caches
echo -e "\n${YELLOW}🧹 Clearing Caches...${NC}"
ssh $CPANEL_USER@$CPANEL_HOST "cd $REMOTE_DIR/api && php artisan optimize:clear"
ssh $CPANEL_USER@$CPANEL_HOST "cd $REMOTE_DIR/api && php artisan config:cache"
ssh $CPANEL_USER@$CPANEL_HOST "cd $REMOTE_DIR/api && php artisan route:cache"
ssh $CPANEL_USER@$CPANEL_HOST "cd $REMOTE_DIR/api && php artisan view:cache"

# Step 6: Set File Permissions
echo -e "\n${YELLOW}🔒 Setting File Permissions...${NC}"
ssh $CPANEL_USER@$CPANEL_HOST "chmod -R 755 $REMOTE_DIR"
ssh $CPANEL_USER@$CPANEL_HOST "chmod -R 755 $REMOTE_DIR/api/storage"
ssh $CPANEL_USER@$CPANEL_HOST "chmod -R 755 $REMOTE_DIR/api/bootstrap/cache"

# Step 7: Create Cron Jobs
echo -e "\n${YELLOW}⏰ Setting Up Cron Jobs...${NC}"
# Add this to your cPanel cron jobs:
echo "* * * * * cd $REMOTE_DIR/api && php artisan schedule:run >> /dev/null 2>&1" | ssh $CPANEL_USER@$CPANEL_HOST "crontab -"

echo -e "\n${GREEN}✅ Deployment Completed Successfully!${NC}"
echo -e "${GREEN}🌐 Your application is now live at: https://$CPANEL_HOST${NC}"

echo -e "\n${YELLOW}🔧 Post-Deployment Tasks:${NC}"
echo "1. Verify .env configuration in cPanel"
echo "2. Set up SSL certificate in cPanel"
echo "3. Configure email settings in .env"
echo "4. Test all user flows"
echo "5. Set up regular backups"
