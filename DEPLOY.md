# BioForma — Deployment Guide

## Option 1: Railway (Recommended — Easiest)

### Step 1: Push to GitHub
```bash
cd fittrack
git init
git add -A
git commit -m "BioForma v1.0"

# Create a repo at github.com/new called "bioforma"
git remote add origin https://github.com/YOUR_USERNAME/bioforma.git
git push -u origin main
```

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your `bioforma` repo
4. Railway will auto-detect the Dockerfile and start building

### Step 3: Set Environment Variables
In Railway dashboard → your project → **Variables** tab, add:

| Variable | Value |
|---|---|
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://acbodnbcpsbgdenmfjlu.supabase.co` |
| `SUPABASE_KEY` | `sb_publishable_r7aFLiYPVf57RrahGo6UDQ_QrhUdIdt` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (get at console.anthropic.com) |

### Step 4: Generate a Domain
In Railway → your service → **Settings** → **Networking** → **Generate Domain**

This gives you a URL like `bioforma-production.up.railway.app`.

### Step 5: Custom Domain (Optional)
If you own a domain (e.g. bioforma.app):
1. In Railway Settings → Networking → **Custom Domain** → enter your domain
2. Add the CNAME record Railway shows to your DNS provider
3. SSL is automatic

### Cost
- Railway Hobby plan: **$5/month** (includes $5 in usage credits)
- Typical BioForma usage: well under $5/month

---

## Option 2: Render

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Runtime**: Docker
   - **Instance Type**: Free or Starter ($7/mo)
4. Add the same environment variables as above
5. Deploy

Note: Render's free tier sleeps after 15 min of inactivity (cold starts take ~30s).

---

## Option 3: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (from the fittrack directory)
fly launch --name bioforma --region dfw

# Set secrets
fly secrets set SUPABASE_URL=https://acbodnbcpsbgdenmfjlu.supabase.co
fly secrets set SUPABASE_KEY=sb_publishable_r7aFLiYPVf57RrahGo6UDQ_QrhUdIdt
fly secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx

# Deploy
fly deploy
```

Cost: ~$3-5/month on Fly.io's Hobby plan.

---

## After Deployment

### Update the Mobile App
Edit `bioforma-mobile/src/api/config.ts` and change:
```typescript
export const API_BASE_URL = 'https://your-railway-url.up.railway.app';
```

### AI Features
The AI features (chat, protocol optimizer, weekly body comp optimizer) require an Anthropic API key.
- Get one at: https://console.anthropic.com/settings/keys
- It costs ~$3 per 1M input tokens (very cheap for this use case)
- Without it, the app works fine — AI features just won't load

### Updating the App
Push to GitHub and Railway auto-deploys:
```bash
git add -A
git commit -m "Update features"
git push
```
Railway rebuilds and deploys in ~2 minutes.
