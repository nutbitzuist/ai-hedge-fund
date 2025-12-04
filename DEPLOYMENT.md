# Deployment Guide

This guide will help you deploy the AI Hedge Fund application to production. We'll cover deployment options for Railway, Render, and other platforms.

## Prerequisites

- GitHub account (recommended for easy deployment)
- API keys for:
  - OpenAI (or other LLM providers)
  - Financial Datasets API (optional, free for AAPL, GOOGL, MSFT, NVDA, TSLA)

## Option 1: Railway (Recommended - Easiest)

Railway is the easiest option for deploying both frontend and backend.

### Step 1: Prepare Your Repository

1. Push your code to GitHub (if not already done)
2. Make sure all changes are committed

### Step 2: Deploy Backend

1. Go to [Railway](https://railway.app) and sign up/login
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will detect the `Dockerfile.backend` and `railway.json`
6. Add environment variables in Railway dashboard:
   - `OPENAI_API_KEY` (or other LLM provider keys)
   - `FINANCIAL_DATASETS_API_KEY` (optional)
   - `GROQ_API_KEY` (optional)
   - `ANTHROPIC_API_KEY` (optional)
   - `DEEPSEEK_API_KEY` (optional)
7. Railway will automatically deploy and give you a URL like `https://your-app.up.railway.app`

### Step 3: Deploy Frontend

1. In Railway, create a new service
2. Connect to the same GitHub repo
3. Set the root directory to `/app/frontend` (or use the Dockerfile.frontend)
4. Add environment variable:
   - `VITE_API_URL` = Your backend URL (from Step 2)
5. Deploy

### Step 4: Update Backend CORS

Update `app/backend/main.py` to include your frontend URL in CORS origins:

```python
allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://your-frontend-url.up.railway.app"  # Add your frontend URL
]
```

## Option 2: Render (Good Alternative)

Render provides free PostgreSQL databases and easy deployment.

### Step 1: Deploy Backend

1. Go to [Render](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `ai-hedge-fund-backend`
   - **Environment**: Docker
   - **Dockerfile Path**: `Dockerfile.backend`
   - **Docker Context**: `.`
   - **Plan**: Free (or Starter for better performance)
5. Add environment variables:
   - `OPENAI_API_KEY`
   - `FINANCIAL_DATASETS_API_KEY` (optional)
   - Other API keys as needed
6. Click "Create Web Service"
7. Note your backend URL (e.g., `https://ai-hedge-fund-backend.onrender.com`)

### Step 2: Create Database (Optional - for PostgreSQL)

1. In Render dashboard, click "New +" → "PostgreSQL"
2. Configure:
   - **Name**: `ai-hedge-fund-db`
   - **Plan**: Free
3. Copy the connection string
4. Update backend to use PostgreSQL (see Database Configuration below)

### Step 3: Deploy Frontend

1. In Render, click "New +" → "Static Site"
2. Configure:
   - **Name**: `ai-hedge-fund-frontend`
   - **Build Command**: `cd app/frontend && npm install && npm run build`
   - **Publish Directory**: `app/frontend/dist`
   - **Environment Variables**:
     - `VITE_API_URL` = Your backend URL from Step 1
3. Click "Create Static Site"

### Step 4: Update Backend CORS

Same as Railway - update CORS origins in `app/backend/main.py`

## Option 3: Vercel (Frontend) + Railway/Render (Backend)

Vercel is excellent for frontend deployment.

### Frontend on Vercel

1. Go to [Vercel](https://vercel.com) and sign up/login
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `app/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL` = Your backend URL
4. Deploy

### Backend

Deploy backend using Railway or Render as described above.

## Database Configuration

### Option A: Keep SQLite (Simple, but not recommended for production)

SQLite will work but has limitations:
- Single instance only
- No concurrent writes
- File-based (can be lost)

### Option B: Use PostgreSQL (Recommended)

1. Update `app/backend/database/connection.py`:

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use PostgreSQL if DATABASE_URL is set, otherwise SQLite
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to SQLite for local development
    from pathlib import Path
    BACKEND_DIR = Path(__file__).parent.parent
    DATABASE_PATH = BACKEND_DIR / "hedge_fund.db"
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
    connect_args = {"check_same_thread": False}
else:
    # PostgreSQL connection
    connect_args = {}

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

2. Run migrations:
```bash
cd app/backend
alembic upgrade head
```

## Environment Variables

Create a `.env` file or set these in your hosting platform:

### Required (at least one LLM provider)
- `OPENAI_API_KEY` - For OpenAI models (gpt-4o, gpt-4o-mini, etc.)
- OR `GROQ_API_KEY` - For Groq models
- OR `ANTHROPIC_API_KEY` - For Claude models
- OR `DEEPSEEK_API_KEY` - For DeepSeek models

### Optional
- `FINANCIAL_DATASETS_API_KEY` - Required for tickers other than AAPL, GOOGL, MSFT, NVDA, TSLA
- `DATABASE_URL` - PostgreSQL connection string (if using PostgreSQL)
- `PORT` - Server port (usually set automatically by hosting platform)

## Quick Start Commands

### Local Testing Before Deployment

```bash
# Backend
cd app/backend
poetry install
poetry run uvicorn app.backend.main:app --host 0.0.0.0 --port 8000

# Frontend (in another terminal)
cd app/frontend
npm install
npm run build
npm run preview  # Test production build locally
```

## Troubleshooting

### CORS Errors
- Make sure your frontend URL is in the CORS origins list
- Check that `VITE_API_URL` is set correctly in frontend

### Database Errors
- If using SQLite, ensure the database file has write permissions
- If using PostgreSQL, verify connection string format

### Build Failures
- Check that all dependencies are in `pyproject.toml` (backend) and `package.json` (frontend)
- Verify Node.js and Python versions match production

### API Key Errors
- Ensure environment variables are set in your hosting platform
- Check that API keys are valid and have sufficient credits

## Cost Estimates

### Railway
- Free tier: $5/month credit (usually enough for small apps)
- Paid: $20/month for better performance

### Render
- Free tier: Available but with limitations (spins down after inactivity)
- Paid: $7/month per service

### Vercel
- Free tier: Excellent for frontend
- Paid: $20/month for team features

## Recommended Setup

For production, I recommend:
- **Backend**: Railway or Render (with PostgreSQL)
- **Frontend**: Vercel or Railway
- **Database**: PostgreSQL (via Render or Railway)

This gives you:
- Easy deployment
- Good performance
- Scalability
- Reasonable costs

## Next Steps

1. Choose your hosting platform
2. Deploy backend first
3. Deploy frontend with backend URL
4. Test the application
5. Set up custom domain (optional)
6. Monitor usage and costs

Good luck with your deployment! 🚀

