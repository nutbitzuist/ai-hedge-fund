# Quick Start: Deploy to Railway (5 minutes)

This is the fastest way to get your AI Hedge Fund online.

## Prerequisites
- GitHub account
- Railway account (free at railway.app)
- OpenAI API key (or other LLM provider)

## Step-by-Step

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy Backend on Railway

1. Go to https://railway.app and login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect `Dockerfile.backend`
5. Click on the service → "Variables" tab
6. Add these environment variables:
   ```
   OPENAI_API_KEY=your-key-here
   FINANCIAL_DATASETS_API_KEY=your-key-here (optional)
   ```
7. Railway will deploy automatically
8. Copy the URL (e.g., `https://your-app.up.railway.app`)

### 3. Deploy Frontend on Railway

1. In Railway, click "New" → "GitHub Repo" (same repo)
2. Click "Add Service" → "Empty Service"
3. Click on the new service → "Settings"
4. Set:
   - **Root Directory**: `app/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l 3000`
5. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-url.up.railway.app
   ```
6. Deploy

### 4. Update Backend CORS

1. In Railway backend service → "Variables"
2. Add:
   ```
   FRONTEND_URLS=https://your-frontend-url.up.railway.app
   ```
3. Redeploy backend

### 5. Test!

Open your frontend URL and start chatting with the AI hedge fund!

## Alternative: Deploy Both on Render

### Backend
1. Go to render.com → "New +" → "Web Service"
2. Connect GitHub repo
3. Set:
   - **Name**: `ai-hedge-fund-backend`
   - **Environment**: Docker
   - **Dockerfile Path**: `Dockerfile.backend`
4. Add environment variables (same as Railway)
5. Deploy

### Frontend
1. "New +" → "Static Site"
2. Set:
   - **Build Command**: `cd app/frontend && npm install && npm run build`
   - **Publish Directory**: `app/frontend/dist`
   - **Environment Variables**: `VITE_API_URL=https://your-backend.onrender.com`
3. Deploy

## Troubleshooting

**CORS Error?**
- Make sure `FRONTEND_URLS` includes your frontend URL
- Check that `VITE_API_URL` matches your backend URL

**Build Failed?**
- Check Railway/Render logs
- Make sure all files are committed to GitHub

**API Not Working?**
- Verify API keys are set correctly
- Check backend logs for errors

## Cost

- **Railway**: Free $5/month credit (usually enough)
- **Render**: Free tier available (spins down after inactivity)

That's it! Your app should be live in under 10 minutes! 🚀

