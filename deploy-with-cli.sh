#!/bin/bash

# Railway CLI Deployment Script
# Run this after upgrading to Hobby plan

echo "🚀 Railway CLI Deployment Script"
echo "================================"
echo ""

# Check if logged in
echo "Checking Railway login status..."
railway whoami || {
    echo "❌ Not logged in. Please run: railway login"
    exit 1
}

echo "✅ Logged in"
echo ""

# Create backend project
echo "Step 1: Creating backend project..."
railway init --name ai-hedge-fund-backend || {
    echo "❌ Failed to create project. Make sure you've upgraded to Hobby plan."
    exit 1
}

echo "✅ Backend project created"
echo ""

# Link to project
echo "Step 2: Linking to project..."
railway link

# Set up backend service
echo "Step 3: Setting up backend service..."
echo "Please add your environment variables:"
echo "  - OPENAI_API_KEY"
echo "  - FINANCIAL_DATASETS_API_KEY (optional)"
echo ""
read -p "Press Enter to continue after adding variables in Railway dashboard..."

# Deploy backend
echo "Step 4: Deploying backend..."
railway up --detach

echo ""
echo "✅ Backend deployment started!"
echo ""
echo "Next steps:"
echo "1. Get your backend URL: railway domain"
echo "2. Create frontend service in Railway dashboard"
echo "3. Set VITE_API_URL to your backend URL"
echo "4. Set FRONTEND_URLS in backend variables"
echo ""

