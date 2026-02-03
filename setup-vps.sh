#!/bin/bash
# JustPlanner VPS Setup Script
# Run this on your Ubuntu 22.04 VPS as root

set -e

echo "🚀 JustPlanner Setup Script"
echo "=========================="

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt install -y git

# Create web directory
echo "📁 Creating directories..."
mkdir -p /var/www

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE justplanner;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER justplanner_user WITH ENCRYPTED PASSWORD 'JP_Secure_2026!';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE justplanner TO justplanner_user;"
sudo -u postgres psql -d justplanner -c "GRANT ALL ON SCHEMA public TO justplanner_user;"

echo ""
echo "✅ Base setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Upload project: scp -r /path/to/justplanner root@YOUR_IP:/var/www/"
echo "2. Apply schema: cd /var/www/justplanner/server && psql -U justplanner_user -d justplanner -f schema.sql"
echo "3. Configure .env file"
echo "4. Run: cd /var/www/justplanner && npm install && npm run build"
echo "5. Run: cd /var/www/justplanner/server && npm install"
echo "6. Start: pm2 start ecosystem.config.js"
echo ""
