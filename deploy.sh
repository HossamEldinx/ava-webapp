#!/bin/bash

# Heroku Deployment Script for ONLV Project
# This script helps deploy the full-stack application to Heroku

echo "🚀 Starting Heroku deployment for ONLV Project..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Please log in to Heroku first:"
    echo "   heroku login"
    exit 1
fi

# Get app name from user
read -p "Enter your Heroku app name (or press Enter to create a new one): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "📝 Creating a new Heroku app..."
    heroku create
    APP_NAME=$(heroku apps:info --json | python -c "import sys, json; print(json.load(sys.stdin)['name'])")
    echo "✅ Created app: $APP_NAME"
else
    echo "📝 Using existing app: $APP_NAME"
fi

# Set environment variables
echo "🔧 Setting up environment variables..."
echo "Please set the following environment variables in your Heroku dashboard:"
echo "   ENVIRONMENT=production"
echo "   SUPABASE_URL=your_supabase_url"
echo "   SUPABASE_KEY=your_supabase_key"
echo "   GOOGLE_API_KEY=your_google_api_key"
echo "   FRONTEND_URL=https://$APP_NAME.herokuapp.com"

# Set basic environment variables
heroku config:set ENVIRONMENT=production --app $APP_NAME
heroku config:set FRONTEND_URL=https://$APP_NAME.herokuapp.com --app $APP_NAME

# Add buildpacks
echo "🔧 Adding buildpacks..."
heroku buildpacks:clear --app $APP_NAME
heroku buildpacks:add heroku/nodejs --app $APP_NAME
heroku buildpacks:add heroku/python --app $APP_NAME

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Prepare for Heroku deployment" || echo "No changes to commit"
git push heroku main || git push heroku master

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://$APP_NAME.herokuapp.com"
echo ""
echo "📋 Next steps:"
echo "1. Set your environment variables in the Heroku dashboard"
echo "2. Check the logs: heroku logs --tail --app $APP_NAME"
echo "3. Open your app: heroku open --app $APP_NAME"