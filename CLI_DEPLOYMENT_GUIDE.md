# Railway CLI Deployment Guide (After Upgrading to Hobby Plan)

Yes! Once you upgrade to the **Hobby plan ($5/month)**, you can deploy via CLI. Here's how:

## Step 1: Upgrade Your Railway Plan

1. Go to https://railway.app/account
2. Click **"Upgrade"** or go to billing
3. Select **Hobby Plan** ($5/month)
4. Complete the payment

## Step 2: Deploy Backend via CLI

Once upgraded, run these commands:

```bash
# Create a new project
railway init --name ai-hedge-fund-backend

# Link to the project (if needed)
railway link

# Add environment variables
railway variables set OPENAI_API_KEY=your-key-here
railway variables set FINANCIAL_DATASETS_API_KEY=your-key-here

# Deploy!
railway up
```

Or use the automated script:
```bash
./deploy-with-cli.sh
```

## Step 3: Get Your Backend URL

```bash
# Generate a domain
railway domain

# Or check the URL in Railway dashboard
railway status
```

## Step 4: Deploy Frontend

The frontend is a bit more complex via CLI, so you have two options:

### Option A: Use Railway Dashboard (Easier)
1. Go to Railway dashboard
2. Add a new service to your project
3. Configure as static site or use the Dockerfile.frontend

### Option B: Use CLI (Advanced)
```bash
# Create a new service
railway service create --name frontend

# Set root directory
railway variables set RAILWAY_SERVICE_ROOT=app/frontend

# Set build command
railway variables set RAILWAY_BUILD_COMMAND="npm install && npm run build"

# Set start command  
railway variables set RAILWAY_START_COMMAND="npx serve -s dist -l $PORT"

# Set API URL
railway variables set VITE_API_URL=https://your-backend-url.up.railway.app

# Deploy
railway up
```

## Step 5: Update Backend CORS

```bash
# Link to backend service
railway link --service backend

# Add frontend URL to CORS
railway variables set FRONTEND_URLS=https://your-frontend-url.up.railway.app
```

## Benefits of CLI Deployment

- ✅ Faster workflow
- ✅ Can be automated/scripted
- ✅ Better for CI/CD
- ✅ Version control friendly

## Quick Commands Reference

```bash
# Check status
railway status

# View logs
railway logs

# List services
railway service list

# Set variables
railway variables set KEY=value

# Deploy
railway up

# Open dashboard
railway open
```

## Troubleshooting

**"Resource limit exceeded" error:**
- Make sure you've upgraded to Hobby plan
- Check your account at railway.app/account

**Deployment fails:**
- Check logs: `railway logs`
- Verify Dockerfile.backend exists
- Check environment variables are set

**Can't find project:**
- List projects: `railway list`
- Link to project: `railway link`

## Cost

- **Hobby Plan**: $5/month + usage
- Includes $5 credit, so if you stay under $5 usage, it's effectively free
- Only pay for extra resources beyond the credit

Once you upgrade, I can help you deploy via CLI! Just let me know when you're ready. 🚀

