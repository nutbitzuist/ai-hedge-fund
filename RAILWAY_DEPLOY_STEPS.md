# Railway Deployment Steps (Web Interface)

Since you've hit the free plan limit via CLI, let's use the web interface instead.

## Step 1: Deploy Backend

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `nutbitzuist/ai-hedge-fund`
5. Railway will detect `Dockerfile.backend` automatically
6. Click on the service name to open settings
7. Go to **"Variables"** tab
8. Add these environment variables:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   FINANCIAL_DATASETS_API_KEY=your-financial-key-here (optional)
   GROQ_API_KEY=your-groq-key (optional)
   ANTHROPIC_API_KEY=your-anthropic-key (optional)
   ```
9. Railway will auto-deploy
10. Once deployed, go to **"Settings"** → **"Networking"**
11. Click **"Generate Domain"** to get your backend URL
12. Copy the URL (e.g., `https://ai-hedge-fund-backend-production.up.railway.app`)

## Step 2: Deploy Frontend

1. In the same Railway project, click **"New"** → **"GitHub Repo"**
2. Select the same repository: `nutbitzuist/ai-hedge-fund`
3. Click **"Add Service"** → **"Empty Service"**
4. Click on the new service → **"Settings"**
5. Configure:
   - **Root Directory**: `app/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`
6. Go to **"Variables"** tab
7. Add:
   ```
   VITE_API_URL=https://your-backend-url.up.railway.app
   ```
   (Use the backend URL from Step 1)
8. Go to **"Settings"** → **"Networking"**
9. Click **"Generate Domain"** to get your frontend URL
10. Copy the URL (e.g., `https://ai-hedge-fund-frontend-production.up.railway.app`)

## Step 3: Update Backend CORS

1. Go back to your backend service
2. Go to **"Variables"** tab
3. Add:
   ```
   FRONTEND_URLS=https://your-frontend-url.up.railway.app
   ```
   (Use the frontend URL from Step 2)
4. Railway will automatically redeploy

## Step 4: Test Your Deployment

1. Open your frontend URL in a browser
2. Click "Start Chatting"
3. Try: "Analyze AAPL"
4. You should see real-time analysis!

## Troubleshooting

**If you can't create a new project:**
- You might need to upgrade your Railway plan, OR
- Use Render instead (see below)

**CORS Errors:**
- Make sure `FRONTEND_URLS` matches your exact frontend URL
- Check that `VITE_API_URL` matches your backend URL

**Build Failures:**
- Check the "Deployments" tab for logs
- Make sure all files are in GitHub

## Alternative: Use Render (Free Tier)

If Railway doesn't work, Render is a great alternative:

1. Go to https://render.com
2. Sign up/login
3. Click **"New +"** → **"Web Service"**
4. Connect GitHub repo: `nutbitzuist/ai-hedge-fund`
5. Configure:
   - **Name**: `ai-hedge-fund-backend`
   - **Environment**: Docker
   - **Dockerfile Path**: `Dockerfile.backend`
6. Add environment variables (same as Railway)
7. Deploy!

See `DEPLOYMENT.md` for full Render instructions.

